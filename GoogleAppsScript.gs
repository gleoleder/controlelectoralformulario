/**
 * ═══════════════════════════════════════════════════════════════
 * GOOGLE APPS SCRIPT - API DE GUARDADO
 * Sistema de Control Electoral · Subnacionales 2026
 * ═══════════════════════════════════════════════════════════════
 * 
 * INSTRUCCIONES DE INSTALACIÓN:
 * 
 * 1. Abre tu Google Sheet
 * 2. Extensiones → Apps Script
 * 3. Borra el código por defecto
 * 4. Pega este código completo
 * 5. Guarda el proyecto (Ctrl+S)
 * 6. Click en "Implementar" → "Nueva implementación"
 * 7. Tipo: Aplicación web
 * 8. Ejecutar como: Yo (tu email)
 * 9. Quién tiene acceso: Cualquier persona
 * 10. Click "Implementar"
 * 11. Copia la URL de la web app
 * 12. Pega esa URL en llenado-script.js (ver línea 280)
 */

// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
  SHEET_RESULTADOS: 'Resultados',
  SHEET_FOTOS: 'Fotos',
  SHEET_CANDIDATOS: 'Candidatos',
  SHEET_LOG: 'Log', // Opcional: para auditoría
};

// ═══════════════════════════════════════════════════════════════
// ENDPOINT PRINCIPAL - Recibe datos desde el sistema de llenado
// ═══════════════════════════════════════════════════════════════

