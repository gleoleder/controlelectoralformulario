/* ═══════════════════════════════════════════════════════════════════════════════
   CONTROL ELECTORAL - Sistema de Llenado de Datos
   Con integración Google Sheets API (estilo Surubí)
   Innovación Humana | 2026
   ═══════════════════════════════════════════════════════════════════════════════ */

// ═══ ESTADO GLOBAL ═══
let recintos = [];
let datosLlenados = {};
let recintoActual = null;
let mesaActual = 1;
let isSignedIn = false;

// ═══ SESIÓN ═══
const SESSION_KEY = 'electoral_google_token';
const SESSION_EXPIRY_KEY = 'electoral_token_expiry';

function saveToken(token) {
    try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(token));
        localStorage.setItem(SESSION_EXPIRY_KEY, (Date.now() + 3600000).toString());
    } catch (e) {}
}

function getSavedToken() {
    try {
        const tokenStr = localStorage.getItem(SESSION_KEY);
        const expiry = localStorage.getItem(SESSION_EXPIRY_KEY);
        if (!tokenStr || !expiry) return null;
        if (Date.now() > parseInt(expiry)) {
            clearSavedToken();
            return null;
        }
        return JSON.parse(tokenStr);
    } catch (e) {
        return null;
    }
}

function clearSavedToken() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_EXPIRY_KEY);
}

// ═══ GOOGLE API ═══
let tokenClient;
let gapiInited = false;
let gisInited = false;

function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
    try {
        await gapi.client.init({
            apiKey: CONFIG.API_KEY,
            discoveryDocs: [CONFIG.DISCOVERY_DOC],
        });
        gapiInited = true;
        checkSavedSession();
    } catch (error) {
        console.error('Error GAPI:', error);
    }
}

function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CONFIG.CLIENT_ID,
        scope: CONFIG.SCOPES,
        callback: handleAuthCallback,
    });
    gisInited = true;
    checkSavedSession();
}

function checkSavedSession() {
    if (!gapiInited || !gisInited) return;
    const savedToken = getSavedToken();
    if (savedToken) {
        gapi.client.setToken(savedToken);
        testTokenValidity();
    } else {
        updateConnectionStatus(false);
    }
}

async function testTokenValidity() {
    try {
        await gapi.client.sheets.spreadsheets.get({
            spreadsheetId: CONFIG.GOOGLE_SHEET_ID,
            fields: 'spreadsheetId'
        });
        isSignedIn = true;
        updateConnectionStatus(true);
        showToast('Sesión restaurada', 'success');
        cargarDatosExistentes();
    } catch (error) {
        clearSavedToken();
        updateConnectionStatus(false);
    }
}

function handleAuthClick() {
    if (!tokenClient) return;
    if (isSignedIn) {
        handleSignOut();
    } else {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    }
}

function handleAuthCallback(response) {
    if (response.error) {
        showToast('Error de autenticación', 'error');
        return;
    }
    saveToken(gapi.client.getToken());
    isSignedIn = true;
    updateConnectionStatus(true);
    showToast('✅ Conectado a Google Sheets', 'success');
    cargarDatosExistentes();
}

function handleSignOut() {
    const token = gapi.client.getToken();
    if (token) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken(null);
    }
    clearSavedToken();
    isSignedIn = false;
    datosLlenados = {};
    updateConnectionStatus(false);
    renderizarMapa();
    showToast('Sesión cerrada', 'warning');
}

function updateConnectionStatus(connected) {
    const dot = document.getElementById('connDot');
    const text = document.getElementById('connText');
    if (connected) {
        dot.className = 'conn-dot';
        text.textContent = 'Conectado';
        text.style.cursor = 'default';
        text.onclick = null;
    } else {
        dot.className = 'conn-dot offline';
        text.textContent = 'Click para conectar';
        text.style.cursor = 'pointer';
        text.onclick = handleAuthClick;
    }
}

