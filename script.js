// ═══════════════════════════════════════════════════════════════
// SISTEMA DE LLENADO DE DATOS · CONTROL ELECTORAL 2026
// Conecta DIRECTAMENTE con Google Sheets API
// ═══════════════════════════════════════════════════════════════

const API_KEY = 'AIzaSyAOhGTjJXHhuUhqf1g2DPCla59xNzftb-Q';
const SHEET_ID = '1FX9nniq3Caw6GEq-x1SWOvgrjQ5bchEaxGVxOxTvJgA';

// ── Cache de candidatos por municipio ──
let candidatosPorMunicipio = {};
let todosLosCandidatos = [];

// ── Estado global ──
let recintos = [];
let datosLlenados = {}; // {codigo: {mesas: {1: {votos: {...}, fotos: [...]}, 2: {...}}, totales: {...}}}
let recintoActual = null;
let mesaActual = 1;

// ── Mapa ──
const map = L.map('map', {
  zoomControl: true,
  attributionControl: false
}).setView([-16.5, -64.5], 6);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  maxZoom: 19
}).addTo(map);

let markersLayer = L.layerGroup().addTo(map);

// ══════════════════════════════════════════════════════════════
// GOOGLE SHEETS API - FUNCIONES DE LECTURA/ESCRITURA
// ══════════════════════════════════════════════════════════════

async function leerHojaCompleta(nombreHoja) {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(nombreHoja)}?key=${API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.values || data.values.length === 0) {
      return [];
    }
    
    // Convertir a array de objetos
    const headers = data.values[0].map(h => h.toLowerCase().trim());
    const rows = data.values.slice(1);
    
    return rows.map(row => {
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = row[i] || '';
      });
      return obj;
    });
  } catch (error) {
    console.error(`Error leyendo hoja "${nombreHoja}":`, error);
    throw error;
  }
}

