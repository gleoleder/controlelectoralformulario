# 🗳️ SISTEMA DE LLENADO DE DATOS ELECTORALES

## Control Electoral Georreferenciado · Subnacionales Bolivia 2026

---

![Innovación Humana](innovacion-humana.webp)

---

## 📋 DESCRIPCIÓN

Sistema completo de **llenado de datos** para el Control Electoral Georreferenciado de las Elecciones Subnacionales Municipales de Bolivia 2026.

### ✨ Características Principales

- 🗺️ **Mapa interactivo** con 5,741 recintos electorales
- 📊 **Llenado por mesas** (automáticamente detecta cuántas mesas tiene cada recinto)
- 🎨 **Candidatos predeterminados** con colores oficiales
- 🔢 **Cálculo automático** de totales sumando todas las mesas
- 📸 **Subida de fotos** de actas mediante links
- 💾 **Guardado en Google Sheets** en tiempo real
- 🔄 **Sincronización** con sistema de visualización
- 📱 **Responsive** - funciona en desktop, tablet y móvil

---

## 📦 ARCHIVOS INCLUIDOS

```
📁 Sistema-Llenado-Electoral/
├── 📄 README.md                    ← Este archivo
├── 📄 GUIA_IMPLEMENTACION.md       ← Guía detallada de uso
├── 📄 index.html                   ← Página principal
├── 📄 styles.css                   ← Estilos (paleta IH)
├── 📄 script.js                    ← Lógica y conexión
├── 📄 GoogleAppsScript.gs          ← Código para Google Sheets
├── 📄 data.js                      ← 5,741 recintos
└── 📄 innovacion-humana.webp       ← Logo
```

---

## 🚀 INICIO RÁPIDO

### 1. Preparar archivos

Descarga todos los archivos y colócalos en la misma carpeta.

### 2. Configurar Google Sheet

Tu Google Sheet debe tener **3 hojas** con estos nombres exactos:

- `Resultados` - Almacena los votos
- `Fotos` - Almacena las URLs de fotos de actas
- `Candidatos` - Lista de candidatos (opcional)

**Publicar la sheet:**
1. Archivo → Compartir → Publicar en la web
2. Seleccionar "Documento completo"
3. Click "Publicar"

### 3. Implementar Google Apps Script

Sigue las instrucciones en `GoogleAppsScript.gs`:

1. Abre tu Google Sheet
2. Extensiones → Apps Script
3. Pega el código de `GoogleAppsScript.gs`
4. Implementar → Nueva implementación → Aplicación web
5. Copia la URL generada
6. Pégala en `llenado-script.js` línea 280

### 4. Abrir el sistema

Abre `index.html` en tu navegador. ¡Listo!

---

## 💡 CÓMO USAR

### Flujo de trabajo

1. **Busca un recinto** usando:
   - Filtros por departamento
   - Búsqueda por código/nombre
   - Click directo en el mapa

2. **Llena los datos por mesa:**
   - Si el recinto tiene 3 mesas, verás 3 pestañas
   - Ingresa votos de cada candidato
   - Agrega foto(s) del acta

3. **Verifica el resumen:**
   - El sistema suma automáticamente
   - Muestra totales y porcentajes

4. **Guarda:**
   - Click en "💾 Guardar Datos"
   - Los datos se envían a Google Sheets

---

## 🎨 CANDIDATOS PREDETERMINADOS

El sistema incluye **18 partidos** con sus colores oficiales:

| Partido | Nombre | Color |
|---------|--------|-------|
| IH | Innovación Humana | 🟣 #8B5CF6 |
| MAS-IPSP | MAS-IPSP | 🔵 #1E3A8A |
| CC | Comunidad Ciudadana | 🟠 #F97316 |
| CREEMOS | Creemos | 🟢 #15803D |
| FPV | FPV | 🔴 #DC2626 |
| PDC | PDC | 🟤 #07626B |
| MTS | MTS | 🔵 #0891B2 |
| ASP | ASP | 🟠 #E8532E |
| SOL.BO | SOL.BO | 🟡 #F59E0B |
| PAN-BOL | PAN-BOL | 🔴 #BE185D |
| ... | ... | ... |

**Agregar más partidos:**
Edita `script.js` línea 10.

---

## 📊 CÁLCULO AUTOMÁTICO

### Ejemplo real:

```
Recinto: 2954.1 (3 mesas)

Mesa 1:  IH=50, MAS=30, CC=20
Mesa 2:  IH=45, MAS=35, CC=25  
Mesa 3:  IH=60, MAS=28, CC=22
─────────────────────────────────
TOTAL:   IH=155 (56.4%)
         MAS=93 (33.8%)
         CC=67 (24.4%)
```

El sistema guarda en Google Sheets **los totales**, no los datos por mesa individual (a menos que modifiques el código).