// ═══ LECTURA/ESCRITURA SHEETS ═══
async function readSheet(sheetName) {
    try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: CONFIG.GOOGLE_SHEET_ID,
            range: `${sheetName}!A:Z`,
        });
        const values = response.result.values || [];
        if (values.length === 0) return [];
        const headers = values[0].map(h => h.toLowerCase().trim());
        return values.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = row[index] || '';
            });
            return obj;
        });
    } catch (error) {
        console.error(`Error leyendo ${sheetName}:`, error);
        return [];
    }
}

async function clearSheetData(sheetName, codigo) {
    try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: CONFIG.GOOGLE_SHEET_ID,
            range: `${sheetName}!A:Z`,
        });
        const values = response.result.values || [];
        if (values.length <= 1) return;
        
        const rowsToDelete = [];
        for (let i = values.length - 1; i >= 1; i--) {
            if (values[i][0] === codigo) {
                rowsToDelete.push(i);
            }
        }
        
        if (rowsToDelete.length > 0) {
            const requests = rowsToDelete.map(rowIndex => ({
                deleteDimension: {
                    range: {
                        sheetId: await getSheetId(sheetName),
                        dimension: 'ROWS',
                        startIndex: rowIndex,
                        endIndex: rowIndex + 1
                    }
                }
            }));
            
            await gapi.client.sheets.spreadsheets.batchUpdate({
                spreadsheetId: CONFIG.GOOGLE_SHEET_ID,
                resource: { requests }
            });
        }
    } catch (error) {
        console.error(`Error borrando ${sheetName}:`, error);
    }
}

async function getSheetId(sheetName) {
    try {
        const response = await gapi.client.sheets.spreadsheets.get({
            spreadsheetId: CONFIG.GOOGLE_SHEET_ID,
            fields: 'sheets(properties(sheetId,title))'
        });
        const sheet = response.result.sheets.find(s => s.properties.title === sheetName);
        return sheet ? sheet.properties.sheetId : 0;
    } catch (error) {
        return 0;
    }
}

async function appendRows(sheetName, rows) {
    try {
        await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: CONFIG.GOOGLE_SHEET_ID,
            range: `${sheetName}!A:Z`,
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: { values: rows }
        });
    } catch (error) {
        console.error(`Error escribiendo ${sheetName}:`, error);
        throw error;
    }
}

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
  let html = '';
  
  // Tabs de mesas
  if (numMesas > 1) {
    html += '<div class="mesa-tabs">';
    for (let i = 1; i <= numMesas; i++) {
      const datos = datosLlenados[recintoActual.c]?.mesas?.[i];
      const tieneVotos = datos && datos.votos && Object.keys(datos.votos).length > 0;
      const tieneFotos = datos && datos.fotos && datos.fotos.length > 0;
      const badge = tieneVotos && tieneFotos ? ' ✓' : tieneVotos || tieneFotos ? ' ●' : '';
      
      html += `<button class="mesa-tab ${i === mesaActual ? 'active' : ''}" onclick="cambiarMesa(${i})">
        Mesa ${i}${badge}
      </button>`;
    }
    html += '</div>';
  }
  
  // Contenido de cada mesa
  for (let i = 1; i <= numMesas; i++) {
    html += `<div class="mesa-content ${i === mesaActual ? 'active' : ''}" id="mesaContent${i}">`;
    html += renderizarFormularioMesa(i);
    html += '</div>';
  }
  
  // Resumen de totales
  html += renderizarResumenTotales();
  
  document.getElementById('modalBody').innerHTML = html;
}

