# 📝 SISTEMA DE LLENADO DE DATOS ELECTORALES
## Guía de Implementación Completa

---

## 🎯 RESUMEN DEL SISTEMA

Este es un sistema completo de **llenado de datos** para el Control Electoral Georreferenciado. Permite a los operadores:

✅ **Seleccionar recintos** en el mapa
✅ **Llenar datos por mesa** (cada recinto puede tener múltiples mesas)
✅ **Registrar votos** de candidatos predeterminados con sus colores
✅ **Subir fotos de actas** (mediante links)
✅ **Cálculo automático** de totales sumando todas las mesas
✅ **Guardar en Google Sheets** en tiempo real
✅ **Sincronización** con el sistema de visualización

---

## 📦 ARCHIVOS INCLUIDOS

```
📁 Sistema de Llenado
├── 📄 index.html           # Página principal
├── 📄 styles.css           # Estilos (paleta IH)
├── 📄 script.js            # Lógica y conexión a Sheets
├── 📄 data.js              # 5,741 recintos (mismo del sistema visual)
└── 📄 innovacion-humana.webp # Logo
```

---

## 🚀 INSTALACIÓN RÁPIDA

### 1. Preparar archivos
```bash
# Coloca todos los archivos en la misma carpeta:
index.html
styles.css
script.js
data.js  # (el mismo del sistema de visualización)
innovacion-humana.webp  # (el mismo logo)
```

### 2. Configurar Google Sheet

El sistema ya está configurado para usar tu sheet:
```
ID: 1FX9nniq3Caw6GEq-x1SWOvgrjQ5bchEaxGVxOxTvJgA
```

**IMPORTANTE:** La sheet debe estar **publicada en la web**:
1. Archivo → Compartir → Publicar en la web
2. Seleccionar "Documento completo"
3. Click en "Publicar"

### 3. Abrir el sistema

Simplemente abre `index.html` en tu navegador.

---

## 🎨 CARACTERÍSTICAS PRINCIPALES

### 1️⃣ Mapa Interactivo

- **Color según estado:**
  - 🟢 Verde = Completado (todas las mesas con votos y fotos)
  - 🟡 Amarillo = Parcial (algunas mesas con datos)
  - 🟣 Morado = Pendiente (sin datos)

- **Click en recinto** abre el formulario de llenado

### 2️⃣ Formulario por Mesas

Si un recinto tiene **3 mesas**, aparecen **3 pestañas**:
```
[Mesa 1 ✓] [Mesa 2 ●] [Mesa 3]
```
- ✓ = Mesa completa (votos + foto)
- ● = Mesa parcial (solo votos o solo foto)
- (vacío) = Mesa sin datos

### 3️⃣ Candidatos Predeterminados

El sistema incluye **18 candidatos/partidos** con sus colores oficiales:

| Partido | Color | HEX |
|---------|-------|-----|
| IH | 🟣 Violeta | #8B5CF6 |
| MAS-IPSP | 🔵 Azul oscuro | #1E3A8A |
| CC | 🟠 Naranja | #F97316 |
| CREEMOS | 🟢 Verde | #15803D |
| FPV | 🔴 Rojo | #DC2626 |
| PDC | 🟤 Teal | #07626B |
| ... | ... | ... |

### 4️⃣ Cálculo Automático

Al llenar los votos de cada mesa, el sistema:
1. **Suma automáticamente** los votos de todas las mesas
2. **Calcula porcentajes** en tiempo real
3. **Muestra resumen visual** con barra de colores
4. **Determina ganador** por recinto

Ejemplo:
```
Mesa 1: IH=50, MAS=30, CC=20
Mesa 2: IH=45, MAS=35, CC=25
Mesa 3: IH=60, MAS=28, CC=22
─────────────────────────────
TOTAL: IH=155 (56.4%), MAS=93 (33.8%), CC=67 (24.4%)
```

### 5️⃣ Subida de Fotos

**Opción 1: Google Drive (Recomendado)**

