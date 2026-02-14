# 🔐 CONFIGURACIÓN DE GOOGLE OAUTH
## Autenticación segura para el Sistema de Llenado Electoral

---

## 🎯 ¿QUÉ CAMBIA CON OAUTH?

### ✅ Antes (API Key pública)
- ❌ Cualquiera podía escribir en Google Sheets
- ❌ No había control de quién modificaba datos
- ❌ API Key visible en el código

### ✅ Ahora (OAuth 2.0)
- ✅ Usuario debe iniciar sesión con Google
- ✅ Solo usuarios autorizados pueden modificar
- ✅ Se registra quién hizo cada cambio
- ✅ Tokens de acceso seguros

---

## 📝 PASO A PASO: CONFIGURACIÓN DE GOOGLE CLOUD

### PASO 1: Crear Proyecto en Google Cloud (5 minutos)

1. Ve a: https://console.cloud.google.com/

2. **Crear nuevo proyecto:**
   - Click en el selector de proyecto (arriba izquierda)
   - Click "Nuevo proyecto"
   - Nombre: `Control Electoral 2026`
   - Click "Crear"

3. **Espera a que se cree** (30 segundos)

4. **Selecciona el proyecto** en el selector

---

### PASO 2: Habilitar APIs necesarias (3 minutos)

1. En el menú lateral → **APIs y servicios** → **Biblioteca**

2. Busca y habilita estas 2 APIs:
   
   **a) Google Sheets API**
   - Busca: "Google Sheets API"
   - Click en el resultado
   - Click **"Habilitar"**
   
   **b) Google Drive API** (opcional pero recomendado)
   - Busca: "Google Drive API"
   - Click en el resultado
   - Click **"Habilitar"**

---

### PASO 3: Crear credenciales OAuth (10 minutos)

#### 3.1 Configurar pantalla de consentimiento

1. Menú lateral → **APIs y servicios** → **Pantalla de consentimiento de OAuth**

2. Selecciona **"Externo"** → Click **"Crear"**

3. **Información de la aplicación:**
   ```
   Nombre de la aplicación: Control Electoral 2026
   Correo del usuario: tu-email@gmail.com
   Logo: (opcional - sube innovacion-humana.webp)
   ```

4. **Datos de contacto del desarrollador:**
   ```
   tu-email@gmail.com
   ```

5. Click **"Guardar y continuar"**

6. **Ámbitos (Scopes):**
   - Click **"Agregar o quitar ámbitos"**
   - Busca y selecciona:
     * `.../auth/spreadsheets` (Ver y gestionar hojas de cálculo)
     * `.../auth/userinfo.email` (Ver tu dirección de email)
   - Click **"Actualizar"**
   - Click **"Guardar y continuar"**

7. **Usuarios de prueba:**
   - Click **"+ Agregar usuarios"**
   - Agrega los emails de las personas que usarán el sistema:
     ```
     operador1@gmail.com
     operador2@gmail.com
     supervisor@gmail.com
     ```
   - Click **"Agregar"**
   - Click **"Guardar y continuar"**

8. **Resumen:**
   - Revisa la información
   - Click **"Volver al panel"**

#### 3.2 Crear ID de cliente OAuth

1. Menú lateral → **APIs y servicios** → **Credenciales**

2. Click **"+ Crear credenciales"** → **"ID de cliente de OAuth"**

3. **Tipo de aplicación:**
   ```
   Aplicación web
   ```

4. **Nombre:**
   ```
   Sistema de Llenado Electoral
   ```

5. **Orígenes de JavaScript autorizados:**
   
   **IMPORTANTE:** Agrega TODAS estas URLs:
   ```
   http://localhost
   http://127.0.0.1
   file://
   ```
   
   Si vas a publicar en un servidor, agrega también:
   ```
   https://tu-dominio.com
   ```

6. **URIs de redirección autorizados:**
   
   Agrega las mismas URLs:
   ```
   http://localhost
   http://127.0.0.1
   ```

7. Click **"Crear"**

8. **¡IMPORTANTE!** Aparecerá un modal con:
   ```
   ID de cliente: 1234567890-abcdefghijk.apps.googleusercontent.com
   Secreto del cliente: GOCSPX-xxxxxxxxxxxxxxx
   ```
   
   **COPIA EL "ID DE CLIENTE"** - lo necesitarás en el siguiente paso.