function renderizarFormularioMesa(numMesa) {
  const codigo = recintoActual.c;
  const datosMesa = datosLlenados[codigo]?.mesas?.[numMesa] || { votos: {}, fotos: [] };
  
  let html = '';
  
  // Sección de votos
  html += '<div class="form-section">';
  html += `<div class="form-section-title">📊 Votos Mesa ${numMesa}</div>`;
  html += '<div class="form-grid">';
  
  CONFIG.CANDIDATOS_PREDETERMINADOS.forEach(cand => {
    const votos = datosMesa.votos?.[cand.partido] || 0;
    html += `
      <div class="form-group">
        <label class="form-label">
          <span class="partido-color" style="background:${cand.color}"></span>
          ${cand.nombre}
        </label>
        <input 
          type="number" 
          class="form-input" 
          min="0" 
          value="${votos}"
          data-mesa="${numMesa}"
          data-partido="${cand.partido}"
          onchange="actualizarVotos(${numMesa}, '${cand.partido}', this.value)"
          placeholder="0"
        >
      </div>
    `;
  });
  
  html += '</div></div>';
  
  // Sección de fotos
  html += '<div class="form-section">';
  html += `<div class="form-section-title">📸 Fotos del Acta - Mesa ${numMesa}</div>`;
  
  // Opción 1: Subir archivo (simulado - en realidad se pedirá link)
  html += `
    <div class="upload-area" onclick="solicitarLinkFoto(${numMesa})">
      <div class="upload-icon">📎</div>
      <div class="upload-text">Agregar foto del acta</div>
      <div class="upload-hint">Haz click para agregar el link de la foto</div>
    </div>
  `;
  
  // Preview de fotos existentes
  if (datosMesa.fotos && datosMesa.fotos.length > 0) {
    html += '<div class="upload-preview">';
    datosMesa.fotos.forEach((foto, idx) => {
      html += `
        <div class="upload-preview-item">
          <img src="${foto}" class="upload-preview-img" alt="Acta">
          <button class="upload-preview-remove" onclick="eliminarFoto(${numMesa}, ${idx})">×</button>
        </div>
      `;
    });
    html += '</div>';
  }
  
  html += '</div>';
  
  return html;
}

function renderizarResumenTotales() {
  const codigo = recintoActual.c;
  const numMesas = recintoActual.ms || 1;
  
  // Calcular totales sumando todas las mesas
  const totales = {};
  for (let i = 1; i <= numMesas; i++) {
    const datosMesa = datosLlenados[codigo]?.mesas?.[i];
    if (datosMesa && datosMesa.votos) {
      Object.entries(datosMesa.votos).forEach(([partido, votos]) => {
        totales[partido] = (totales[partido] || 0) + parseInt(votos || 0);
      });
    }
  }
  
  const totalVotos = Object.values(totales).reduce((sum, v) => sum + v, 0);
  
  if (totalVotos === 0) {
    return '<div class="result-summary"><div class="result-summary-title">📊 Resumen Total del Recinto</div><div style="text-align:center;color:var(--text4);padding:20px">Sin datos aún</div></div>';
  }
  
  // Ordenar por votos
  const partidosOrdenados = Object.entries(totales)
    .sort((a, b) => b[1] - a[1])
    .map(([partido, votos]) => {
      const cand = CONFIG.CANDIDATOS_PREDETERMINADOS.find(c => c.partido === partido);
      return {
        partido,
        nombre: cand?.nombre || partido,
        color: cand?.color || '#999',
        votos,
        porcentaje: ((votos / totalVotos) * 100).toFixed(1)
      };
    });
  
  let html = '<div class="result-summary">';
  html += '<div class="result-summary-title">📊 Resumen Total del Recinto (todas las mesas)</div>';
  
  // Barra de resultados
  html += '<div class="result-bar">';
  partidosOrdenados.forEach(p => {
    if (p.votos > 0) {
      html += `<div class="result-bar-segment" style="width:${p.porcentaje}%;background:${p.color}">${p.porcentaje}%</div>`;
    }
  });
  html += '</div>';
  
  // Lista de resultados
  html += '<div class="result-list">';
  partidosOrdenados.forEach(p => {
    html += `
      <div class="result-item">
        <div class="result-item-dot" style="background:${p.color}"></div>
        <div class="result-item-name">${p.nombre}</div>
        <div class="result-item-votes">${p.votos.toLocaleString('es-BO')} votos</div>
        <div class="result-item-pct">${p.porcentaje}%</div>
      </div>
    `;
  });
  html += '</div>';
  
  html += '</div>';
  
  return html;
}

