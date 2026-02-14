# 🗳️ SISTEMA DE LLENADO DE DATOS ELECTORALES

## Control Electoral Georreferenciado · Subnacionales Bolivia 2026

---

![Innovación Humana](innovacion-humana.webp)

---

## 🎯 DOS VERSIONES DISPONIBLES

Este sistema viene en **2 versiones** según tus necesidades de seguridad:

| Característica | Versión Básica | Versión OAuth ⭐ |
|----------------|----------------|------------------|
| **Archivo JS** | `script.js` | `script-oauth.js` |
| **Autenticación** | No requiere | Login con Google |
| **Seguridad** | Baja (API Key pública) | Alta (OAuth 2.0) |
| **Control de acceso** | Cualquiera puede usar | Solo usuarios autorizados |
| **Auditoría** | Sistema anónimo | Registra usuario en cada acción |
| **Configuración** | 5 minutos | 20 minutos |
| **Recomendado para** | Testing rápido | Producción real |

---

## 🚀 VERSIÓN 1: BÁSICA (RÁPIDA)

### Características
- ✅ Funciona inmediatamente
- ✅ Solo necesitas configurar Google Sheets
- ✅ Ideal para pruebas y desarrollo
- ⚠️ No tiene control de usuarios

### Cómo usar

1. **Usa estos archivos:**
   - `index.html` (sin modificar)
   - `script.js` (versión básica)
   - Comenta las líneas de Google OAuth en `index.html`

2. **Configura Google Sheets:**
   - Lee: `CONFIGURACION_SHEETS.md`
   - Publica la sheet
   - Llena la hoja "Candidatos"

3. **Abre `index.html`**
   - ¡Listo para usar!

### Limitaciones

- ❌ Cualquiera con acceso al archivo puede modificar datos
- ❌ No se registra quién hizo cambios
- ❌ API Key visible en el código

---

## 🔐 VERSIÓN 2: CON OAUTH (RECOMENDADA) ⭐

### Características
- ✅ **Login obligatorio** con cuenta de Google
- ✅ **Solo usuarios autorizados** pueden acceder
- ✅ **Registra quién hace cada cambio** (email en Log)
- ✅ **Tokens seguros** que expiran automáticamente
- ✅ **Pantalla de login profesional**

### Cómo usar

1. **Usa estos archivos:**
   - `index.html` (con Google OAuth scripts)
   - `script-oauth.js` ← **Usa este**
   - `styles.css` (con estilos de login)

2. **Configura Google Cloud (20 min):**
   - Lee: `CONFIGURACION_OAUTH.md` (paso a paso completo)
   - Crea proyecto en Google Cloud
   - Habilita Google Sheets API
   - Configura OAuth (CLIENT_ID)
   - Agrega usuarios autorizados

3. **Configura Google Sheets:**
   - Lee: `CONFIGURACION_SHEETS.md`
   - Comparte sheet con usuarios autorizados
   - Publica la sheet

4. **Abre `index.html`**
   - Verás pantalla de login
   - Inicia sesión con Google
   - ¡Sistema completo!

### Ventajas

- ✅ **Seguro para producción**
- ✅ **Auditoría completa**
- ✅ **Control granular** de permisos
- ✅ **Profesional**

---

## 📦 ARCHIVOS INCLUIDOS

```
Sistema-Llenado-Electoral/
├── 📄 index.html                     # Interfaz principal
├── 📄 styles.css                     # Estilos (incluye login)
│
├── 📄 script.js                      # ⚡ VERSIÓN BÁSICA
├── 📄 script-oauth.js                # 🔐 VERSIÓN OAUTH ⭐
│
├── 📄 data.js                        # 5,741 recintos
├── 📄 innovacion-humana.webp         # Logo
│
├── 📄 README.md                      # Este archivo
├── 📄 INICIO_RAPIDO.md               # Guía rápida (15 min)
├── 📄 CONFIGURACION_SHEETS.md        # Configurar Google Sheets
├── 📄 CONFIGURACION_OAUTH.md         # 🔐 Configurar OAuth
└── 📄 CANDIDATOS_EJEMPLO.csv         # Plantilla candidatos
```

---

## 🎯 ¿QUÉ VERSIÓN USAR?

### Usa VERSIÓN BÁSICA si:
- ✅ Solo quieres probar el sistema
- ✅ Es para uso personal
- ✅ No te importa la seguridad
- ✅ Quieres configurar en 5 minutos

