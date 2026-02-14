// ═══════════════════════════════════════════════════════════════
// SISTEMA DE LLENADO DE DATOS · CONTROL ELECTORAL 2026
// Con autenticación Google OAuth y escritura segura en Sheets
// ═══════════════════════════════════════════════════════════════

// CONFIGURACIÓN DE GOOGLE
const CLIENT_ID = '1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com'; // REEMPLAZAR
const API_KEY = 'AIzaSyAOhGTjJXHhuUhqf1g2DPCla59xNzftb-Q';
const SHEET_ID = '1FX9nniq3Caw6GEq-x1SWOvgrjQ5bchEaxGVxOxTvJgA';

// Scopes requeridos
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email';

// ── Estado de autenticación ──
let tokenClient;
let gapiInited = false;
let gisInited = false;
let accessToken = null;
let userEmail = null;

// ── Cache de candidatos por municipio ──
let candidatosPorMunicipio = {};
let todosLosCandidatos = [];

// ── Estado global ──
let recintos = [];
let datosLlenados = {};
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
// GOOGLE API - INICIALIZACIÓN
// ══════════════════════════════════════════════════════════════

function gapiLoaded() {
  gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
  await gapi.client.init({
    apiKey: API_KEY,
    discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
  });
  gapiInited = true;
  maybeEnableButtons();
}

function gisLoaded() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: '', // se define después
  });
  gisInited = true;
  maybeEnableButtons();
}

function maybeEnableButtons() {
  if (gapiInited && gisInited) {
    // Sistema listo para autenticación
    document.getElementById('btnLogin').disabled = false;
    updateAuthUI();
  }
}

// ══════════════════════════════════════════════════════════════
// AUTENTICACIÓN CON GOOGLE
// ══════════════════════════════════════════════════════════════

function handleAuthClick() {
  tokenClient.callback = async (resp) => {
    if (resp.error !== undefined) {
      showToast('❌ Error de autenticación: ' + resp.error, 'error');
      return;
    }
    
    accessToken = gapi.client.getToken().access_token;
    
    // Obtener info del usuario
    await obtenerInfoUsuario();
    
    updateAuthUI();
    showToast(`✅ Bienvenido ${userEmail}`, 'success');
    
    // Cargar datos iniciales
    await cargarCandidatos();
    await cargarDatosExistentes();
  };

  if (gapi.client.getToken() === null) {
    // Pedir autorización
    tokenClient.requestAccessToken({ prompt: 'consent' });
  } else {
    // Ya tiene token, renovar
    tokenClient.requestAccessToken({ prompt: '' });
  }
}

function handleSignoutClick() {
  const token = gapi.client.getToken();
  if (token !== null) {
    google.accounts.oauth2.revoke(token.access_token);
    gapi.client.setToken('');
    accessToken = null;
    userEmail = null;
    updateAuthUI();
    showToast('👋 Sesión cerrada', 'success');
  }
}

async function obtenerInfoUsuario() {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    const data = await response.json();
    userEmail = data.email;
  } catch (error) {
    console.error('Error obteniendo info de usuario:', error);
    userEmail = 'Usuario';
  }
}

function updateAuthUI() {
  const isAuthorized = gapi.client.getToken() !== null;
  
  document.getElementById('authSection').style.display = isAuthorized ? 'none' : 'flex';
  document.getElementById('appContent').style.display = isAuthorized ? 'flex' : 'none';
  
  if (isAuthorized && userEmail) {
    document.getElementById('userEmail').textContent = userEmail;
  }
}

// ══════════════════════════════════════════════════════════════
// GOOGLE SHEETS API - LECTURA
// ══════════════════════════════════════════════════════════════

async function leerHojaCompleta(nombreHoja) {
  try {
    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: nombreHoja,
    });
    
    const rows = response.result.values;
    if (!rows || rows.length === 0) {
      return [];
    }
    
    // Convertir a objetos
    const headers = rows[0].map(h => h.toLowerCase().trim());
    const data = rows.slice(1);
    
    return data.map(row => {
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

// ══════════════════════════════════════════════════════════════
// GOOGLE SHEETS API - ESCRITURA
// ══════════════════════════════════════════════════════════════

async function agregarFilas(nombreHoja, filas) {
  try {
    const response = await gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: nombreHoja,
      valueInputOption: 'RAW',
      resource: {
        values: filas
      }
    });
    
    return response.result;
  } catch (error) {
    console.error(`Error agregando filas a "${nombreHoja}":`, error);
    throw error;
  }
}