async function agregarFilas(nombreHoja, filas) {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(nombreHoja)}:append?valueInputOption=RAW&key=${API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: filas
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error ${response.status}: ${errorData.error?.message || response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error agregando filas a "${nombreHoja}":`, error);
    throw error;
  }
}

async function limpiarDatosRecinto(codigo) {
  try {
    // Esta función requeriría batch update para borrar filas específicas
    // Por simplicidad, el backend maneja duplicados o usamos timestamps
    console.log(`Limpiando datos del recinto ${codigo}...`);
  } catch (error) {
    console.error('Error limpiando datos:', error);
  }
}

// ══════════════════════════════════════════════════════════════
// CARGAR CANDIDATOS DESDE GOOGLE SHEETS
// ══════════════════════════════════════════════════════════════

async function cargarCandidatos() {
  try {
    showLoading('Cargando candidatos desde Google Sheets...');
    
    const candidatos = await leerHojaCompleta('Candidatos');
    
    if (!candidatos || candidatos.length === 0) {
      console.warn('⚠️ No se encontraron candidatos en la hoja "Candidatos"');
      showToast('⚠️ No hay candidatos registrados. Usando datos predeterminados.', 'warning');
      return false;
    }
    
    // Organizar por municipio
    candidatosPorMunicipio = {};
    candidatos.forEach(c => {
      const municipio = (c.municipio || '').trim();
      if (!municipio) return;
      
      if (!candidatosPorMunicipio[municipio]) {
        candidatosPorMunicipio[municipio] = [];
      }
      
      candidatosPorMunicipio[municipio].push({
        partido: (c.partido || '').trim(),
        nombre: (c.candidato || c.nombre || '').trim(),
        cargo: (c.cargo || 'Alcalde').trim(),
        color: (c.color || '#999999').trim(),
        orden: parseInt(c.orden || 999)
      });
    });
    
    // Ordenar por orden
    Object.keys(candidatosPorMunicipio).forEach(muni => {
      candidatosPorMunicipio[muni].sort((a, b) => a.orden - b.orden);
    });
    
    todosLosCandidatos = candidatos;
    
    console.log(`✅ Candidatos cargados: ${Object.keys(candidatosPorMunicipio).length} municipios`);
    
    hideLoading();
    return true;
    
  } catch (error) {
    console.error('Error cargando candidatos:', error);
    hideLoading();
    showToast('Error al cargar candidatos: ' + error.message, 'error');
    return false;
  }
}

function obtenerCandidatosMunicipio(municipio) {
  const municipioNormalizado = municipio.trim();
  
  if (candidatosPorMunicipio[municipioNormalizado]) {
    return candidatosPorMunicipio[municipioNormalizado];
  }
  
  // Fallback: candidatos predeterminados
  return [
    { partido: 'IH', nombre: 'Innovación Humana', cargo: 'Alcalde', color: '#8B5CF6', orden: 1 },
    { partido: 'MAS-IPSP', nombre: 'MAS-IPSP', cargo: 'Alcalde', color: '#1E3A8A', orden: 2 },
    { partido: 'CC', nombre: 'Comunidad Ciudadana', cargo: 'Alcalde', color: '#F97316', orden: 3 },
    { partido: 'CREEMOS', nombre: 'Creemos', cargo: 'Alcalde', color: '#15803D', orden: 4 },
    { partido: 'FPV', nombre: 'FPV', cargo: 'Alcalde', color: '#DC2626', orden: 5 },
    { partido: 'PDC', nombre: 'PDC', cargo: 'Alcalde', color: '#07626B', orden: 6 },
  ];
}

// ══════════════════════════════════════════════════════════════
// FUNCIONES AUXILIARES
// ══════════════════════════════════════════════════════════════

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => toast.classList.remove('show'), 3500);
}

function showLoading(text = 'Cargando...') {
  document.getElementById('loadingText').textContent = text;
  document.getElementById('loadingOverlay').classList.add('show');
}

function hideLoading() {
  document.getElementById('loadingOverlay').classList.remove('show');
}

function getEstadoRecinto(codigo) {
  const datos = datosLlenados[codigo];
  if (!datos) return 'Pendiente';
  
  const numMesas = recintos.find(r => r.c === codigo)?.ms || 1;
  const mesasConDatos = Object.keys(datos.mesas || {}).length;
  
  if (mesasConDatos === 0) return 'Pendiente';
  if (mesasConDatos < numMesas) return 'Parcial';
  
  // Verificar si todas las mesas tienen votos y fotos
  let todasCompletas = true;
  for (let i = 1; i <= numMesas; i++) {
    const mesa = datos.mesas[i];
    if (!mesa || !mesa.votos || Object.keys(mesa.votos).length === 0 || !mesa.fotos || mesa.fotos.length === 0) {
      todasCompletas = false;
      break;
    }
  }
  
  return todasCompletas ? 'Completado' : 'Parcial';
}

function getColorEstado(estado) {
  switch (estado) {
    case 'Completado': return '#22c55e';
    case 'Parcial': return '#f59e0b';
    default: return '#DDD6FE';
  }
}

// ══════════════════════════════════════════════════════════════
// RENDERIZADO DEL MAPA
// ══════════════════════════════════════════════════════════════

function renderizarMapa() {
  markersLayer.clearLayers();
  
  const filtros = {
    dep: document.getElementById('selDep')?.value || 'Todos',
    estado: document.getElementById('selEstado')?.value || 'Todos',
    search: document.getElementById('searchRecinto')?.value?.toLowerCase().trim() || ''
  };
  
  const recintosFiltrados = recintos.filter(r => {
    if (filtros.dep !== 'Todos' && r.d !== filtros.dep) return false;
    if (filtros.estado !== 'Todos' && getEstadoRecinto(r.c) !== filtros.estado) return false;
    if (filtros.search) {
      const searchIn = `${r.c} ${r.r} ${r.m}`.toLowerCase();
      if (!searchIn.includes(filtros.search)) return false;
    }
    return true;
  });
  
  recintosFiltrados.forEach(r => {
    const estado = getEstadoRecinto(r.c);
    const color = getColorEstado(estado);
    
    const marker = L.circleMarker([r.la, r.lo], {
      radius: 6,
      fillColor: color,
      fillOpacity: 0.75,
      stroke: true,
      color: 'rgba(0,0,0,.1)',
      weight: 1
    });
    
    marker.bindPopup(crearPopupRecinto(r, estado), {
      className: 'custom-popup',
      maxWidth: 300
    });
    
    marker.on('mouseover', function() {
      this.setStyle({
        fillOpacity: 1,
        weight: 2,
        color: 'rgba(139,92,246,.5)',
        radius: 8
      });
    });
    
    marker.on('mouseout', function() {
      if (!this.isPopupOpen()) {
        this.setStyle({
          fillOpacity: 0.75,
          weight: 1,
          color: 'rgba(0,0,0,.1)',
          radius: 6
        });
      }
    });
    
    markersLayer.addLayer(marker);
  });
  
  actualizarEstadisticas();
}

function crearPopupRecinto(recinto, estado) {
  let estadoBadge = '';
  if (estado === 'Completado') {
    estadoBadge = '<div class="popup-status completado">✅ Completado</div>';
  } else if (estado === 'Parcial') {
    estadoBadge = '<div class="popup-status parcial">⚠️ Parcial</div>';
  } else {
    estadoBadge = '<div class="popup-status pendiente">⏳ Pendiente</div>';
  }
  
  return `
    <div class="popup-name">${recinto.r}</div>
    <div class="popup-code">Código: ${recinto.c}</div>
    <div class="popup-info">
      ${recinto.m}<br>
      ${recinto.d}<br>
      📊 ${recinto.ms || 1} mesa${recinto.ms !== 1 ? 's' : ''} · ${recinto.h || 0} habilitados
    </div>
    ${estadoBadge}
    <button class="popup-btn" onclick="abrirFormularioLlenado('${recinto.c}')">
      ${estado === 'Pendiente' ? '📝 Llenar Datos' : '✏️ Editar Datos'}
    </button>
  `;
}

// ══════════════════════════════════════════════════════════════
// FORMULARIO DE LLENADO
// ══════════════════════════════════════════════════════════════

function abrirFormularioLlenado(codigo) {
  recintoActual = recintos.find(r => r.c === codigo);
  if (!recintoActual) {
    showToast('Recinto no encontrado', 'error');
    return;
  }
  
  mesaActual = 1;
  
  // Inicializar datos si no existen
  if (!datosLlenados[codigo]) {
    datosLlenados[codigo] = {
      mesas: {},
      totales: {}
    };
  }
  
  // Actualizar modal
  document.getElementById('modalTitle').textContent = `Llenado de Datos - ${recintoActual.r}`;
  document.getElementById('modalSubtitle').textContent = 
    `Código: ${codigo} · ${recintoActual.m} · ${recintoActual.d} · ${recintoActual.ms || 1} mesa(s)`;
  
  renderizarFormulario();
  document.getElementById('modalLlenado').classList.add('open');
}

function renderizarFormulario() {
  const numMesas = recintoActual.ms || 1;
  const candidatos = obtenerCandidatosMunicipio(recintoActual.m);
  
  let html = '';
  
  // Tabs de mesas
  if (numMesas > 1) {
    html += '<div class="mesa-tabs">';
    for (let i = 1; i <= numMesas; i++) {
      const datos = datosLlenados[recintoActual.c]?.mesas?.[i];
      const tieneVotos = datos && datos.votos && Object.keys(datos.votos).length > 0;
      const tieneFotos = datos && datos.fotos && datos.fotos.length > 0;
      const badge = tieneVotos && tieneFotos ? ' ✓' : tieneVotos || tieneFotos ? ' ●' : '';
      
      html += `<button class="mesa-tab ${i === mesaActual ? 'active' : ''}" 
                       onclick="cambiarMesa(${i})">
                 Mesa ${i}${badge}
               </button>`;
    }
    html += '</div>';
  }
  
  // Formulario de la mesa actual
  html += '<div class="form-content">';
  
  // Sección de votos
  html += '<div class="form-section">';
  html += '<div class="form-section-title">📊 Votos por Candidato</div>';
  html += '<div class="candidatos-grid">';
  
  const votosActuales = datosLlenados[recintoActual.c]?.mesas?.[mesaActual]?.votos || {};
  
  candidatos.forEach(cand => {
    const valor = votosActuales[cand.partido] || '';
    html += `
      <div class="cand-item">
        <div class="cand-color" style="background: ${cand.color}"></div>
        <div class="cand-info">
          <div class="cand-partido">${cand.partido}</div>
          <div class="cand-nombre">${cand.nombre}</div>
        </div>
        <input type="number" 
               class="cand-votos" 
               min="0" 
               value="${valor}"
               placeholder="0"
               data-partido="${cand.partido}"
               onchange="actualizarVoto('${cand.partido}', this.value)">
      </div>
    `;
  });
  
  html += '</div></div>';
  
  // Sección de fotos
  html += '<div class="form-section">';
  html += '<div class="form-section-title">📸 Fotos de Actas</div>';
  
  const fotosActuales = datosLlenados[recintoActual.c]?.mesas?.[mesaActual]?.fotos || [];
  
  html += '<div class="fotos-list">';
  fotosActuales.forEach((foto, i) => {
    html += `
      <div class="foto-item">
        <input type="text" value="${foto}" class="foto-url" readonly>
        <button class="btn-icon" onclick="eliminarFoto(${i})" title="Eliminar">🗑️</button>
      </div>
    `;
  });
  html += '</div>';
  
  html += `
    <div class="foto-add">
      <input type="text" id="inputNuevaFoto" placeholder="URL de la foto (Google Drive, Imgur, etc.)" class="foto-input">
      <button class="btn-secondary" onclick="agregarFoto()">➕ Agregar Foto</button>
    </div>
  `;
  
  html += '<div class="foto-help">';
  html += '<strong>💡 Cómo subir fotos:</strong><br>';
  html += '1. Sube la imagen a Google Drive<br>';
  html += '2. Haz clic derecho → Compartir → "Cualquiera con el enlace"<br>';
  html += '3. Copia el ID del enlace y usa este formato:<br>';
  html += '<code>https://drive.google.com/uc?id=TU_ID_AQUI</code>';
  html += '</div>';
  
  html += '</div>';
  
  // Resumen de totales (si hay múltiples mesas)
  if (numMesas > 1) {
    html += '<div class="form-section resumen-section">';
    html += '<div class="form-section-title">📈 Resumen Total del Recinto</div>';
    html += '<div id="resumenTotales">Llena las mesas para ver el resumen</div>';
    html += '</div>';
  }
  
  html += '</div>';
  
  document.getElementById('modalBody').innerHTML = html;
  
  if (numMesas > 1) {
    actualizarResumenTotales();
  }
}

function cambiarMesa(numMesa) {
  mesaActual = numMesa;
  renderizarFormulario();
}

function actualizarVoto(partido, valor) {
  const codigo = recintoActual.c;
  
  if (!datosLlenados[codigo].mesas[mesaActual]) {
    datosLlenados[codigo].mesas[mesaActual] = { votos: {}, fotos: [] };
  }
  
  const votos = parseInt(valor) || 0;
  datosLlenados[codigo].mesas[mesaActual].votos[partido] = votos;
  
  actualizarResumenTotales();
}

function agregarFoto() {
  const input = document.getElementById('inputNuevaFoto');
  const url = input.value.trim();
  
  if (!url) {
    showToast('⚠️ Ingresa una URL válida', 'warning');
    return;
  }
  
  const codigo = recintoActual.c;
  
  if (!datosLlenados[codigo].mesas[mesaActual]) {
    datosLlenados[codigo].mesas[mesaActual] = { votos: {}, fotos: [] };
  }
  
  datosLlenados[codigo].mesas[mesaActual].fotos.push(url);
  input.value = '';
  
  renderizarFormulario();
  showToast('✅ Foto agregada', 'success');
}

function eliminarFoto(index) {
  const codigo = recintoActual.c;
  datosLlenados[codigo].mesas[mesaActual].fotos.splice(index, 1);
  renderizarFormulario();
  showToast('🗑️ Foto eliminada', 'success');
}

function actualizarResumenTotales() {
  const codigo = recintoActual.c;
  const numMesas = recintoActual.ms || 1;
  
  if (numMesas === 1) return;
  
  const totales = {};
  const candidatos = obtenerCandidatosMunicipio(recintoActual.m);
  
  // Sumar votos de todas las mesas
  for (let i = 1; i <= numMesas; i++) {
    const mesa = datosLlenados[codigo]?.mesas?.[i];
    if (mesa && mesa.votos) {
      Object.entries(mesa.votos).forEach(([partido, votos]) => {
        totales[partido] = (totales[partido] || 0) + votos;
      });
    }
  }
  
  const totalGeneral = Object.values(totales).reduce((a, b) => a + b, 0);
  
  if (totalGeneral === 0) {
    document.getElementById('resumenTotales').innerHTML = 'Llena las mesas para ver el resumen';
    return;
  }
  
  let html = '<div class="totales-grid">';
  
  candidatos.forEach(cand => {
    const votos = totales[cand.partido] || 0;
    const porcentaje = totalGeneral > 0 ? ((votos / totalGeneral) * 100).toFixed(1) : 0;
    
    if (votos > 0) {
      html += `
        <div class="total-item">
          <div class="total-color" style="background: ${cand.color}"></div>
          <div class="total-info">
            <div class="total-partido">${cand.partido}</div>
            <div class="total-votos">${votos.toLocaleString('es-BO')} votos (${porcentaje}%)</div>
          </div>
        </div>
      `;
    }
  });
  
  html += '</div>';
  html += `<div class="total-general">Total: ${totalGeneral.toLocaleString('es-BO')} votos</div>`;
  
  document.getElementById('resumenTotales').innerHTML = html;
}

function calcularTotales(codigo) {
  const recinto = recintos.find(r => r.c === codigo);
  if (!recinto) return;
  
  const numMesas = recinto.ms || 1;
  const totales = {};
  
  for (let i = 1; i <= numMesas; i++) {
    const mesa = datosLlenados[codigo]?.mesas?.[i];
    if (mesa && mesa.votos) {
      Object.entries(mesa.votos).forEach(([partido, votos]) => {
        totales[partido] = (totales[partido] || 0) + votos;
      });
    }
  }
  
  datosLlenados[codigo].totales = totales;
  return totales;
}

// ══════════════════════════════════════════════════════════════
// GUARDAR DATOS EN GOOGLE SHEETS
// ══════════════════════════════════════════════════════════════

async function guardarDatos() {
  const codigo = recintoActual.c;
  const datos = datosLlenados[codigo];
  
  if (!datos || !datos.mesas || Object.keys(datos.mesas).length === 0) {
    showToast('⚠️ No hay datos para guardar', 'warning');
    return;
  }
  
  showLoading('Guardando datos en Google Sheets...');
  
  try {
    // Calcular totales
    const totales = calcularTotales(codigo);
    const candidatos = obtenerCandidatosMunicipio(recintoActual.m);
    const timestamp = new Date().toLocaleString('es-BO');
    
    // ── PREPARAR RESULTADOS ──
    const filasResultados = [];
    Object.entries(totales).forEach(([partido, votos]) => {
      const cand = candidatos.find(c => c.partido === partido);
      const porcentaje = Object.values(totales).reduce((a, b) => a + b, 0) > 0 
        ? ((votos / Object.values(totales).reduce((a, b) => a + b, 0)) * 100).toFixed(2)
        : 0;
      
      filasResultados.push([
        codigo,                    // codigo
        recintoActual.m,          // municipio
        partido,                   // partido
        cand?.nombre || partido,   // candidato
        votos,                     // votos
        porcentaje,                // porcentaje
        timestamp                  // timestamp
      ]);
    });
    
    // ── PREPARAR FOTOS ──
    const filasFotos = [];
    Object.entries(datos.mesas).forEach(([numMesa, mesa]) => {
      if (mesa.fotos && mesa.fotos.length > 0) {
        mesa.fotos.forEach(url => {
          filasFotos.push([
            codigo,                // codigo
            `Mesa ${numMesa}`,     // mesa
            url,                   // url_foto
            timestamp,             // timestamp
            'Sistema Web'          // usuario
          ]);
        });
      }
    });
    
    // ── GUARDAR EN SHEETS ──
    const promesas = [];
    
    if (filasResultados.length > 0) {
      promesas.push(agregarFilas('Resultados', filasResultados));
    }
    
    if (filasFotos.length > 0) {
      promesas.push(agregarFilas('Fotos', filasFotos));
    }
    
    // Log
    const filaLog = [[
      timestamp,
      codigo,
      'GUARDADO',
      'Sistema Web',
      `${filasResultados.length} resultados, ${filasFotos.length} fotos`
    ]];
    promesas.push(agregarFilas('Log', filaLog));
    
    await Promise.all(promesas);
    
    hideLoading();
    showToast(`✅ Datos guardados correctamente: ${Object.values(totales).reduce((a, b) => a + b, 0)} votos totales`, 'success');
    
    cerrarModal();
    renderizarMapa();
    
  } catch (error) {
    hideLoading();
    showToast('❌ Error al guardar: ' + error.message, 'error');
    console.error('Error completo:', error);
  }
}

// ══════════════════════════════════════════════════════════════
// CARGAR DATOS EXISTENTES DESDE GOOGLE SHEETS
// ══════════════════════════════════════════════════════════════

async function cargarDatosExistentes() {
  showLoading('Cargando datos desde Google Sheets...');
  document.getElementById('connDot').className = 'conn-dot loading';
  document.getElementById('connText').textContent = 'Actualizando...';
  
  try {
    datosLlenados = {};
    
    // Cargar Resultados
    try {
      const resultados = await leerHojaCompleta('Resultados');
      if (resultados && resultados.length > 0) {
        resultados.forEach(r => {
          const codigo = String(r.codigo || r.código || '').trim();
          const partido = (r.partido || '').trim();
          const votos = parseInt(r.votos || 0);
          
          if (!codigo || !partido) return;
          
          if (!datosLlenados[codigo]) {
            datosLlenados[codigo] = { mesas: {}, totales: {} };
          }
          if (!datosLlenados[codigo].mesas[1]) {
            datosLlenados[codigo].mesas[1] = { votos: {}, fotos: [] };
          }
          datosLlenados[codigo].mesas[1].votos[partido] = votos;
        });
      }
    } catch (e) {
      console.warn('Error cargando Resultados:', e);
    }
    
    // Cargar Fotos
    try {
      const fotosData = await leerHojaCompleta('Fotos');
      if (fotosData && fotosData.length > 0) {
        fotosData.forEach(f => {
          const codigo = String(f.codigo || f.código || '').trim();
          const url = (f.url_foto || f.url || f.foto || '').trim();
          const mesa = (f.mesa || 'Mesa 1').trim();
          const numMesa = parseInt(mesa.match(/\d+/)?.[0] || '1');
          
          if (!codigo || !url) return;
          
          if (!datosLlenados[codigo]) {
            datosLlenados[codigo] = { mesas: {}, totales: {} };
          }
          if (!datosLlenados[codigo].mesas[numMesa]) {
            datosLlenados[codigo].mesas[numMesa] = { votos: {}, fotos: [] };
          }
          datosLlenados[codigo].mesas[numMesa].fotos.push(url);
        });
      }
    } catch (e) {
      console.warn('Error cargando Fotos:', e);
    }
    
    // Recalcular totales
    Object.keys(datosLlenados).forEach(codigo => {
      const recinto = recintos.find(r => r.c === codigo);
      if (recinto) {
        recintoActual = recinto;
        calcularTotales(codigo);
      }
    });
    
    hideLoading();
    document.getElementById('connDot').className = 'conn-dot';
    const numCargados = Object.keys(datosLlenados).length;
    document.getElementById('connText').textContent = `${numCargados} recintos con datos`;
    
    renderizarMapa();
    showToast(`✅ Datos cargados: ${numCargados} recintos`, 'success');
    
  } catch (error) {
    hideLoading();
    document.getElementById('connDot').className = 'conn-dot error';
    document.getElementById('connText').textContent = 'Error de conexión';
    showToast('Error al cargar datos: ' + error.message, 'error');
    console.error('Error:', error);
  }
}

// ══════════════════════════════════════════════════════════════
// ESTADÍSTICAS Y FILTROS
// ══════════════════════════════════════════════════════════════

function actualizarEstadisticas() {
  const completados = recintos.filter(r => getEstadoRecinto(r.c) === 'Completado').length;
  const pendientes = recintos.filter(r => getEstadoRecinto(r.c) === 'Pendiente').length;
  
  document.getElementById('statCargados').textContent = `${completados} recintos cargados`;
  document.getElementById('statPendientes').textContent = `${pendientes} pendientes`;
  
  if (completados > 0) {
    document.getElementById('statCargados').className = 'hdr-pill ok';
  }
}

function llenarFiltros() {
  // Departamentos
  const deps = [...new Set(recintos.map(r => r.d))].sort();
  const selDep = document.getElementById('selDep');
  selDep.innerHTML = '<option value="Todos">Todos los departamentos</option>';
  deps.forEach(d => {
    selDep.innerHTML += `<option value="${d}">${d}</option>`;
  });
}

// ══════════════════════════════════════════════════════════════
// MODAL Y EVENTOS
// ══════════════════════════════════════════════════════════════

function cerrarModal() {
  document.getElementById('modalLlenado').classList.remove('open');
  recintoActual = null;
  mesaActual = 1;
}

// Event listeners
document.getElementById('btnCloseModal').addEventListener('click', cerrarModal);
document.getElementById('btnCancelar').addEventListener('click', cerrarModal);
document.getElementById('btnGuardar').addEventListener('click', guardarDatos);

document.getElementById('selDep')?.addEventListener('change', renderizarMapa);
document.getElementById('selEstado')?.addEventListener('change', renderizarMapa);
document.getElementById('searchRecinto')?.addEventListener('input', renderizarMapa);

// Mobile sidebar
document.getElementById('btnToggleSidebar')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('show');
  document.getElementById('btnToggleSidebar').classList.toggle('active');
});

document.addEventListener('click', e => {
  if (window.innerWidth <= 768) {
    if (!e.target.closest('.sidebar') && !e.target.closest('#btnToggleSidebar')) {
      document.getElementById('sidebar').classList.remove('show');
      document.getElementById('btnToggleSidebar')?.classList.remove('active');
    }
  }
});

// Cerrar modal con ESC
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('modalLlenado').classList.contains('open')) {
    cerrarModal();
  }
});

// ══════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ══════════════════════════════════════════════════════════════

(async function init() {
  if (typeof R !== 'undefined' && R.length > 0) {
    recintos = R.map(r => ({ ...r }));
    
    llenarFiltros();
    renderizarMapa();
    
    document.getElementById('connText').textContent = `${recintos.length.toLocaleString('es-BO')} recintos`;
    document.getElementById('connDot').className = 'conn-dot';
    
    // Cargar candidatos
    await cargarCandidatos();
    
    // Auto-cargar datos existentes
    setTimeout(() => {
      cargarDatosExistentes();
    }, 800);
  } else {
    showToast('Error: No se encontraron datos de recintos', 'error');
  }
})();