1. Sube la foto a Google Drive
2. Click derecho → Compartir → "Cualquier persona con el enlace"
3. Copia el ID del enlace
4. Convierte a formato público:
   ```
   Enlace original:
   https://drive.google.com/file/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ/view
   
   Formato para el sistema:
   https://drive.google.com/uc?id=1aBcDeFgHiJkLmNoPqRsTuVwXyZ
   ```

**Opción 2: Imgur u otro hosting**
- Sube la imagen a Imgur
- Copia el link directo (termina en .jpg, .png, etc.)
- Pega en el sistema

**Opción 3: Link directo**
- Cualquier URL pública de imagen

---

## 🔄 FLUJO DE TRABAJO

### Paso a Paso

1. **Abrir sistema** → `llenado.html`

2. **Buscar recinto:**
   - Filtrar por departamento
   - Buscar por código o nombre
   - Click en el punto del mapa

3. **Llenar datos por mesa:**
   ```
   Para cada mesa:
   ├── Ingresar votos de cada candidato
   ├── Agregar foto(s) del acta
   └── Pasar a siguiente mesa
   ```

4. **Verificar resumen:**
   - El sistema muestra totales automáticos
   - Verifica que los datos sean correctos

5. **Guardar:**
   - Click en "💾 Guardar Datos"
   - Los datos se envían a Google Sheets
   - El recinto cambia de color en el mapa

6. **Repetir** para otros recintos

---

## 📊 ESTRUCTURA DE DATOS EN GOOGLE SHEETS

### Hoja "Resultados"

El sistema guarda **una fila por cada partido con votos**:

| codigo | partido | votos | color |
|--------|---------|-------|-------|
| 2954.1 | IH | 155 | #8B5CF6 |
| 2954.1 | MAS-IPSP | 93 | #1E3A8A |
| 2954.1 | CC | 67 | #F97316 |

**NOTA:** Si un recinto tiene 3 mesas con votos de IH:
- Mesa 1: IH = 50
- Mesa 2: IH = 45
- Mesa 3: IH = 60

Se guarda **UNA sola fila**: `IH = 155` (la suma)

### Hoja "Fotos"

Una fila por cada foto:

| codigo | mesa | url_foto | timestamp |
|--------|------|----------|-----------|
| 2954.1 | Mesa 1 | https://... | 2026-03-08 18:30 |
| 2954.1 | Mesa 2 | https://... | 2026-03-08 18:35 |
| 2954.1 | Mesa 3 | https://... | 2026-03-08 18:40 |

### Hoja "Candidatos"

Esta hoja se llena **por separado** (no desde este sistema).
Contiene info de candidatos reales por recinto.

---

## ⚙️ CONFIGURACIÓN AVANZADA

### Agregar Más Candidatos

Edita `script.js`, línea 10:

```javascript
const CANDIDATOS_PREDETERMINADOS = [
  { partido: 'IH', nombre: 'Innovación Humana', color: '#8B5CF6' },
  { partido: 'TU_PARTIDO', nombre: 'Nombre Completo', color: '#HEXCOLOR' },
  // ... más candidatos
];
```

### Cambiar ID de Google Sheet

Edita `script.js`, línea 6:

```javascript
const SHEET_ID = 'TU_NUEVO_SHEET_ID_AQUI';
```

---

## 🔧 IMPLEMENTAR GUARDADO REAL

**CRÍTICO:** El sistema actual **simula** el guardado. 

Para implementar guardado real en Google Sheets:

### Opción 1: Google Apps Script (Recomendado)

1. **Crear Web App en Google Sheets:**
   ```javascript
   // En tu Google Sheet: Extensiones → Apps Script
   function doPost(e) {
     const data = JSON.parse(e.postData.contents);
     const ss = SpreadsheetApp.getActiveSpreadsheet();
     
     // Guardar Resultados
     const sheetResultados = ss.getSheetByName('Resultados');
     data.resultados.forEach(r => {
       sheetResultados.appendRow([r.codigo, r.partido, r.votos, r.color]);
     });
     
     // Guardar Fotos
     const sheetFotos = ss.getSheetByName('Fotos');
     data.fotos.forEach(f => {
       sheetFotos.appendRow([f.codigo, f.mesa, f.url_foto, f.timestamp]);
     });
     
     return ContentService.createTextOutput(
       JSON.stringify({success: true})
     ).setMimeType(ContentService.MimeType.JSON);
   }
   ```

