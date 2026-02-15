const API_KEY=CONFIG.API_KEY,SHEET_ID=CONFIG.GOOGLE_SHEET_ID,SHEETS=CONFIG.SHEETS;
const SHEETS_BASE=`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values`;
let recintos=[],resultadosData={},fotosData={},candidatosData={},map=null,markersLayer=null,searchTimeout=null;
let zonasLayer=null,macrosLayer=null;
let neonGlowLayer=null,selectedZonaLayer=null,selectedMacroLayer=null;
const MACRO_COLORS={'CENTRO':'#E11D48','COTAHUMA':'#2563EB','HAMPATURI':'#059669','MALLASA':'#EA580C','MAX PAREDES':'#7C3AED','PERIFERICA':'#CA8A04','SAN ANTONIO':'#0891B2','SUR':'#BE185D'};
// Cache de conteos por poligono
let zonaConteo={}, macroConteo={};

// ═══════════════════ SHEETS API ═══════════════════
async function leerHoja(n){
  const u=`${SHEETS_BASE}/${encodeURIComponent(n)}?key=${API_KEY}`;
  const r=await fetch(u); if(!r.ok) throw new Error(`Error ${r.status}`);
  const d=await r.json(); if(!d.values||d.values.length<2) return[];
  const h=d.values[0].map(x=>x.toLowerCase().trim());
  return d.values.slice(1).map(row=>{const o={};h.forEach((k,i)=>{o[k]=(row[i]||'').trim()});return o});
}

async function cargarTodosDatos(){
  showLoader('Cargando resultados...');
  try{
    const[res,fot,can]=await Promise.all([leerHoja(SHEETS.RESULTADOS).catch(()=>[]),leerHoja(SHEETS.FOTOS).catch(()=>[]),leerHoja(SHEETS.CANDIDATOS).catch(()=>[])]);
    resultadosData={};
    res.forEach(r=>{const c=r.codigo,p=r.partido,v=parseInt(r.votos)||0;if(!c||!p)return;if(!resultadosData[c])resultadosData[c]={};resultadosData[c][p]=(resultadosData[c][p]||0)+v});
    fotosData={};
    fot.forEach(f=>{const c=f.codigo,u=f.url_foto,m=f.mesa||'Mesa 1';if(!c||!u)return;if(!fotosData[c])fotosData[c]={};if(!fotosData[c][m])fotosData[c][m]=[];fotosData[c][m].push(u)});
    candidatosData={};
    can.forEach(c=>{const d=c.departamento||'',pr=c.provincia||'',mu=c.municipio||'',pa=c.partido||'';if(!d||!mu||!pa)return;const k=`${d}|${pr}|${mu}`;if(!candidatosData[k])candidatosData[k]=[];candidatosData[k].push({partido:pa,nombre:c.candidato||pa,color:c.color||'#6B7280',orden:parseInt(c.orden)||99})});
    Object.values(candidatosData).forEach(a=>a.sort((a,b)=>a.orden-b.orden));
    hideLoader();
    showToast(`${Object.keys(resultadosData).length} recintos con resultados`,'success');
    renderMapa(); actualizarEstadisticas(); calcularEstadisticasGlobales();
    // Recalcular conteos de capas con datos actualizados
    calcularConteosCapas();
  }catch(e){hideLoader();showToast('Error: '+e.message,'error');console.error(e)}
}

// ═══════════════════ POINT IN POLYGON ═══════════════════
function puntoEnPoligono(lat,lon,coords){
  // Ray casting algorithm
  const x=lon, y=lat;
  let inside=false;
  for(let i=0,j=coords.length-1; i<coords.length; j=i++){
    const xi=coords[i][0],yi=coords[i][1],xj=coords[j][0],yj=coords[j][1];
    if((yi>y)!==(yj>y) && x<(xj-xi)*(y-yi)/(yj-yi)+xi) inside=!inside;
  }
  return inside;
}

function recintosEnPoligono(geometry){
  const found=[];
  const polys=geometry.type==='MultiPolygon'?geometry.coordinates:[geometry.coordinates];
  recintos.forEach(r=>{
    if(!r.la||!r.lo) return;
    for(const poly of polys){
      if(puntoEnPoligono(r.la,r.lo,poly[0])){found.push(r);return;}
    }
  });
  return found;
}