async function limpiarDatosRecinto(codigo) {
  try {
    // Leer todas las filas
    const resultados = await leerHojaCompleta('Resultados');
    const fotos = await leerHojaCompleta('Fotos');
    
    // Identificar índices a borrar (de la hoja completa con headers)
    const filasResultadosABorrar = [];
    resultados.forEach((row, idx) => {
      if (row.codigo === codigo) {
        filasResultadosABorrar.push(idx + 2); // +2 porque: +1 por header, +1 por índice 0
      }
    });
    
    const filasFotosABorrar = [];
    fotos.forEach((row, idx) => {
      if (row.codigo === codigo) {
        filasFotosABorrar.push(idx + 2);
      }
    });
    
    // Borrar en orden inverso para no cambiar índices
    const requests = [];
    
    [...filasResultadosABorrar].reverse().forEach(rowIndex => {
      requests.push({
        deleteDimension: {
          range: {
            sheetId: obtenerSheetId('Resultados'),
            dimension: 'ROWS',
            startIndex: rowIndex - 1,
            endIndex: rowIndex
          }
        }
      });
    });
    
    [...filasFotosABorrar].reverse().forEach(rowIndex => {
      requests.push({
        deleteDimension: {
          range: {
            sheetId: obtenerSheetId('Fotos'),
            dimension: 'ROWS',
            startIndex: rowIndex - 1,
            endIndex: rowIndex
          }
        }
      });
    });
    
    if (requests.length > 0) {
      await gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        resource: { requests }
      });
    }
  } catch (error) {
    console.warn('Error limpiando datos (puede ser normal si es primera vez):', error);
  }
}

async function obtenerSheetId(nombreHoja) {
  // Para simplificar, asumimos IDs estándar
  // En producción, deberías obtenerlos dinámicamente
  const sheetIds = {
    'Resultados': 0,
    'Fotos': 1,
    'Candidatos': 2,
    'Log': 3
  };
  return sheetIds[nombreHoja] || 0;
}

// ══════════════════════════════════════════════════════════════
// CARGAR CANDIDATOS
// ══════════════════════════════════════════════════════════════

