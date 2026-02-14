// ═══════════════════════════════════════════════════════════════
// SISTEMA DE LLENADO DE DATOS · CONTROL ELECTORAL 2026
// Conecta con Google Sheets para guardar resultados
// ═══════════════════════════════════════════════════════════════

const SHEET_ID = '1FX9nniq3Caw6GEq-x1SWOvgrjQ5bchEaxGVxOxTvJgA';

// ── Candidatos predeterminados con colores ──
const CANDIDATOS_PREDETERMINADOS = [
  { partido: 'IH', nombre: 'Innovación Humana', color: '#8B5CF6' },
  { partido: 'MAS-IPSP', nombre: 'MAS-IPSP', color: '#1E3A8A' },
  { partido: 'CC', nombre: 'Comunidad Ciudadana', color: '#F97316' },
  { partido: 'CREEMOS', nombre: 'Creemos', color: '#15803D' },
  { partido: 'FPV', nombre: 'FPV', color: '#DC2626' },
  { partido: 'PDC', nombre: 'PDC', color: '#07626B' },
  { partido: 'MTS', nombre: 'MTS', color: '#0891B2' },
  { partido: 'ASP', nombre: 'ASP', color: '#E8532E' },
  { partido: 'SOL.BO', nombre: 'SOL.BO', color: '#F59E0B' },
  { partido: 'PAN-BOL', nombre: 'PAN-BOL', color: '#BE185D' },
  { partido: 'UCS', nombre: 'UCS', color: '#0284C7' },
  { partido: 'UN', nombre: 'UN', color: '#6366F1' },
  { partido: 'UNIDOS', nombre: 'Unidos', color: '#059669' },
  { partido: 'ADN', nombre: 'ADN', color: '#A16207' },
  { partido: 'LIBRE', nombre: 'Libre', color: '#E65152' },
  { partido: 'UNIDAD', nombre: 'Unidad', color: '#FEB44B' },
  { partido: 'AP', nombre: 'AP', color: '#03B4F0' },
  { partido: 'APB-SUMATE', nombre: 'APB-Súmate', color: '#420855' },
];

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
  
  CANDIDATOS_PREDETERMINADOS.forEach(cand => {
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
      const cand = CANDIDATOS_PREDETERMINADOS.find(c => c.partido === partido);
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
  if (!recintoActual) return;
  
  const codigo = recintoActual.c;
  const datos = datosLlenados[codigo];
  
  if (!datos || Object.keys(datos.mesas).length === 0) {
    showToast('No hay datos para guardar', 'warning');
    return;
  }
  
  showLoading('Guardando datos en Google Sheets...');
  
  try {
    // Preparar datos: sumar todas las mesas para resultados totales
    const votosTotales = {};
    const fotos = [];
    
    // Procesar cada mesa
    Object.entries(datos.mesas).forEach(([numMesa, datosMesa]) => {
      // Sumar votos de todas las mesas
      if (datosMesa.votos) {
        Object.entries(datosMesa.votos).forEach(([partido, votos]) => {
          votosTotales[partido] = (votosTotales[partido] || 0) + parseInt(votos || 0);
        });
      }
      
      // Fotos: una fila por cada foto
      if (datosMesa.fotos) {
        datosMesa.fotos.forEach(url => {
          fotos.push({
            codigo: codigo,
            mesa: `Mesa ${numMesa}`,
            url_foto: url,
            timestamp: new Date().toLocaleString('es-BO'),
            observaciones: ''
          });
        });
      }
    });
    
    // Crear array de resultados con totales
    const resultados = [];
    Object.entries(votosTotales).forEach(([partido, votos]) => {
      if (votos > 0) {
        const cand = CANDIDATOS_PREDETERMINADOS.find(c => c.partido === partido);
        resultados.push({
          codigo: codigo,
          partido: partido,
          votos: votos,
          color: cand?.color || ''
        });
      }
    });
    
    // ═══════════════════════════════════════════════════════════════
    // OPCIÓN 1: GUARDADO CON GOOGLE APPS SCRIPT
    // ═══════════════════════════════════════════════════════════════
    
    // 🔧 INSTRUCCIONES:
    // 1. Sigue la guía en GoogleAppsScript.gs
    // 2. Despliega el script como Web App
    // 3. Pega la URL aquí abajo:
    
    const WEB_APP_URL = ''; // ⬅️ PEGA TU URL AQUI
    
    if (WEB_APP_URL) {
      // Llamada real a Google Apps Script
      const response = await fetch(WEB_APP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          codigo: codigo,
          resultados: resultados,
          fotos: fotos
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        hideLoading();
        showToast(`✅ Datos guardados: ${result.resultados || 0} resultados, ${result.fotos || 0} fotos`, 'success');
        cerrarModal();
        renderizarMapa();
      } else {
        throw new Error(result.message || 'Error desconocido');
      }
    } else {
      // ═══════════════════════════════════════════════════════════════
      // OPCIÓN 2: GUARDADO SIMULADO (para testing)
      // ═══════════════════════════════════════════════════════════════
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 DATOS A GUARDAR (MODO SIMULADO)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Código recinto:', codigo);
      console.log('Resultados totales:', resultados);
      console.log('Fotos:', fotos);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Simulación de guardado
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      hideLoading();
      showToast('⚠️ MODO SIMULADO: Configura WEB_APP_URL en llenado-script.js (línea 280)', 'warning');
      
      // Guardar en localStorage para persistencia local (temporal)
      localStorage.setItem(`recinto_${codigo}`, JSON.stringify(datos));
      
      setTimeout(() => {
        showToast('💡 Los datos se guardaron localmente. Implementa Google Apps Script para guardado real.', 'warning');
      }, 2000);
      
      cerrarModal();
      renderizarMapa();
    }
    
  } catch (error) {
    hideLoading();
    showToast('❌ Error al guardar: ' + error.message, 'error');
    console.error('Error completo:', error);
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
  showLoading('Cargando datos desde Google Sheets...');
  document.getElementById('connDot').className = 'conn-dot loading';
  document.getElementById('connText').textContent = 'Actualizando...';
  
  try {
    datosLlenados = {};
    
    // Cargar Resultados
    try {
      const resultados = await fetchSheet('Resultados');
      if (resultados && resultados.length > 0) {
        resultados.forEach(r => {
          const codigo = String(r.codigo || r.código || '').trim();
          const partido = (r.partido || '').trim();
          const votos = parseInt(r.votos || 0);
          
          if (!codigo || !partido) return;
          
          // Como no sabemos a qué mesa pertenecía, lo ponemos en mesa 1
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
      const fotosData = await fetchSheet('Fotos');
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