function calcularConteosCapas(){
  zonaConteo={}; macroConteo={};
  if(typeof ZONAS_LPZ!=='undefined'){
    ZONAS_LPZ.features.forEach(f=>{
      const recs=recintosEnPoligono(f.geometry);
      const mesas=recs.reduce((s,r)=>s+(r.ms||1),0);
      const hab=recs.reduce((s,r)=>s+(r.h||0),0);
      const conDatos=recs.filter(r=>resultadosData[r.c]).length;
      zonaConteo[f.properties.zona]={recintos:recs.length,mesas,hab,conDatos,recs};
    });
  }
  if(typeof MACROS_LPZ!=='undefined'){
    MACROS_LPZ.features.forEach(f=>{
      const recs=recintosEnPoligono(f.geometry);
      const mesas=recs.reduce((s,r)=>s+(r.ms||1),0);
      const hab=recs.reduce((s,r)=>s+(r.h||0),0);
      const conDatos=recs.filter(r=>resultadosData[r.c]).length;
      macroConteo[f.properties.macrodistrito]={recintos:recs.length,mesas,hab,conDatos,recs};
    });
  }
  console.log('📊 Conteos de capas calculados');
}

// ═══════════════════ POPUP BUILDER ═══════════════════
function buildZonaPopup(feature){
  const p=feature.properties;
  const c=zonaConteo[p.zona]||{recintos:0,mesas:0,hab:0,conDatos:0,recs:[]};
  const color=p.color||'#7C3AED';
  const pctAvance=c.recintos>0?((c.conDatos/c.recintos)*100).toFixed(0):0;
  
  let votosHtml='';
  if(c.conDatos>0){
    const totales={};let tv=0;
    c.recs.forEach(r=>{const d=resultadosData[r.c];if(!d)return;Object.entries(d).forEach(([pa,v])=>{totales[pa]=(totales[pa]||0)+v;tv+=v})});
    if(tv>0){
      const items=Object.entries(totales).sort((a,b)=>b[1]-a[1]).slice(0,5);
      votosHtml=`<div class="pp-section"><div class="pp-section-title">Resultados parciales</div>`;
      items.forEach((it,i)=>{
        const pct=((it[1]/tv)*100).toFixed(1);
        votosHtml+=`<div class="pp-result-row${i===0?' pp-winner':''}"><span class="pp-partido">${i===0?'🏆 ':''}${it[0]}</span><span class="pp-votos">${it[1].toLocaleString()}</span><span class="pp-pct">${pct}%</span></div>`;
      });
      votosHtml+=`<div class="pp-total">Total: ${tv.toLocaleString()} votos</div></div>`;
    }
  }

  // Detalle de recintos con mesas
  let recintosHtml='';
  if(c.recs.length>0){
    const sorted=c.recs.slice().sort((a,b)=>(b.ms||1)-(a.ms||1));
    const show=sorted.slice(0,8);
    recintosHtml=`<div class="pp-section"><div class="pp-section-title">Detalle de recintos (${c.recintos})</div><div class="pp-recs">`;
    show.forEach(r=>{
      const estado=resultadosData[r.c]?'✅':'⏳';
      recintosHtml+=`<div class="pp-rec-row"><span class="pp-rec-estado">${estado}</span><span class="pp-rec-name">${r.r}</span><span class="pp-rec-mesas">${r.ms||1} mesa${(r.ms||1)>1?'s':''}</span></div>`;
    });
    if(sorted.length>8) recintosHtml+=`<div class="pp-rec-more">+${sorted.length-8} recintos más</div>`;
    recintosHtml+=`</div></div>`;
  }

  return `<div class="pp-card">
    <div class="pp-header" style="border-left:4px solid ${color}">
      <div class="pp-title">${p.zona}</div>
      <div class="pp-subtitle">Macrodistrito ${p.macrodistrito} · Zona ${p.codigozona||''}</div>
    </div>
    <div class="pp-stats">
      <div class="pp-stat"><div class="pp-stat-val">${c.recintos}</div><div class="pp-stat-lbl">Recintos</div></div>
      <div class="pp-stat"><div class="pp-stat-val">${c.mesas.toLocaleString()}</div><div class="pp-stat-lbl">Mesas</div></div>
      <div class="pp-stat"><div class="pp-stat-val">${c.hab.toLocaleString()}</div><div class="pp-stat-lbl">Habilitados</div></div>
    </div>
    <div class="pp-avance">
      <div class="pp-avance-bar"><div class="pp-avance-fill" style="width:${pctAvance}%;background:${color}"></div></div>
      <span class="pp-avance-text">${c.conDatos}/${c.recintos} con datos (${pctAvance}%)</span>
    </div>
    ${votosHtml}
    ${recintosHtml}
  </div>`;
}