async function cargarCandidatos() {
  try {
    showLoading('Cargando candidatos...');
    
    const candidatos = await leerHojaCompleta('Candidatos');
    
    if (!candidatos || candidatos.length === 0) {
      console.warn('⚠️ No se encontraron candidatos');
      hideLoading();
      return false;
    }
    
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
  
  // Fallback
  return [
    { partido: 'IH', nombre: 'Innovación Humana', cargo: 'Alcalde', color: '#8B5CF6', orden: 1 },
    { partido: 'MAS-IPSP', nombre: 'MAS-IPSP', cargo: 'Alcalde', color: '#1E3A8A', orden: 2 },
    { partido: 'CC', nombre: 'Comunidad Ciudadana', cargo: 'Alcalde', color: '#F97316', orden: 3 },
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
  if (!accessToken) {
    showToast('⚠️ Debes iniciar sesión primero', 'warning');
    return;
  }
  
  recintoActual = recintos.find(r => r.c === codigo);
  if (!recintoActual) {
    showToast('Recinto no encontrado', 'error');
    return;
  }
  
  mesaActual = 1;
  
  if (!datosLlenados[codigo]) {
    datosLlenados[codigo] = {
      mesas: {},
      totales: {}
    };
  }
  
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
  
  html += '<div class="form-content">';
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
      <input type="text" id="inputNuevaFoto" placeholder="URL de la foto" class="foto-input">
      <button class="btn-secondary" onclick="agregarFoto()">➕ Agregar Foto</button>
    </div>
  `;
  
  html += '</div>';
  
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
// GUARDAR DATOS
// ══════════════════════════════════════════════════════════════

async function guardarDatos() {
  if (!accessToken) {
    showToast('⚠️ Debes iniciar sesión para guardar', 'warning');
    return;
  }
  
  const codigo = recintoActual.c;
  const datos = datosLlenados[codigo];
  
  if (!datos || !datos.mesas || Object.keys(datos.mesas).length === 0) {
    showToast('⚠️ No hay datos para guardar', 'warning');
    return;
  }
  
  showLoading('Guardando en Google Sheets...');
  
  try {
    // Limpiar datos antiguos
    await limpiarDatosRecinto(codigo);
    
    const totales = calcularTotales(codigo);
    const candidatos = obtenerCandidatosMunicipio(recintoActual.m);
    const timestamp = new Date().toLocaleString('es-BO');
    
    // Preparar resultados
    const filasResultados = [];
    Object.entries(totales).forEach(([partido, votos]) => {
      const cand = candidatos.find(c => c.partido === partido);
      const porcentaje = Object.values(totales).reduce((a, b) => a + b, 0) > 0 
        ? ((votos / Object.values(totales).reduce((a, b) => a + b, 0)) * 100).toFixed(2)
        : 0;
      
      filasResultados.push([
        codigo,
        recintoActual.m,
        partido,
        cand?.nombre || partido,
        votos,
        porcentaje,
        timestamp
      ]);
    });
    
    // Preparar fotos
    const filasFotos = [];
    Object.entries(datos.mesas).forEach(([numMesa, mesa]) => {
      if (mesa.fotos && mesa.fotos.length > 0) {
        mesa.fotos.forEach(url => {
          filasFotos.push([
            codigo,
            `Mesa ${numMesa}`,
            url,
            timestamp,
            userEmail || 'Usuario'
          ]);
        });
      }
    });
    
    // Guardar
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
      userEmail || 'Usuario',
      `${filasResultados.length} resultados, ${filasFotos.length} fotos`
    ]];
    promesas.push(agregarFilas('Log', filaLog));
    
    await Promise.all(promesas);
    
    hideLoading();
    showToast(`✅ Datos guardados: ${Object.values(totales).reduce((a, b) => a + b, 0)} votos totales`, 'success');
    
    cerrarModal();
    renderizarMapa();
    
  } catch (error) {
    hideLoading();
    showToast('❌ Error al guardar: ' + error.message, 'error');
    console.error('Error:', error);
  }
}

// ══════════════════════════════════════════════════════════════
// CARGAR DATOS EXISTENTES
// ══════════════════════════════════════════════════════════════

async function cargarDatosExistentes() {
  if (!accessToken) return;
  
  showLoading('Cargando datos...');
  document.getElementById('connDot').className = 'conn-dot loading';
  
  try {
    datosLlenados = {};
    
    const resultados = await leerHojaCompleta('Resultados');
    if (resultados && resultados.length > 0) {
      resultados.forEach(r => {
        const codigo = String(r.codigo || '').trim();
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
    
    const fotosData = await leerHojaCompleta('Fotos');
    if (fotosData && fotosData.length > 0) {
      fotosData.forEach(f => {
        const codigo = String(f.codigo || '').trim();
        const url = (f.url_foto || '').trim();
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
    document.getElementById('connText').textContent = 'Error';
    showToast('Error: ' + error.message, 'error');
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

document.getElementById('btnCloseModal').addEventListener('click', cerrarModal);
document.getElementById('btnCancelar').addEventListener('click', cerrarModal);
document.getElementById('btnGuardar').addEventListener('click', guardarDatos);
document.getElementById('btnLogin').addEventListener('click', handleAuthClick);
document.getElementById('btnLogout').addEventListener('click', handleSignoutClick);

document.getElementById('selDep')?.addEventListener('change', renderizarMapa);
document.getElementById('selEstado')?.addEventListener('change', renderizarMapa);
document.getElementById('searchRecinto')?.addEventListener('input', renderizarMapa);

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
  } else {
    showToast('Error: No se encontraron datos de recintos', 'error');
  }
})();