---

### PASO 4: Configurar el Sistema (2 minutos)

1. **Abre el archivo `script-oauth.js`**

2. **Línea 7** - Reemplaza el CLIENT_ID:
   ```javascript
   const CLIENT_ID = 'TU-CLIENT-ID-AQUI.apps.googleusercontent.com';
   ```
   
   **Ejemplo:**
   ```javascript
   const CLIENT_ID = '123456789-abc123def456.apps.googleusercontent.com';
   ```

3. **Guarda el archivo**

---

### PASO 5: Configurar permisos de Google Sheets (3 minutos)

1. **Abre tu Google Sheet:**
   ```
   https://docs.google.com/spreadsheets/d/1FX9nniq3Caw6GEq-x1SWOvgrjQ5bchEaxGVxOxTvJgA/
   ```

2. **Click en "Compartir"** (esquina superior derecha)

3. **Agrega los usuarios que configuraste en OAuth:**
   ```
   operador1@gmail.com → Puede editar
   operador2@gmail.com → Puede editar
   supervisor@gmail.com → Puede editar
   ```

4. **Asegúrate que esté configurado como:**
   - Puede editar (no solo comentar o ver)
   - Enviar notificación: ❌ (desmarcado)

5. Click **"Compartir"**

6. **IMPORTANTE:** También publica la sheet:
   - Archivo → Compartir → Publicar en la web
   - Seleccionar "Documento completo"
   - Click "Publicar"

---

## ✅ VERIFICACIÓN

### Test 1: Abrir el sistema

1. Abre `index.html` en tu navegador
2. Deberías ver la **pantalla de login** con:
   - Logo de Innovación Humana
   - Botón "Iniciar sesión con Google"

### Test 2: Iniciar sesión

1. Click en **"Iniciar sesión con Google"**
2. Selecciona tu cuenta de Google
3. **Aparecerá un aviso:** "Google no ha verificado esta aplicación"
   - Click en **"Avanzado"**
   - Click en **"Ir a Control Electoral 2026 (no seguro)"**
4. Selecciona los permisos:
   - ✅ Ver y gestionar hojas de cálculo
   - ✅ Ver tu dirección de email
5. Click **"Continuar"**

6. **¡Deberías ver el sistema completo!**
   - Mapa con recintos
   - Tu email en el header
   - Botón de cerrar sesión

### Test 3: Guardar datos

1. Click en un recinto
2. Llena algunos votos
3. Click **"Guardar"**
4. Ve a Google Sheets
5. **Verifica:**
   - ✅ Aparecen nuevas filas en "Resultados"
   - ✅ En la columna "usuario" aparece tu email

---

## 🔒 SEGURIDAD

### ¿Qué usuarios pueden acceder?

**Solo los usuarios agregados en "Usuarios de prueba"** pueden iniciar sesión.

Para agregar más usuarios:
1. Google Cloud Console
2. APIs y servicios → Pantalla de consentimiento
3. Usuarios de prueba → Agregar usuarios

### ¿Es seguro?

**SÍ**, porque:
- ✅ OAuth tokens se generan dinámicamente
- ✅ Tokens expiran automáticamente
- ✅ Solo funciona para usuarios autorizados
- ✅ Se registra quién hace cada cambio

### ¿Publicar en producción?

Para publicar públicamente:

1. Google Cloud Console
2. APIs y servicios → Pantalla de consentimiento
3. Click **"Publicar aplicación"**
4. Completar verificación de Google (proceso largo)

**Recomendación:** Para uso interno, déjalo en "Testing" y agrega solo usuarios autorizados.

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### Error: "redirect_uri_mismatch"

**Causa:** La URL desde donde abres el sistema no está en "Orígenes autorizados"

**Solución:**
1. Ve a Google Cloud Console → Credenciales
2. Click en tu ID de cliente OAuth
3. Agrega la URL exacta en "Orígenes de JavaScript autorizados"
4. Guarda y espera 5 minutos

### Error: "Access blocked: This app's request is invalid"

**Causa:** No configuraste la pantalla de consentimiento

**Solución:** Repite el Paso 3.1

### No aparece el botón de login

**Causa:** Las librerías de Google no cargaron

**Solución:**
- Verifica conexión a internet
- Abre la consola (F12) y revisa errores
- Asegúrate que `script-oauth.js` tenga el CLIENT_ID correcto