function buildMacroPopup(feature){
  const p=feature.properties;
  const md=p.macrodistrito;
  const c=macroConteo[md]||{recintos:0,mesas:0,hab:0,conDatos:0,recs:[]};
  const color=MACRO_COLORS[md]||'#6B7280';
  const pctAvance=c.recintos>0?((c.conDatos/c.recintos)*100).toFixed(0):0;

  let votosHtml='';
  if(c.conDatos>0){
    const totales={};let tv=0;
    c.recs.forEach(r=>{const d=resultadosData[r.c];if(!d)return;Object.entries(d).forEach(([pa,v])=>{totales[pa]=(totales[pa]||0)+v;tv+=v})});
    if(tv>0){
      const items=Object.entries(totales).sort((a,b)=>b[1]-a[1]);
      votosHtml=`<div class="pp-section"><div class="pp-section-title">Resultados electorales</div>`;
      items.forEach((it,i)=>{
        const pct=((it[1]/tv)*100).toFixed(1);
        votosHtml+=`<div class="pp-result-row${i===0?' pp-winner':''}"><span class="pp-partido">${i===0?'🏆 ':''}${it[0]}</span><span class="pp-votos">${it[1].toLocaleString()}</span><span class="pp-pct">${pct}%</span></div>`;
      });
      votosHtml+=`<div class="pp-total">Total: ${tv.toLocaleString()} votos</div></div>`;
    }
  }

  // Detalle de recintos agrupado por zona con mesas
  let recintosHtml='';
  if(c.recs.length>0){
    const sorted=c.recs.slice().sort((a,b)=>(b.ms||1)-(a.ms||1));
    const show=sorted.slice(0,12);
    recintosHtml=`<div class="pp-section"><div class="pp-section-title">Recintos en el macrodistrito (${c.recintos})</div><div class="pp-recs">`;
    show.forEach(r=>{
      const estado=resultadosData[r.c]?'✅':'⏳';
      recintosHtml+=`<div class="pp-rec-row"><span class="pp-rec-estado">${estado}</span><span class="pp-rec-name">${r.r}</span><span class="pp-rec-mesas">${r.ms||1} mesa${(r.ms||1)>1?'s':''}</span></div>`;
    });
    if(sorted.length>12) recintosHtml+=`<div class="pp-rec-more">+${sorted.length-12} recintos más</div>`;
    recintosHtml+=`</div></div>`;
  }

  return `<div class="pp-card pp-macro">
    <div class="pp-header" style="border-left:4px solid ${color}">
      <div class="pp-title" style="color:${color}">📍 ${md}</div>
      <div class="pp-subtitle">Macrodistrito de La Paz · ${p.zonas_count} zonas</div>
    </div>
    <div class="pp-stats">
      <div class="pp-stat"><div class="pp-stat-val">${c.recintos}</div><div class="pp-stat-lbl">Recintos</div></div>
      <div class="pp-stat"><div class="pp-stat-val">${c.mesas.toLocaleString()}</div><div class="pp-stat-lbl">Mesas</div></div>
      <div class="pp-stat"><div class="pp-stat-val">${c.hab.toLocaleString()}</div><div class="pp-stat-lbl">Habilitados</div></div>
    </div>
    <div class="pp-avance">
      <div class="pp-avance-bar"><div class="pp-avance-fill" style="width:${pctAvance}%;background:${color}"></div></div>
      <span class="pp-avance-text">${c.conDatos}/${c.recintos} con datos (${pctAvance}%)</span>
    </div>
    ${votosHtml}
    ${recintosHtml}
  </div>`;
}

// ═══════════════════ MAPA ═══════════════════
function inicializarMapa(){
  const el=document.getElementById('map'); if(!el) return;
  map=L.map('map',{zoomControl:true,attributionControl:false}).setView([-16.5,-64.5],6);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{maxZoom:19}).addTo(map);
  markersLayer=L.layerGroup().addTo(map);
  let zt=null;
  map.on('zoomend',()=>{if(zt)clearTimeout(zt);zt=setTimeout(renderMapa,150)});
  inicializarCapas();
}

function inicializarCapas(){
  neonGlowLayer=L.layerGroup();
  if(typeof ZONAS_LPZ!=='undefined'){
    zonasLayer=L.geoJSON(ZONAS_LPZ,{
      style:f=>{const c=f.properties.color||'#7C3AED';return{color:c,weight:1,opacity:0.5,fillColor:c,fillOpacity:0.08}},
      onEachFeature:(f,layer)=>{
        layer.on('click',e=>{L.DomEvent.stopPropagation(e);if(layer._path)layer._path.blur();seleccionarZona(layer,f,e.latlng)});
        layer.on('mouseover',()=>{if(layer!==selectedZonaLayer)layer.setStyle({weight:2,opacity:0.8})});
        layer.on('mouseout',()=>{if(layer!==selectedZonaLayer){layer.setStyle({weight:1,opacity:0.5,color:f.properties.color||'#7C3AED'})}});
        layer.on('add',()=>{if(layer._path){layer._path.setAttribute('tabindex','-1');layer._path.style.outline='none'}});
      }
    });
  }
  if(typeof MACROS_LPZ!=='undefined'){
    macrosLayer=L.geoJSON(MACROS_LPZ,{
      style:f=>{const c=MACRO_COLORS[f.properties.macrodistrito]||'#6B7280';return{color:c,weight:2.5,opacity:0.7,fillColor:c,fillOpacity:0.1}},
      onEachFeature:(f,layer)=>{
        layer.on('click',e=>{L.DomEvent.stopPropagation(e);if(layer._path)layer._path.blur();seleccionarMacro(layer,f,e.latlng)});
        layer.on('mouseover',()=>{if(layer!==selectedMacroLayer)layer.setStyle({weight:3.5,opacity:0.9})});
        layer.on('mouseout',()=>{if(layer!==selectedMacroLayer){layer.setStyle({weight:2.5,opacity:0.7})}});
        layer.on('add',()=>{if(layer._path){layer._path.setAttribute('tabindex','-1');layer._path.style.outline='none'}});
      }
    });
  }
  map.on('click',limpiarSeleccion);
  // Calcular conteos iniciales
  calcularConteosCapas();
}