2. **Desplegar como Web App:**
   - Implementar → Nueva implementación
   - Tipo: Aplicación web
   - Ejecutar como: Yo
   - Quién tiene acceso: Cualquier persona
   - Copiar la URL de la web app

3. **Actualizar `script.js`:**
   ```javascript
   async function guardarDatos() {
     // ... código existente ...
     
     const WEB_APP_URL = 'TU_URL_DE_APPS_SCRIPT_AQUI';
     
     const response = await fetch(WEB_APP_URL, {
       method: 'POST',
       body: JSON.stringify({
         resultados: resultados,
         fotos: fotos
       })
     });
     
     const result = await response.json();
     
     if (result.success) {
       showToast('✅ Datos guardados correctamente', 'success');
     }
   }
   ```

### Opción 2: Backend Propio

Crear un servidor que reciba los datos y los escriba en Google Sheets vía API.

---

## 📱 RESPONSIVO

El sistema funciona en:
- 💻 Desktop
- 📱 Tablets
- 📱 Móviles

En móvil:
- Panel lateral se oculta
- Botón hamburguesa para abrir filtros
- Modal ocupa pantalla completa

---

## 🎨 PERSONALIZACIÓN DE COLORES

Todo usa la paleta de Innovación Humana:

```css
:root {
  --ih-violet: #8B5CF6;
  --ih-cyan: #67E8F9;
  --bg: #FAF8FF;
  /* ... más variables en llenado-styles.css */
}
```

Para cambiar colores, edita estas variables en `styles.css`.

---

## 🔍 FILTROS DISPONIBLES

### 1. Búsqueda por texto
Busca por código o nombre de recinto en tiempo real.

### 2. Filtro por departamento
Muestra solo recintos del departamento seleccionado.

### 3. Filtro por estado
- ✅ Completado
- ⚠️ Parcial
- ⏳ Pendiente

---

## 📈 ESTADÍSTICAS EN TIEMPO REAL

En el header se muestran:
- **Recintos cargados:** Cuántos tienen datos completos
- **Pendientes:** Cuántos faltan por llenar
- **Estado de conexión:** Si está conectado a Google Sheets

---

## ⚠️ IMPORTANTE: VALIDACIONES

El sistema NO valida:
- ❌ Suma de votos vs. habilitados
- ❌ Duplicados (se puede llenar el mismo recinto varias veces)
- ❌ Formato de URLs de fotos

**Recomendación:** Implementar validaciones adicionales según tus necesidades.

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### No carga recintos
**Causa:** Falta `data.js`
**Solución:** Copia el archivo `data.js` del sistema de visualización

### No guarda en Google Sheets
**Causa:** Función de guardado simulada
**Solución:** Implementar guardado real (ver sección "Implementar Guardado Real")

### Fotos no se muestran
**Causa:** URL no es pública
**Solución:** Verificar que el link sea accesible sin login

### Sheet no se actualiza
**Causa:** No está publicada
**Solución:** Archivo → Publicar en la web

---

## 🔐 SEGURIDAD

### ⚠️ IMPORTANTE

Este sistema es de **solo lectura** desde Google Sheets (para cargar datos).

Para **escribir** en Sheets necesitas:
1. Implementar Google Apps Script (recomendado)
2. O usar Google Sheets API con autenticación

**NUNCA** expongas API keys en el código JavaScript del navegador.

---

## 📞 SOPORTE

Si tienes problemas:
1. Revisa la consola del navegador (F12)
2. Verifica que el Google Sheet esté publicado
3. Confirma que `data.js` contenga los 5,741 recintos

---

## ✨ MEJORAS FUTURAS SUGERIDAS

- [ ] Autenticación de usuarios
- [ ] Validación de totales vs habilitados
- [ ] Historial de cambios
- [ ] Exportar reportes
- [ ] Notificaciones push cuando se llena un recinto
- [ ] Dashboard de estadísticas agregadas
- [ ] Control de duplicados
- [ ] Modo offline con sincronización posterior

---

*Sistema desarrollado para Innovación Humana · Elecciones Subnacionales Bolivia 2026*