### Usa VERSIÓN OAUTH si:
- ✅ Es para producción real
- ✅ Múltiples usuarios llenarán datos
- ✅ Necesitas saber quién modificó qué
- ✅ Requieres control de acceso
- ✅ Datos son sensibles/oficiales

**Recomendación:** Para elecciones reales → **VERSIÓN OAUTH**

---

## 🔄 CAMBIAR ENTRE VERSIONES

### De Básica a OAuth

1. Edita `index.html` línea final:
   ```html
   <!-- Cambia esto: -->
   <script src="script.js"></script>
   
   <!-- Por esto: -->
   <script src="script-oauth.js"></script>
   ```

2. Agrega Google OAuth scripts en `<head>`:
   ```html
   <script src="https://apis.google.com/js/api.js" onload="gapiLoaded()"></script>
   <script src="https://accounts.google.com/gsi/client" onload="gisLoaded()"></script>
   ```

3. Configura OAuth (lee `CONFIGURACION_OAUTH.md`)

### De OAuth a Básica

1. Edita `index.html` línea final:
   ```html
   <script src="script.js"></script>
   ```

2. Quita pantalla de login del HTML

---

## ✨ CARACTERÍSTICAS COMUNES (Ambas versiones)

### 🗺️ Mapa Interactivo
- 5,741 recintos electorales
- Colores por estado (🟢 Completado, 🟡 Parcial, 🟣 Pendiente)
- Filtros por departamento
- Búsqueda por código/nombre

### 📊 Llenado Inteligente
- Detecta automáticamente número de mesas
- Carga candidatos dinámicamente por municipio
- Calcula totales sumando todas las mesas
- Valida datos antes de guardar

### 💾 Guardado en Google Sheets
- Escribe directamente en Google Sheets API
- Hoja "Resultados": totales por partido
- Hoja "Fotos": URLs por mesa
- Hoja "Log": auditoría de cambios

### 🎨 Candidatos Dinámicos
- Se cargan desde Google Sheets hoja "Candidatos"
- Diferentes candidatos por municipio
- Sin necesidad de editar código

---

## 📊 ESTRUCTURA DE GOOGLE SHEETS

Ambas versiones usan la misma estructura:

### Hoja "Candidatos" ⭐
```
municipio | partido | candidato | cargo | color | orden
La Paz    | IH      | I. Arias  | Alcalde| #8B5CF6| 1
La Paz    | MAS-IPSP| D. Apaza  | Alcalde| #1E3A8A| 2
```

### Hoja "Resultados"
```
codigo | municipio | partido | candidato | votos | porcentaje | timestamp
2954.1 | La Paz    | IH      | I. Arias  | 155   | 56.4       | 2026-03-08
```

### Hoja "Fotos"
```
codigo | mesa   | url_foto                | timestamp        | usuario
2954.1 | Mesa 1 | https://drive.google... | 2026-03-08 18:30 | user@gmail.com
```

### Hoja "Log"
```
timestamp        | codigo | accion   | usuario           | detalles
2026-03-08 18:30 | 2954.1 | GUARDADO | user@gmail.com    | 3 resultados, 3 fotos
2026-03-08 18:30 | 2954.1 | GUARDADO | Sistema Anónimo   | 3 resultados (versión básica)
```

**Diferencia:** 
- Versión OAuth → Registra email del usuario
- Versión Básica → Registra "Sistema Anónimo"

---

## 🚀 INICIO RÁPIDO

### Opción 1: Versión Básica (5 minutos)

1. Lee: `INICIO_RAPIDO.md`
2. Configura Google Sheets
3. Abre `index.html`
4. ¡Funciona!

### Opción 2: Versión OAuth (20 minutos)

1. Lee: `CONFIGURACION_OAUTH.md`
2. Configura Google Cloud (OAuth)
3. Configura Google Sheets
4. Abre `index.html`
5. Inicia sesión
6. ¡Funciona de forma segura!

---

## 📸 CAPTURAS

### Versión Básica
- Abre directo al mapa
- Sin pantalla de login
- Comienza a trabajar inmediatamente

### Versión OAuth
- Pantalla de login profesional
- Logo de Innovación Humana
- Botón "Iniciar sesión con Google"
- Header muestra email del usuario
- Botón de cerrar sesión

---

## 🔧 CONFIGURACIÓN