function seleccionarZona(layer,feature,latlng){
  limpiarSeleccion();
  selectedZonaLayer=layer;
  layer.setStyle({weight:1,opacity:0.5});
  const c=feature.properties.color||'#7C3AED';
  crearNeon(feature.geometry,c);
  const popup=L.popup({className:'pp-popup',maxWidth:320,minWidth:240,closeButton:true,autoPan:true,autoPanPadding:[20,20]})
    .setLatLng(latlng)
    .setContent(buildZonaPopup(feature));
  popup.openOn(map);
}

function seleccionarMacro(layer,feature,latlng){
  limpiarSeleccion();
  selectedMacroLayer=layer;
  layer.setStyle({weight:2.5,opacity:0.7});
  const c=MACRO_COLORS[feature.properties.macrodistrito]||'#6B7280';
  crearNeon(feature.geometry,c);
  const popup=L.popup({className:'pp-popup pp-popup-macro',maxWidth:340,minWidth:250,closeButton:true,autoPan:true,autoPanPadding:[20,20]})
    .setLatLng(latlng)
    .setContent(buildMacroPopup(feature));
  popup.openOn(map);
}

function crearNeon(geometry,color){
  if(neonGlowLayer)neonGlowLayer.clearLayers(); else neonGlowLayer=L.layerGroup();
  const coords=geometry.type==='MultiPolygon'?geometry.coordinates:[geometry.coordinates];
  coords.forEach(poly=>{
    const ring=poly[0].map(c=>[c[1],c[0]]);
    L.polyline(ring,{color,weight:10,opacity:0.15,lineCap:'round',lineJoin:'round',interactive:false}).addTo(neonGlowLayer);
    L.polyline(ring,{color,weight:6,opacity:0.3,lineCap:'round',lineJoin:'round',interactive:false}).addTo(neonGlowLayer);
    L.polyline(ring,{color,weight:3,opacity:0.6,lineCap:'round',lineJoin:'round',interactive:false}).addTo(neonGlowLayer);
    L.polyline(ring,{color:'#ffffff',weight:1.2,opacity:0.8,lineCap:'round',lineJoin:'round',interactive:false}).addTo(neonGlowLayer);
  });
  neonGlowLayer.addTo(map);
}

function limpiarSeleccion(){
  if(neonGlowLayer)neonGlowLayer.clearLayers();
  map.closePopup();
  if(selectedZonaLayer){
    const f=selectedZonaLayer.feature;
    selectedZonaLayer.setStyle({weight:1,opacity:0.5,color:f.properties.color||'#7C3AED'});
    selectedZonaLayer=null;
  }
  if(selectedMacroLayer){
    const f=selectedMacroLayer.feature;
    selectedMacroLayer.setStyle({weight:2.5,opacity:0.7,color:MACRO_COLORS[f.properties.macrodistrito]||'#6B7280'});
    selectedMacroLayer=null;
  }
}

function toggleZonas(on){if(!zonasLayer)return;if(on){zonasLayer.addTo(map);zonasLayer.bringToBack()}else{limpiarSeleccion();map.removeLayer(zonasLayer)}}
function toggleMacros(on){if(!macrosLayer)return;if(on){macrosLayer.addTo(map);macrosLayer.bringToBack()}else{limpiarSeleccion();map.removeLayer(macrosLayer)}}