### Error: "Permission denied" al guardar

**Causa:** El usuario no tiene permisos en Google Sheets

**Solución:**
- Comparte la Sheet con el email del usuario
- Permiso: "Puede editar"

---

## 📊 MONITOREO

### Ver quién usa el sistema

En Google Sheets → Hoja "Log":
```
timestamp        | codigo | accion   | usuario
2026-03-08 18:30 | 2954.1 | GUARDADO | operador1@gmail.com
2026-03-08 18:45 | 2955.2 | GUARDADO | operador2@gmail.com
```

### Revisar accesos

Google Cloud Console → APIs y servicios → Tablero
- Verás cuántas solicitudes se hacen
- Qué usuarios acceden
- Errores si los hay

---

## 🎯 FLUJO COMPLETO DE AUTENTICACIÓN

```
USUARIO
  │
  ├─> Abre index.html
  │
  ▼
PANTALLA DE LOGIN
  │
  ├─> Click "Iniciar sesión con Google"
  │
  ▼
GOOGLE OAUTH
  │
  ├─> Usuario selecciona cuenta
  ├─> Acepta permisos
  ├─> Google genera token
  │
  ▼
SISTEMA CARGA
  │
  ├─> Lee candidatos de Sheets
  ├─> Lee datos existentes
  ├─> Muestra mapa
  │
  ▼
USUARIO LLENA DATOS
  │
  ├─> Click "Guardar"
  │
  ▼
GOOGLE SHEETS API
  │
  ├─> Verifica token válido
  ├─> Escribe en Sheets
  ├─> Registra usuario en Log
  │
  ▼
✅ DATOS GUARDADOS
```

---

## 📁 ARCHIVOS ACTUALIZADOS

```
Sistema-OAuth/
├── index.html              # Con pantalla de login
├── script-oauth.js         # ⭐ NUEVO: Con OAuth
├── styles.css              # Con estilos de login
├── data.js                 # Sin cambios
└── innovacion-humana.webp  # Sin cambios
```

---

## 🎓 CAPACITAR AL EQUIPO

Instrucciones para operadores:

1. **Abrir el sistema**
   - URL: `file:///ruta/al/index.html`
   - O si está en servidor: `https://tu-dominio.com`

2. **Iniciar sesión**
   - Click "Iniciar sesión con Google"
   - Usar su email autorizado
   - Aceptar permisos (solo la primera vez)

3. **Trabajar normalmente**
   - Llenar datos
   - Guardar
   - El sistema registra automáticamente su email

4. **Cerrar sesión**
   - Click en el botón de logout (arriba derecha)
   - O simplemente cerrar el navegador

---

## ⚠️ IMPORTANTE: LÍMITES DE GOOGLE

### Cuotas de Google Sheets API

- **Lecturas:** 100 solicitudes/100 segundos/usuario
- **Escrituras:** 100 solicitudes/100 segundos/usuario

**Para este sistema:** Alcanza perfectamente para 50+ operadores simultáneos.

### Si excedes las cuotas

Google devuelve error 429. El sistema debe esperar y reintentar.

---

## ✅ CHECKLIST FINAL

Antes de usar en producción:

- [ ] Proyecto creado en Google Cloud
- [ ] Google Sheets API habilitada
- [ ] Pantalla de consentimiento configurada
- [ ] Usuarios de prueba agregados
- [ ] ID de cliente OAuth creado
- [ ] CLIENT_ID configurado en script-oauth.js
- [ ] Google Sheet compartido con usuarios
- [ ] Google Sheet publicado en la web
- [ ] Test de login exitoso
- [ ] Test de guardado exitoso
- [ ] Email aparece en hoja "Log"

---

## 🚀 VENTAJAS DE OAUTH

1. **Seguridad:** Solo usuarios autorizados
2. **Auditoría:** Sabes quién modificó qué
3. **Escalable:** Agrega usuarios fácilmente
4. **Profesional:** Experiencia de login estándar
5. **Sin contraseñas:** Google maneja la autenticación

---

## 📞 SOPORTE

Si tienes problemas:
1. Revisa la consola del navegador (F12)
2. Verifica que el CLIENT_ID sea correcto
3. Confirma que el usuario esté en "Usuarios de prueba"
4. Revisa que la Sheet esté compartida con el usuario

---

*Sistema de Control Electoral · Innovación Humana 2026*