### API Key (ambas versiones)
```javascript
const API_KEY = 'AIzaSyAOhGTjJXHhuUhqf1g2DPCla59xNzftb-Q';
```

### Sheet ID (ambas versiones)
```javascript
const SHEET_ID = '1FX9nniq3Caw6GEq-x1SWOvgrjQ5bchEaxGVxOxTvJgA';
```

### Client ID (solo OAuth)
```javascript
const CLIENT_ID = 'TU-CLIENT-ID.apps.googleusercontent.com';
```

---

## 📱 RESPONSIVE

Ambas versiones funcionan en:
- 💻 Desktop (óptimo)
- 📱 Tablets
- 📱 Móviles

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### Versión Básica

**No guarda datos:**
- Verifica API Key
- Confirma que Sheet esté publicada

**No carga candidatos:**
- Revisa hoja "Candidatos" existe
- Verifica nombres de municipios

### Versión OAuth

**No aparece botón de login:**
- Revisa consola (F12)
- Verifica CLIENT_ID configurado

**Error al iniciar sesión:**
- Confirma usuario en "Usuarios de prueba"
- Revisa permisos en Google Cloud

**Común a ambas:**

**Fotos no se ven:**
- URL debe ser pública

**Mapa no carga:**
- Verifica archivo `data.js` presente

---

## 📊 COMPARACIÓN TÉCNICA

| Aspecto | Básica | OAuth |
|---------|--------|-------|
| Lectura de Sheets | ✅ API Key | ✅ OAuth Token |
| Escritura en Sheets | ✅ API Key (pública) | ✅ OAuth Token (seguro) |
| Autenticación | ❌ No | ✅ Google OAuth 2.0 |
| Registro de usuario | ❌ Anónimo | ✅ Email registrado |
| Tokens | N/A | Expiran automáticamente |
| Configuración | 5 min | 20 min |
| Seguridad | Baja | Alta |

---

## 🎓 CAPACITACIÓN

### Para Versión Básica
1. Abre el sistema
2. Busca recinto
3. Llena datos
4. Guarda
5. ¡Listo!

### Para Versión OAuth
1. Abre el sistema
2. **Inicia sesión** con Google
3. Busca recinto
4. Llena datos
5. Guarda
6. Cierra sesión (opcional)

---

## ✅ RECOMENDACIONES

### Para Testing/Desarrollo
- ✅ Usa **Versión Básica**
- ✅ Configura rápido
- ✅ Prueba funcionalidades

### Para Producción
- ✅ Usa **Versión OAuth**
- ✅ Configura correctamente
- ✅ Agrega solo usuarios autorizados
- ✅ Monitorea el Log

### Para Máxima Seguridad
- ✅ Versión OAuth
- ✅ Revisa quién accede regularmente
- ✅ Rota tokens cada 30 días
- ✅ Backups diarios de Google Sheets

---

## 📞 SOPORTE

**Documentación:**
- `README.md` → Este archivo
- `INICIO_RAPIDO.md` → Guía rápida
- `CONFIGURACION_SHEETS.md` → Configurar base de datos
- `CONFIGURACION_OAUTH.md` → Configurar OAuth

**Problemas comunes:**
- Revisa consola (F12)
- Lee documentación específica
- Verifica configuración paso a paso

---

## 🏆 MEJORES PRÁCTICAS

1. **Empieza con Versión Básica** para familiarizarte
2. **Migra a OAuth** antes de producción
3. **Capacita al equipo** con ambas versiones
4. **Haz backups** de Google Sheets diariamente
5. **Monitorea el Log** para detectar anomalías

---

## 📈 ESTADÍSTICAS

**Sistema cubre:**
- 🗳️ 5,741 recintos electorales
- 🏛️ 343 municipios
- 🌎 9 departamentos
- 👥 Millones de votantes

**Capacidad:**
- 📊 50+ operadores simultáneos
- 💾 Guardado en tiempo real
- 🔄 Sincronización automática

---

## 🎯 PRÓXIMOS PASOS

1. **Lee la documentación** correspondiente a tu versión
2. **Configura el sistema** siguiendo los pasos
3. **Prueba con datos de ejemplo**
4. **Capacita a tu equipo**
5. **¡Empieza a llenar datos reales!**

---

*Sistema de Control Electoral · Innovación Humana 2026*

**Versiones disponibles:**
- ⚡ Básica (rápida, para testing)
- 🔐 OAuth (segura, para producción)

**¡Tú eliges según tus necesidades!**