// ═══════════════════ RENDER MAPA ═══════════════════
function renderMapa(){
  if(!map||!markersLayer) return;
  markersLayer.clearLayers();
  const depF=document.getElementById('selDep').value,muniF=document.getElementById('selMuni').value;
  const estF=document.getElementById('selEstado').value,busq=document.getElementById('searchInput').value.toLowerCase();
  const filtered=recintos.filter(r=>{
    if(depF!=='Todos'&&r.d!==depF) return false;
    if(muniF!=='Todos'&&r.m!==muniF) return false;
    if(estF==='ConDatos'&&!resultadosData[r.c]) return false;
    if(estF==='Pendiente'&&resultadosData[r.c]) return false;
    if(busq&&!r.c.toLowerCase().includes(busq)&&!r.r.toLowerCase().includes(busq)&&!r.m.toLowerCase().includes(busq)) return false;
    return true;
  });
  const zoom=map.getZoom();
  let radius=zoom<=6?1.5:zoom<=7?2:zoom<=8?2.5:zoom<=10?3.5:zoom<=12?5:zoom<=14?6:8;
  const lp={};
  filtered.forEach(r=>{
    const datos=resultadosData[r.c];
    let color='#8E99A4',op=0.45;
    if(datos){const g=obtenerGanador(r,datos);if(g){color=g.color;op=0.85;lp[g.partido]=g.color}else{color='#94A3B8';op=0.6}}
    const m=L.circleMarker([r.la,r.lo],{radius,fillColor:color,color:datos?'none':'#5C6370',weight:datos?0:1,opacity:op,fillOpacity:op,bubblingMouseEvents:false});
    m.on('click',e=>{L.DomEvent.stopPropagation(e);L.DomEvent.preventDefault(e);abrirModal(r)});
    m.addTo(markersLayer);
  });
  renderLeyenda(lp);
  if(muniF!=='Todos') calcularResumenMunicipal(muniF,depF);
  else document.getElementById('resumenMunicipal').style.display='none';
}

function obtenerGanador(rec,datos){
  const k=`${rec.d}|${rec.p}|${rec.m}`,ca=candidatosData[k];
  let mx=0,g=null;
  Object.entries(datos).forEach(([p,v])=>{
    if(p==='NULOS'||p==='BLANCOS') return; // Exclude from winner
    if(v>mx){mx=v;g=p}
  });
  if(!g) return null;
  if(!ca) return{partido:g,color:'#6B7280',nombre:g};
  const c=ca.find(x=>x.partido===g);
  return c?{partido:g,color:c.color,nombre:c.nombre}:{partido:g,color:'#6B7280',nombre:g};
}

function renderLeyenda(p){
  const el=document.getElementById('mapLegend');
  const k=Object.keys(p);
  if(!k.length){el.classList.remove('show');return}
  let h='<button class="legend-toggle" onclick="this.querySelector(\'.legend-toggle-icon\').classList.toggle(\'open\');this.nextElementSibling.classList.toggle(\'open\')"><span>Ganador por recinto ('+k.length+')</span><span class="legend-toggle-icon open">▼</span></button>';
  h+='<div class="legend-body open">';
  k.sort().forEach(x=>{h+=`<div class="legend-item"><span class="legend-dot" style="background:${p[x]}"></span>${x}</div>`});
  h+=`<div class="legend-item"><span class="legend-dot" style="background:#8E99A4;border:1px solid #5C6370"></span>Sin datos</div>`;
  h+='</div>';
  el.innerHTML=h; el.classList.add('show');
}

// ═══════════════════ ESTADÍSTICAS GLOBALES ═══════════════════
function calcularEstadisticasGlobales(){
  const gpr={};let tot=0;
  recintos.forEach(r=>{const d=resultadosData[r.c];if(!d)return;tot++;const g=obtenerGanador(r,d);if(g)gpr[g.partido]=(gpr[g.partido]||0)+1});
  const el=document.getElementById('globalStats');
  if(!el||!tot){if(el)el.style.display='none';return}
  const items=Object.entries(gpr).sort((a,b)=>b[1]-a[1]);
  let h='<div class="gstat-title">🏆 Recintos ganados</div>';
  items.forEach(([pa,cnt])=>{
    const pct=((cnt/tot)*100).toFixed(1);
    let col='#6B7280';
    for(const ca of Object.values(candidatosData)){const c=ca.find(x=>x.partido===pa);if(c){col=c.color;break}}
    h+=`<div class="gstat-row"><span class="gstat-dot" style="background:${col}"></span><span class="gstat-name">${pa}</span><span class="gstat-count">${cnt}</span><span class="gstat-pct" style="color:${col}">${pct}%</span></div>`;
  });
  h+=`<div class="gstat-meta">${tot} recintos computados</div>`;
  el.innerHTML=h; el.style.display='';
  calcularGanadoresMunicipio();
}