---

## 📸 SUBIDA DE FOTOS

### Opción 1: Google Drive (Recomendado)

```
1. Sube la foto a Google Drive
2. Click derecho → Compartir
3. "Cualquier persona con el enlace"
4. Copia el ID del enlace
5. Formato: https://drive.google.com/uc?id=ID_AQUI
```

### Opción 2: Imgur u otro hosting

Sube la imagen y copia el link directo (.jpg, .png, etc.)

---

## 🎯 ESTADOS DE RECINTOS

Los puntos en el mapa tienen 3 colores:

- 🟢 **Verde** = Completado (todas las mesas con votos y fotos)
- 🟡 **Amarillo** = Parcial (algunas mesas con datos)
- 🟣 **Morado** = Pendiente (sin datos)

---

## 📱 COMPATIBLE CON MÓVILES

El sistema es **100% responsive**:

- Desktop: panel lateral fijo
- Tablet: panel lateral ajustable
- Móvil: menú hamburguesa

---

## 🔧 CONFIGURACIÓN AVANZADA

### Cambiar Google Sheet ID

Edita `script.js` línea 6:
```javascript
const SHEET_ID = 'TU_NUEVO_SHEET_ID';
```

### Agregar validaciones

Puedes agregar validaciones en la función `guardarDatos()` antes de enviar:

```javascript
// Ejemplo: validar que suma de votos no exceda habilitados
const totalVotos = Object.values(votosTotales).reduce((a,b) => a+b, 0);
if (totalVotos > recintoActual.h) {
  showToast('⚠️ Los votos exceden los habilitados', 'warning');
  return;
}
```

---

## 📖 DOCUMENTACIÓN COMPLETA

Lee `GUIA_IMPLEMENTACION.md` para:

- Instrucciones detalladas de instalación
- Explicación de cada componente
- Troubleshooting
- Mejoras sugeridas
- FAQ

---

## ⚠️ IMPORTANTE

### Guardado Real

**POR DEFECTO**, el sistema guarda datos **solo en memoria local** (para testing).

Para guardado real en Google Sheets:
1. Implementa `GoogleAppsScript.gs` (instrucciones incluidas)
2. Configura `WEB_APP_URL` en `script.js`

### Seguridad

- ⚠️ Este sistema NO tiene autenticación
- ⚠️ Cualquiera con acceso puede llenar datos
- ⚠️ No hay control de duplicados por defecto
- ⚠️ Implementa autenticación para producción

---

## 🔄 SINCRONIZACIÓN CON SISTEMA VISUAL

Los datos guardados aquí se leen **automáticamente** por el sistema de visualización:

1. Sistema de llenado → escribe en Google Sheets
2. Google Sheets → almacena datos
3. Sistema visual → lee y muestra datos

**Ambos sistemas usan el mismo Google Sheet.**

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### No carga recintos
- Verifica que `data.js` esté presente
- Abre la consola del navegador (F12)

### No guarda en Google Sheets
- Confirma que implementaste Google Apps Script
- Verifica que `WEB_APP_URL` esté configurada
- Revisa permisos de la Web App

### Fotos no se muestran
- URLs deben ser públicas
- Formato correcto de Google Drive

### Sheet no se actualiza
- Debe estar publicada en la web
- Verifica el SHEET_ID

---

## 📞 SOPORTE

Para reportar problemas:
1. Revisa la consola del navegador (F12)
2. Consulta `GUIA_IMPLEMENTACION.md`
3. Verifica la configuración de Google Apps Script

---

## 📊 ESTADÍSTICAS

**Sistema cubre:**
- 🗳️ 5,741 recintos electorales
- 🏛️ 343 municipios
- 🌎 9 departamentos
- 👥 Millones de votantes

---

## ✨ MEJORAS FUTURAS

Ideas para expandir el sistema:

- [ ] Autenticación de usuarios
- [ ] Validación de totales vs habilitados
- [ ] Historial de cambios
- [ ] Notificaciones en tiempo real
- [ ] Dashboard de estadísticas
- [ ] Exportar reportes PDF
- [ ] Modo offline
- [ ] Control de calidad automático

---

## 📄 LICENCIA

Desarrollado para **Innovación Humana** · Elecciones Subnacionales Bolivia 2026

---

## 🙏 CRÉDITOS

- **Diseño:** Paleta de colores Innovación Humana
- **Datos:** Padrón Electoral OEP/TSE Bolivia
- **Mapas:** Leaflet.js + OpenStreetMap
- **Backend:** Google Sheets + Apps Script

---

**¿Listo para empezar?** 🚀

1. Lee `GUIA_IMPLEMENTACION.md`
2. Configura Google Apps Script
3. Abre `index.html`
4. ¡Empieza a llenar datos!

---

*Sistema de Control Electoral · Innovación Humana 2026*
