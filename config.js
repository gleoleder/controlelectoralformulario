// ╔════════════════════════════════════════════════════════════════════════════╗
// ║                    ARCHIVO DE CONFIGURACIÓN - config.js                      ║
// ║              Sistema de Control Electoral · Subnacionales 2026              ║
// ║                          Innovación Humana                                   ║
// ║                                                                              ║
// ║  Este archivo contiene todas las configuraciones necesarias para conectar   ║
// ║  el sistema con Google Sheets. Aquí se definen:                             ║
// ║  - ID del documento de Google Sheets                                        ║
// ║  - Credenciales de la API de Google                                         ║
// ║  - Nombres de las 3 hojas que componen la base de datos                     ║
// ╚════════════════════════════════════════════════════════════════════════════╝

const CONFIG = {
    
    // ══════════════════════════════════════════════════════════════════════════
    // ID DEL DOCUMENTO DE GOOGLE SHEETS
    // ══════════════════════════════════════════════════════════════════════════
    // Este ID se encuentra en la URL de tu Google Sheet:
    // https://docs.google.com/spreadsheets/d/[ESTE_ES_EL_ID]/edit
    // ══════════════════════════════════════════════════════════════════════════
    GOOGLE_SHEET_ID: '1FX9nniq3Caw6GEq-x1SWOvgrjQ5bchEaxGVxOxTvJgA',
    
    // ══════════════════════════════════════════════════════════════════════════
    // CREDENCIALES DE GOOGLE API (LAS MISMAS QUE SURUBÍ)
    // ══════════════════════════════════════════════════════════════════════════
    // Estas credenciales se obtienen desde la consola de Google Cloud Platform.
    // CLIENT_ID: Identifica la aplicación ante Google
    // API_KEY: Clave para acceder a la API de Google Sheets
    // ══════════════════════════════════════════════════════════════════════════
    CLIENT_ID: '814005655098-8csk41qts3okv4b2fjnq7ls4qc2kq0vc.apps.googleusercontent.com',
    API_KEY: 'AIzaSyAOhGTjJXHhuUhqf1g2DPCla59xNzftb-Q',
    
    // ══════════════════════════════════════════════════════════════════════════
    // NOMBRES DE LAS 3 HOJAS DE LA BASE DE DATOS
    // ══════════════════════════════════════════════════════════════════════════
    // Estos nombres deben coincidir EXACTAMENTE con los nombres de las hojas
    // en tu documento de Google Sheets (incluyendo mayúsculas/minúsculas)
    //
    // RESULTADOS:  Votos por partido en cada recinto (codigo, partido, votos, color)
    // FOTOS:       URLs de fotos de actas (codigo, mesa, url_foto, timestamp)
    // CANDIDATOS:  Lista de candidatos por recinto (codigo, nombre, partido, cargo)
    // ══════════════════════════════════════════════════════════════════════════
    SHEETS: {
        RESULTADOS: 'Resultados',
        FOTOS: 'Fotos',
        CANDIDATOS: 'Candidatos'
    },
    
    // ══════════════════════════════════════════════════════════════════════════
    // CANDIDATOS PREDETERMINADOS CON COLORES OFICIALES
    // ══════════════════════════════════════════════════════════════════════════
    CANDIDATOS_PREDETERMINADOS: [
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
    ],
    
    // ══════════════════════════════════════════════════════════════════════════
    // GOOGLE API SCOPES Y DISCOVERY
    // ══════════════════════════════════════════════════════════════════════════
    SCOPES: 'https://www.googleapis.com/auth/spreadsheets',
    DISCOVERY_DOC: 'https://sheets.googleapis.com/$discovery/rest?version=v4'
};