function calcularGanadoresMunicipio(){
  const munis={};
  recintos.forEach(r=>{
    const d=resultadosData[r.c]; if(!d)return;
    const key=`${r.d}|${r.m}`;
    if(!munis[key]) munis[key]={dep:r.d,muni:r.m,votos:{},recintos:0,mesas:0,nulos:0,blancos:0};
    munis[key].recintos++;
    munis[key].mesas+=(r.ms||1);
    Object.entries(d).forEach(([p,v])=>{
      if(p==='NULOS'){munis[key].nulos+=v;return}
      if(p==='BLANCOS'){munis[key].blancos+=v;return}
      munis[key].votos[p]=(munis[key].votos[p]||0)+v;
    });
  });
  
  const el=document.getElementById('ganadoresMuni');
  const keys=Object.keys(munis);
  if(!el||!keys.length){if(el)el.style.display='none';return}
  
  let h='<div class="gstat-title">🗳️ Ganadores por municipio</div>';
  h+='<div class="muni-winners">';
  
  keys.sort((a,b)=>a.localeCompare(b)).forEach(key=>{
    const m=munis[key];
    const tvValid=Object.values(m.votos).reduce((s,v)=>s+v,0);
    if(!tvValid) return;
    const sorted=Object.entries(m.votos).sort((a,b)=>b[1]-a[1]);
    const winner=sorted[0];
    const pct=((winner[1]/tvValid)*100).toFixed(1);
    let col='#6B7280';
    for(const ca of Object.values(candidatosData)){const c=ca.find(x=>x.partido===winner[0]);if(c){col=c.color;break}}
    
    h+=`<div class="muni-row">
      <div class="muni-info"><span class="muni-name">${m.muni}</span><span class="muni-dep">${m.dep}</span></div>
      <div class="muni-winner" style="color:${col}"><span class="muni-partido">${winner[0]}</span><span class="muni-pct">${pct}%</span></div>
      <div class="muni-meta">${m.recintos} rec · ${m.mesas} mesas · ${tvValid.toLocaleString()} votos${m.nulos?` · ${m.nulos} nulos`:''}</div>
    </div>`;
  });
  h+='</div>';
  el.innerHTML=h; el.style.display='';
}

function calcularResumenMunicipal(muni,dep){
  const recs=recintos.filter(r=>r.m===muni&&(dep==='Todos'||r.d===dep));
  if(!recs.length){document.getElementById('resumenMunicipal').style.display='none';return}
  const tot={};let tv=0,cd=0,nulos=0,blancos=0;
  recs.forEach(r=>{const d=resultadosData[r.c];if(!d)return;cd++;Object.entries(d).forEach(([p,v])=>{
    if(p==='NULOS'){nulos+=v;return} if(p==='BLANCOS'){blancos+=v;return}
    tot[p]=(tot[p]||0)+v;tv+=v
  })});
  if(!tv){document.getElementById('resumenMunicipal').style.display='none';return}
  const s=recs[0],k=`${s.d}|${s.p}|${s.m}`,ca=candidatosData[k]||[];
  const items=Object.entries(tot).map(([p,v])=>{const c=ca.find(x=>x.partido===p);return{partido:p,votos:v,pct:(v/tv*100),color:c?.color||'#6B7280'}}).sort((a,b)=>b.votos-a.votos);
  document.getElementById('resumenTitulo').textContent=muni;
  let bar='',lista='';
  items.forEach(i=>{bar+=`<div class="resumen-barra-seg" style="width:${i.pct}%;background:${i.color}"></div>`});
  items.forEach((i,idx)=>{lista+=`<div class="resumen-row"><span class="resumen-dot" style="background:${i.color}"></span><span class="resumen-partido">${i.partido}</span><span class="resumen-votos">${i.votos.toLocaleString()}</span><span class="resumen-pct" style="color:${idx===0?i.color:'inherit'}">${i.pct.toFixed(1)}%</span></div>`});
  document.getElementById('resumenBarra').innerHTML=bar;
  document.getElementById('resumenLista').innerHTML=lista;
  document.getElementById('resumenMeta').textContent=`${cd}/${recs.length} recintos · ${tv.toLocaleString()} votos`;
  document.getElementById('resumenMunicipal').style.display='';
}

// ═══════════════════ MODAL ═══════════════════
function getDriveThumbnail(url){let id='';if(url.includes('id='))id=url.split('id=')[1]?.split('&')[0];else if(url.includes('/d/'))id=url.split('/d/')[1]?.split('/')[0];if(id)return`https://lh3.googleusercontent.com/d/${id}=s600`;return url}
function getDriveOpenUrl(url){let id='';if(url.includes('id='))id=url.split('id=')[1]?.split('&')[0];else if(url.includes('/d/'))id=url.split('/d/')[1]?.split('/')[0];if(id)return`https://drive.google.com/file/d/${id}/view`;return url}