// ══════════════════════════════════════════════════════════════
// INTERACCIONES DEL FORMULARIO
// ══════════════════════════════════════════════════════════════

function cambiarMesa(numMesa) {
  mesaActual = numMesa;
  renderizarFormulario();
}

function actualizarVotos(numMesa, partido, valor) {
  const codigo = recintoActual.c;
  
  if (!datosLlenados[codigo].mesas[numMesa]) {
    datosLlenados[codigo].mesas[numMesa] = { votos: {}, fotos: [] };
  }
  
  datosLlenados[codigo].mesas[numMesa].votos[partido] = parseInt(valor || 0);
  
  // Recalcular totales
  calcularTotales(codigo);
  
  // Re-renderizar solo el resumen
  const resumenHTML = renderizarResumenTotales();
  const container = document.querySelector('.result-summary')?.parentElement;
  if (container) {
    const lastChild = container.lastElementChild;
    if (lastChild && lastChild.classList.contains('result-summary')) {
      lastChild.outerHTML = resumenHTML;
    }
  }
}

function calcularTotales(codigo) {
  const numMesas = recintoActual.ms || 1;
  const totales = {};
  
  for (let i = 1; i <= numMesas; i++) {
    const datosMesa = datosLlenados[codigo]?.mesas?.[i];
    if (datosMesa && datosMesa.votos) {
      Object.entries(datosMesa.votos).forEach(([partido, votos]) => {
        totales[partido] = (totales[partido] || 0) + parseInt(votos || 0);
      });
    }
  }
  
  datosLlenados[codigo].totales = totales;
}

function solicitarLinkFoto(numMesa) {
  const url = prompt('Ingresa el link de la foto del acta:\n\nOpciones:\n- Link directo (termina en .jpg, .png, etc.)\n- Google Drive: https://drive.google.com/uc?id=ID_DEL_ARCHIVO');
  
  if (url && url.trim()) {
    agregarFoto(numMesa, url.trim());
  }
}

function agregarFoto(numMesa, url) {
  const codigo = recintoActual.c;
  
  if (!datosLlenados[codigo].mesas[numMesa]) {
    datosLlenados[codigo].mesas[numMesa] = { votos: {}, fotos: [] };
  }
  
  datosLlenados[codigo].mesas[numMesa].fotos.push(url);
  renderizarFormulario();
  showToast('Foto agregada correctamente', 'success');
}

function eliminarFoto(numMesa, idx) {
  if (confirm('¿Eliminar esta foto?')) {
    const codigo = recintoActual.c;
    datosLlenados[codigo].mesas[numMesa].fotos.splice(idx, 1);
    renderizarFormulario();
    showToast('Foto eliminada', 'warning');
  }
}

// ══════════════════════════════════════════════════════════════
// GUARDAR DATOS EN GOOGLE SHEETS
// ══════════════════════════════════════════════════════════════