function doPost(e) {
  try {
    // Parsear datos recibidos
    const data = JSON.parse(e.postData.contents);
    
    // Validar datos
    if (!data.resultados && !data.fotos) {
      return crearRespuesta(false, 'No hay datos para guardar');
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // ── GUARDAR RESULTADOS ──
    if (data.resultados && data.resultados.length > 0) {
      guardarResultados(ss, data.resultados, data.codigo);
    }
    
    // ── GUARDAR FOTOS ──
    if (data.fotos && data.fotos.length > 0) {
      guardarFotos(ss, data.fotos);
    }
    
    // ── LOG (opcional) ──
    registrarLog(ss, {
      timestamp: new Date(),
      codigo: data.codigo || 'N/A',
      resultados: data.resultados?.length || 0,
      fotos: data.fotos?.length || 0,
      usuario: Session.getActiveUser().getEmail()
    });
    
    return crearRespuesta(true, 'Datos guardados correctamente', {
      resultados: data.resultados?.length || 0,
      fotos: data.fotos?.length || 0
    });
    
  } catch (error) {
    Logger.log('Error en doPost: ' + error.toString());
    return crearRespuesta(false, 'Error: ' + error.toString());
  }
}

// ═══════════════════════════════════════════════════════════════
// GUARDAR RESULTADOS
// ═══════════════════════════════════════════════════════════════

function guardarResultados(ss, resultados, codigo) {
  const sheet = ss.getSheetByName(CONFIG.SHEET_RESULTADOS);
  
  if (!sheet) {
    throw new Error('Hoja "Resultados" no encontrada');
  }
  
  // ESTRATEGIA: Borrar datos antiguos del recinto y agregar nuevos
  // Esto evita duplicados y permite edición
  
  if (codigo) {
    borrarDatosRecinto(sheet, codigo);
  }
  
  // Agregar nuevas filas
  resultados.forEach(r => {
    if (r.codigo && r.partido && r.votos >= 0) {
      sheet.appendRow([
        r.codigo,
        r.partido,
        r.votos,
        r.color || ''
      ]);
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// GUARDAR FOTOS
// ═══════════════════════════════════════════════════════════════

function guardarFotos(ss, fotos) {
  const sheet = ss.getSheetByName(CONFIG.SHEET_FOTOS);
  
  if (!sheet) {
    throw new Error('Hoja "Fotos" no encontrada');
  }
  
  // Obtener código del primer elemento para borrar datos antiguos
  if (fotos.length > 0 && fotos[0].codigo) {
    borrarFotosRecinto(sheet, fotos[0].codigo);
  }
  
  // Agregar nuevas filas
  fotos.forEach(f => {
    if (f.codigo && f.url_foto) {
      sheet.appendRow([
        f.codigo,
        f.mesa || 'Mesa 1',
        f.url_foto,
        f.timestamp || new Date().toLocaleString('es-BO'),
        f.observaciones || ''
      ]);
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// FUNCIONES AUXILIARES
// ═══════════════════════════════════════════════════════════════

function borrarDatosRecinto(sheet, codigo) {
  const data = sheet.getDataRange().getValues();
  const filasABorrar = [];
  
  // Identificar filas a borrar (de abajo hacia arriba para no cambiar índices)
  for (let i = data.length - 1; i >= 1; i--) { // Empezar en 1 para saltar encabezados
    if (data[i][0] === codigo) {
      filasABorrar.push(i + 1); // +1 porque las filas empiezan en 1 en Sheets
    }
  }
  
  // Borrar filas
  filasABorrar.forEach(fila => {
    sheet.deleteRow(fila);
  });
}

function borrarFotosRecinto(sheet, codigo) {
  const data = sheet.getDataRange().getValues();
  const filasABorrar = [];
  
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === codigo) {
      filasABorrar.push(i + 1);
    }
  }
  
  filasABorrar.forEach(fila => {
    sheet.deleteRow(fila);
  });
}

function registrarLog(ss, log) {
  try {
    let sheet = ss.getSheetByName(CONFIG.SHEET_LOG);
    
    // Crear hoja de log si no existe
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.SHEET_LOG);
      sheet.appendRow(['Timestamp', 'Código', 'Resultados', 'Fotos', 'Usuario']);
    }
    
    sheet.appendRow([
      log.timestamp,
      log.codigo,
      log.resultados,
      log.fotos,
      log.usuario
    ]);
  } catch (e) {
    Logger.log('Error al registrar log: ' + e.toString());
  }
}

function crearRespuesta(success, message, data = {}) {
  const respuesta = {
    success: success,
    message: message,
    timestamp: new Date().toISOString(),
    ...data
  };
  
  return ContentService
    .createTextOutput(JSON.stringify(respuesta))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════════════════════════════
// ENDPOINT GET - Obtener datos (opcional, para debugging)
// ═══════════════════════════════════════════════════════════════

function doGet(e) {
  // Endpoint para verificar que el script funciona
  return crearRespuesta(true, 'API funcionando correctamente', {
    version: '1.0',
    endpoints: {
      POST: 'Guardar datos de recinto',
      GET: 'Verificar estado de la API'
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// FUNCIONES ADMINISTRATIVAS (opcionales)
// ═══════════════════════════════════════════════════════════════

/**
 * Función para ejecutar manualmente: crear hojas si no existen
 */
function crearHojasNecesarias() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Crear hoja Resultados si no existe
  if (!ss.getSheetByName(CONFIG.SHEET_RESULTADOS)) {
    const sheet = ss.insertSheet(CONFIG.SHEET_RESULTADOS);
    sheet.appendRow(['codigo', 'partido', 'votos', 'color']);
    sheet.getRange('A1:D1').setFontWeight('bold').setBackground('#E9D5FF');
  }
  
  // Crear hoja Fotos si no existe
  if (!ss.getSheetByName(CONFIG.SHEET_FOTOS)) {
    const sheet = ss.insertSheet(CONFIG.SHEET_FOTOS);
    sheet.appendRow(['codigo', 'mesa', 'url_foto', 'timestamp', 'observaciones']);
    sheet.getRange('A1:E1').setFontWeight('bold').setBackground('#E9D5FF');
  }
  
  // Crear hoja Candidatos si no existe
  if (!ss.getSheetByName(CONFIG.SHEET_CANDIDATOS)) {
    const sheet = ss.insertSheet(CONFIG.SHEET_CANDIDATOS);
    sheet.appendRow(['codigo', 'nombre', 'partido', 'cargo', 'genero', 'edad']);
    sheet.getRange('A1:F1').setFontWeight('bold').setBackground('#E9D5FF');
  }
  
  Logger.log('Hojas creadas correctamente');
}

/**
 * Función para obtener estadísticas (ejecutar manualmente)
 */
function obtenerEstadisticas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const resultados = ss.getSheetByName(CONFIG.SHEET_RESULTADOS);
  const fotos = ss.getSheetByName(CONFIG.SHEET_FOTOS);
  
  const stats = {
    totalResultados: resultados ? resultados.getLastRow() - 1 : 0,
    totalFotos: fotos ? fotos.getLastRow() - 1 : 0,
    recintosUnicos: obtenerRecintosUnicos(resultados),
    fechaActualizacion: new Date().toLocaleString('es-BO')
  };
  
  Logger.log('Estadísticas:');
  Logger.log(JSON.stringify(stats, null, 2));
  
  return stats;
}

function obtenerRecintosUnicos(sheet) {
  if (!sheet) return 0;
  
  const data = sheet.getDataRange().getValues();
  const codigos = new Set();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      codigos.add(data[i][0]);
    }
  }
  
  return codigos.size;
}

// ═══════════════════════════════════════════════════════════════
// VALIDACIONES (opcional - para producción)
// ═══════════════════════════════════════════════════════════════

function validarDatos(data) {
  const errores = [];
  
  if (data.resultados) {
    data.resultados.forEach((r, i) => {
      if (!r.codigo) errores.push(`Resultado ${i}: falta código`);
      if (!r.partido) errores.push(`Resultado ${i}: falta partido`);
      if (r.votos === undefined || r.votos === null) {
        errores.push(`Resultado ${i}: falta votos`);
      }
    });
  }
  
  if (data.fotos) {
    data.fotos.forEach((f, i) => {
      if (!f.codigo) errores.push(`Foto ${i}: falta código`);
      if (!f.url_foto) errores.push(`Foto ${i}: falta URL`);
    });
  }
  
  return errores;
}

// ═══════════════════════════════════════════════════════════════
// MENÚ PERSONALIZADO (opcional)
// ═══════════════════════════════════════════════════════════════

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Control Electoral')
    .addItem('Crear hojas necesarias', 'crearHojasNecesarias')
    .addItem('Ver estadísticas', 'mostrarEstadisticas')
    .addItem('Verificar integridad', 'verificarIntegridadDatos')
    .addToUi();
}

function mostrarEstadisticas() {
  const stats = obtenerEstadisticas();
  const ui = SpreadsheetApp.getUi();
  
  const mensaje = `
📊 ESTADÍSTICAS DEL SISTEMA

• Total de resultados: ${stats.totalResultados}
• Total de fotos: ${stats.totalFotos}
• Recintos únicos: ${stats.recintosUnicos}
• Última actualización: ${stats.fechaActualizacion}
  `;
  
  ui.alert('Estadísticas', mensaje, ui.ButtonSet.OK);
}

function verificarIntegridadDatos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const resultados = ss.getSheetByName(CONFIG.SHEET_RESULTADOS);
  
  if (!resultados) {
    SpreadsheetApp.getUi().alert('Error', 'Hoja Resultados no encontrada', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  const data = resultados.getDataRange().getValues();
  let problemas = [];
  
  for (let i = 1; i < data.length; i++) {
    const codigo = data[i][0];
    const partido = data[i][1];
    const votos = data[i][2];
    
    if (!codigo) problemas.push(`Fila ${i+1}: Sin código`);
    if (!partido) problemas.push(`Fila ${i+1}: Sin partido`);
    if (votos === '' || votos === null) problemas.push(`Fila ${i+1}: Sin votos`);
  }
  
  const ui = SpreadsheetApp.getUi();
  
  if (problemas.length === 0) {
    ui.alert('✅ Integridad', 'Todos los datos están correctos', ui.ButtonSet.OK);
  } else {
    ui.alert('⚠️ Problemas encontrados', problemas.slice(0, 10).join('\n'), ui.ButtonSet.OK);
  }
}