function abrirModal(rec){
  const datos=resultadosData[rec.c],fotos=fotosData[rec.c],k=`${rec.d}|${rec.p}|${rec.m}`,ca=candidatosData[k]||[];
  document.getElementById('modalTitle').textContent=rec.r;
  document.getElementById('modalSub').textContent=`${rec.c} · ${rec.m}, ${rec.d} · ${rec.ms||1} mesa(s)`;
  let html='';
  if(!datos||!Object.keys(datos).length){
    html=`<div class="no-data"><div class="no-data-icon">📭</div><div class="no-data-text">Sin resultados</div><div class="no-data-sub">Recinto sin datos cargados</div></div>`;
  }else{
    // Separate nulos/blancos from party votes
    const nulos=datos['NULOS']||0, blancos=datos['BLANCOS']||0;
    let tvPartidos=0, tvTodos=0;
    Object.entries(datos).forEach(([p,v])=>{tvTodos+=v;if(p!=='NULOS'&&p!=='BLANCOS')tvPartidos+=v});
    
    const items=Object.entries(datos).filter(([p])=>p!=='NULOS'&&p!=='BLANCOS').map(([p,v])=>{
      const c=ca.find(x=>x.partido===p);
      return{partido:p,votos:v,nombre:c?.nombre||p,color:c?.color||'#6B7280',pct:tvPartidos>0?(v/tvPartidos*100):0}
    }).sort((a,b)=>b.votos-a.votos);
    
    const g=items.length>0?items[0]:null;
    const mx=items.length>0?Math.max(...items.map(i=>i.votos)):1;
    
    html+=`<div class="m-stats"><div class="m-stat"><span class="m-stat-v">${tvTodos.toLocaleString()}</span><span class="m-stat-l">total votos</span></div><div class="m-stat"><span class="m-stat-v">${rec.ms||1}</span><span class="m-stat-l">mesas</span></div>`;
    if(nulos||blancos) html+=`<div class="m-stat"><span class="m-stat-v">${nulos}</span><span class="m-stat-l">nulos</span></div><div class="m-stat"><span class="m-stat-v">${blancos}</span><span class="m-stat-l">blancos</span></div>`;
    else html+=`<div class="m-stat"><span class="m-stat-v">${rec.h||0}</span><span class="m-stat-l">hab.</span></div>`;
    if(g) html+=`<div class="m-stat winner" style="border-color:${g.color}"><span class="m-stat-v" style="color:${g.color}">🏆 ${g.partido}</span><span class="m-stat-l">${g.pct.toFixed(1)}%</span></div>`;
    html+=`</div>`;
    
    html+=`<div class="m-chart">`;
    items.forEach(i=>{const w=mx>0?Math.max((i.votos/mx*100),3):3;html+=`<div class="m-row"><div class="m-row-top"><span class="m-sigla"><span class="m-dot" style="background:${i.color}"></span>${i.partido}</span><div class="m-row-nums"><span class="m-vnum">${i.votos} <small>votos</small></span><span class="m-vpct" style="color:${i===g?i.color:''}">${i.pct.toFixed(1)}%</span></div></div><div class="m-bar-bg"><div class="m-bar-fill" style="width:${w}%;background:${i.color}"></div></div></div>`});
    html+=`</div>`;
  }
  if(fotos&&Object.keys(fotos).length>0){
    html+=`<div class="m-fotos-head">📸 Actas electorales</div><div class="m-fotos">`;
    Object.entries(fotos).forEach(([mesa,urls])=>{urls.forEach((url,i)=>{const th=getDriveThumbnail(url),op=getDriveOpenUrl(url);html+=`<div class="m-foto" onclick="window.open('${op}','_blank')"><img src="${th}" alt="${mesa}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="m-foto-fallback" style="display:none">📷</div><span class="m-foto-label">${mesa}</span></div>`})});
    html+=`</div>`;
  }
  document.getElementById('modalBody').innerHTML=html;
  document.getElementById('modalOverlay').classList.add('open');
  setTimeout(()=>{document.querySelectorAll('.m-bar-fill').forEach(b=>{const w=b.style.width;b.style.width='0';requestAnimationFrame(()=>{b.style.width=w})})},50);
}
function cerrarModal(){document.getElementById('modalOverlay').classList.remove('open')}