async function guardarDatos() {
  if (!isSignedIn) {
    showToast('Debes iniciar sesión primero', 'warning');
    handleAuthClick();
    return;
  }
  
  if (!recintoActual) return;
  
  const codigo = recintoActual.c;
  const datos = datosLlenados[codigo];
  
  if (!datos || Object.keys(datos.mesas).length === 0) {
    showToast('No hay datos para guardar', 'warning');
    return;
  }
  
  showLoading('Guardando en Google Sheets...');
  
  try {
    const votosTotales = {};
    const filasResultados = [];
    const filasFotos = [];
    
    Object.entries(datos.mesas).forEach(([numMesa, datosMesa]) => {
      if (datosMesa.votos) {
        Object.entries(datosMesa.votos).forEach(([partido, votos]) => {
          votosTotales[partido] = (votosTotales[partido] || 0) + parseInt(votos || 0);
        });
      }
      
      if (datosMesa.fotos) {
        datosMesa.fotos.forEach(url => {
          filasFotos.push([
            codigo,
            `Mesa ${numMesa}`,
            url,
            new Date().toLocaleString('es-BO'),
            ''
          ]);
        });
      }
    });
    
    Object.entries(votosTotales).forEach(([partido, votos]) => {
      if (votos > 0) {
        const cand = CONFIG.CONFIG.CANDIDATOS_PREDETERMINADOS.find(c => c.partido === partido);
        filasResultados.push([
          codigo,
          partido,
          votos,
          cand?.color || ''
        ]);
      }
    });
    
    console.log('📊 Guardando:', { resultados: filasResultados.length, fotos: filasFotos.length });
    
    await clearSheetData(CONFIG.SHEETS.RESULTADOS, codigo);
    await clearSheetData(CONFIG.SHEETS.FOTOS, codigo);
    
    if (filasResultados.length > 0) {
      await appendRows(CONFIG.SHEETS.RESULTADOS, filasResultados);
    }
    
    if (filasFotos.length > 0) {
      await appendRows(CONFIG.SHEETS.FOTOS, filasFotos);
    }
    
    hideLoading();
    showToast(`✅ Guardado: ${filasResultados.length} resultados, ${filasFotos.length} fotos`, 'success');
    
    cerrarModal();
    await cargarDatosExistentes();
    
  } catch (error) {
    hideLoading();
    showToast('❌ Error al guardar: ' + error.message, 'error');
    console.error(error);
  }
}

// ══════════════════════════════════════════════════════════════
// CARGAR DATOS EXISTENTES DESDE GOOGLE SHEETS
// ══════════════════════════════════════════════════════════════

async function fetchSheet(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  const text = await res.text();
  const json = JSON.parse(text.substring(47).slice(0, -2));
  const cols = json.table.cols.map(c => (c.label || '').trim().toLowerCase());
  return json.table.rows.map(r => {
    const obj = {};
    r.c.forEach((cell, i) => {
      obj[cols[i] || `col${i}`] = cell ? (cell.v !== null ? cell.v : '') : '';
    });
    return obj;
  });
}

async function cargarDatosExistentes() {
  if (!isSignedIn) {
    showToast('Inicia sesión para cargar datos', 'warning');
    handleAuthClick();
    return;
  }
  
  showLoading('Cargando datos desde Google Sheets...');
  
  try {
    datosLlenados = {};
    
    // Cargar Resultados
    const resultados = await readSheet(CONFIG.SHEETS.RESULTADOS);
    console.log(`📊 Cargados ${resultados.length} resultados`);
    
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
    
    // Cargar Fotos
    const fotos = await readSheet(CONFIG.SHEETS.FOTOS);
    console.log(`📸 Cargadas ${fotos.length} fotos`);
    
    fotos.forEach(f => {
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
    
    // Recalcular totales
    Object.keys(datosLlenados).forEach(codigo => {
      const recinto = recintos.find(r => r.c === codigo);
      if (recinto) {
        recintoActual = recinto;
        calcularTotales(codigo);
      }
    });
    
    hideLoading();
    const numCargados = Object.keys(datosLlenados).length;
    showToast(`✅ Cargados ${numCargados} recintos con datos`, 'success');
    
    renderizarMapa();
    actualizarEstadisticas();
    
  } catch (error) {
    hideLoading();
    showToast('Error al cargar: ' + error.message, 'error');
    console.error(error);
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

(function init() {
  if (typeof R !== 'undefined' && R.length > 0) {
    recintos = R.map(r => ({ ...r }));
    
    llenarFiltros();
    renderizarMapa();
    
    document.getElementById('connText').textContent = `${recintos.length.toLocaleString('es-BO')} recintos`;
    document.getElementById('connDot').className = 'conn-dot';
    
    // Auto-cargar datos existentes
    setTimeout(() => {
      cargarDatosExistentes();
    }, 800);
  } else {
    showToast('Error: No se encontraron datos de recintos', 'error');
  }
})();