// ═══════════════════ BÚSQUEDA ═══════════════════
function buscar(t,cid){const c=document.getElementById(cid);if(!c)return;if(searchTimeout)clearTimeout(searchTimeout);const q=t.trim().toLowerCase();if(q.length<1){c.innerHTML='';c.classList.remove('show');return}searchTimeout=setTimeout(()=>{const res=recintos.filter(r=>r.c.toLowerCase().includes(q)||r.r.toLowerCase().includes(q)||r.m.toLowerCase().includes(q)||r.d.toLowerCase().includes(q)).slice(0,12);if(!res.length){c.innerHTML='<div class="sr-empty">Sin resultados</div>';c.classList.add('show');return}let h='';res.forEach(r=>{const ic=resultadosData[r.c]?'✅':'⏳';h+=`<div class="sr-item" onclick="irA('${r.c}','${cid}')"><span class="sr-icon">${ic}</span><div class="sr-info"><div class="sr-name">${hl(r.r,q)}</div><div class="sr-detail">${hl(r.c,q)} · ${r.m}</div></div></div>`});c.innerHTML=h;c.classList.add('show')},100)}
function hl(t,q){return t.replace(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`,'gi'),'<mark>$1</mark>')}
function irA(cod,cid){const r=recintos.find(x=>x.c===cod);if(!r)return;document.getElementById(cid).classList.remove('show');document.getElementById('floatSearch')?.classList.remove('show');if(window.innerWidth<=768)document.getElementById('panel').classList.remove('show');map.setView([r.la,r.lo],14,{animate:true});setTimeout(()=>abrirModal(r),350)}
function llenarFiltros(){const deps=[...new Set(recintos.map(r=>r.d).filter(Boolean))].sort();const s=document.getElementById('selDep');s.innerHTML='<option value="Todos">Todos</option>';deps.forEach(d=>{s.innerHTML+=`<option value="${d}">${d}</option>`})}
function actualizarMunicipios(){const dep=document.getElementById('selDep').value,s=document.getElementById('selMuni');s.innerHTML='<option value="Todos">Todos</option>';if(dep==='Todos')return;[...new Set(recintos.filter(r=>r.d===dep).map(r=>r.m))].sort().forEach(m=>{s.innerHTML+=`<option value="${m}">${m}</option>`})}
function actualizarEstadisticas(){const n=Object.keys(resultadosData).length,t=recintos.length;document.querySelector('#statCargados .stat-num').textContent=n;document.querySelector('#statPendientes .stat-num').textContent=(t-n).toLocaleString();document.querySelector('#statProgreso .stat-num').textContent=(t>0?((n/t)*100).toFixed(1):0)+'%'}

// ═══════════════════ UI HELPERS ═══════════════════
function showLoader(t){document.getElementById('loaderText').textContent=t;document.getElementById('loader').classList.add('show')}
function hideLoader(){document.getElementById('loader').classList.remove('show')}
function showToast(m,type){const t=document.getElementById('toast');document.getElementById('toastIcon').textContent=type==='success'?'✅':type==='error'?'❌':'ℹ️';document.getElementById('toastMsg').textContent=m;t.className='toast show '+(type||'');setTimeout(()=>t.classList.remove('show'),3000)}

// ═══════════════════ INIT ═══════════════════
document.addEventListener('DOMContentLoaded',function(){
  inicializarMapa();
  if(typeof R!=='undefined'&&R.length>0){recintos=R.filter(r=>r.la&&r.lo);llenarFiltros();renderMapa()}
  cargarTodosDatos();
  document.getElementById('modalClose').addEventListener('click',cerrarModal);
  document.getElementById('modalOverlay').addEventListener('click',e=>{if(e.target.id==='modalOverlay')cerrarModal()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')cerrarModal()});
  document.getElementById('selDep').addEventListener('change',()=>{actualizarMunicipios();document.getElementById('selMuni').value='Todos';renderMapa()});
  document.getElementById('selMuni').addEventListener('change',renderMapa);
  document.getElementById('selEstado').addEventListener('change',renderMapa);
  document.getElementById('searchInput').addEventListener('input',function(){buscar(this.value,'searchResults')});
  document.getElementById('floatSearchInput').addEventListener('input',function(){buscar(this.value,'floatResults')});
  document.getElementById('btnSearch').addEventListener('click',()=>{const f=document.getElementById('floatSearch');f.classList.toggle('show');if(f.classList.contains('show'))document.getElementById('floatSearchInput').focus()});
  document.getElementById('floatClose').addEventListener('click',()=>{document.getElementById('floatSearch').classList.remove('show')});
  document.addEventListener('click',e=>{if(!e.target.closest('.search-box')&&!e.target.closest('.search-results')&&!e.target.closest('.float-search')){document.getElementById('searchResults').classList.remove('show');document.getElementById('floatResults').classList.remove('show')}});
  document.getElementById('btnPanel').addEventListener('click',()=>{document.getElementById('panel').classList.toggle('show')});
  document.addEventListener('click',e=>{if(window.innerWidth<=768&&!e.target.closest('.panel')&&!e.target.closest('#btnPanel'))document.getElementById('panel').classList.remove('show')});
  document.getElementById('btnRefresh').addEventListener('click',async()=>{const b=document.getElementById('btnRefresh');b.classList.add('spinning');await cargarTodosDatos();b.classList.remove('spinning')});
  document.getElementById('layerZonas').addEventListener('change',function(){toggleZonas(this.checked)});
  document.getElementById('layerMacros').addEventListener('change',function(){toggleMacros(this.checked)});
});
