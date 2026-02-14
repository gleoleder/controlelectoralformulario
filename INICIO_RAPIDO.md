# 🚀 GUÍA DE INICIO RÁPIDO
## Sistema de Llenado Electoral - Paso a Paso

---

## ⏱️ TIEMPO ESTIMADO: 15 MINUTOS

Sigue estos pasos en orden para tener el sistema 100% funcional.

---

## 📝 PASO 1: CONFIGURAR GOOGLE SHEETS (5 minutos)

### 1.1 Abrir tu Google Sheet

Ve a: https://docs.google.com/spreadsheets/d/1FX9nniq3Caw6GEq-x1SWOvgrjQ5bchEaxGVxOxTvJgA/

### 1.2 Crear las 4 hojas necesarias

**Click en "+" al lado de las pestañas** y crea estas hojas con nombres EXACTOS:

1. `Resultados`
2. `Fotos`
3. `Candidatos`
4. `Log`

### 1.3 Agregar encabezados

**En la hoja "Resultados"** (fila 1):
```
codigo | municipio | partido | candidato | votos | porcentaje | timestamp
```

**En la hoja "Fotos"** (fila 1):
```
codigo | mesa | url_foto | timestamp | usuario
```

**En la hoja "Candidatos"** (fila 1):
```
municipio | partido | candidato | cargo | color | orden
```

**En la hoja "Log"** (fila 1):
```
timestamp | codigo | accion | usuario | detalles
```

### 1.4 Importar candidatos de ejemplo

1. Abre el archivo `CANDIDATOS_EJEMPLO.csv`
2. Selecciona todo (Ctrl+A) y copia
3. Ve a la hoja "Candidatos" de Google Sheets
4. Pega en la celda A1
5. Datos → Dividir texto en columnas
6. **¡Listo!** Ahora tienes candidatos de ejemplo para 20+ municipios

**💡 Importante:** Reemplaza estos datos con tus candidatos reales más adelante.

### 1.5 Publicar la sheet

1. **Archivo → Compartir → Publicar en la web**
2. Seleccionar: "Documento completo"
3. Formato: "Página web"
4. Click **"Publicar"**
5. Confirmar

✅ Tu Google Sheet está lista!

---

## 🔑 PASO 2: VERIFICAR API KEY (2 minutos)

### 2.1 Probar conexión

1. Abre cualquier navegador
2. Presiona **F12** para abrir la consola
3. Pega este código:

```javascript
fetch('https://sheets.googleapis.com/v4/spreadsheets/1FX9nniq3Caw6GEq-x1SWOvgrjQ5bchEaxGVxOxTvJgA/values/Candidatos?key=AIzaSyAOhGTjJXHhuUhqf1g2DPCla59xNzftb-Q')
  .then(r => r.json())
  .then(d => console.log(d))
```

4. Presiona **Enter**

**✅ Funciona si ves:**
```json
{
  "values": [
    ["municipio", "partido", "candidato", ...],
    ["La Paz", "IH", "Iván Arias", ...]
  ]
}
```

**❌ Error 403?** → Tu sheet no está publicada (revisa paso 1.5)

**❌ Error 404?** → Nombre de hoja incorrecto (debe ser "Candidatos" exacto)

---

## 💻 PASO 3: ABRIR EL SISTEMA (1 minuto)

### 3.1 Descargar archivos

Asegúrate de tener todos estos archivos en la misma carpeta:

```
📁 Mi-Carpeta/
├── index.html
├── styles.css
├── script.js
├── data.js
├── innovacion-humana.webp
└── README.md
```

### 3.2 Abrir

1. **Doble click** en `index.html`
2. O **click derecho** → Abrir con → Chrome/Firefox/Edge

**✅ Deberías ver:**
- Logo de Innovación Humana
- Mapa con puntos morados
- Panel lateral con filtros
- Mensaje: "5,741 recintos"

---

## ✅ PASO 4: VERIFICAR FUNCIONAMIENTO (5 minutos)

### Test 1: Mapa carga correctamente

✅ Ves 5,741 puntos morados en el mapa
✅ Puedes hacer zoom in/out
✅ Filtros por departamento funcionan

### Test 2: Candidatos cargan

1. Click en cualquier punto del mapa en La Paz
2. Abre el formulario
3. **Verifica:** ¿Ves "Iván Arias" y otros candidatos de La Paz?

✅ **SÍ** → Los candidatos cargan correctamente
❌ **NO** → Revisa la consola (F12) para ver errores

### Test 3: Llenado funciona

1. Abre un recinto
2. Ingresa algunos votos (ej: IH=50, MAS=30)
3. Agrega una foto de prueba:
   ```
   https://via.placeholder.com/600x400.png?text=Acta+Mesa+1
   ```
4. Click **"💾 Guardar Datos"**

**✅ Funciona si:**
- Ves mensaje "Datos guardados correctamente"
- El punto en el mapa cambia de color
- En Google Sheets aparecen nuevas filas

### Test 4: Verificar Google Sheets

1. Ve a tu Google Sheet
2. Hoja "Resultados" → **¿Hay nueva fila con el recinto que llenaste?**
3. Hoja "Fotos" → **¿Está la URL de la foto?**
4. Hoja "Log" → **¿Hay registro de la operación?**

✅ **TODO OK** → ¡Sistema funcionando al 100%!

---

## 🎯 PASO 5: EMPEZAR A USAR (2 minutos)

### 5.1 Flujo de trabajo recomendado

**Para llenar datos reales:**

1. **Organiza tu equipo:**
   - Asigna departamentos/municipios a cada persona
   - Prepara las fotos de actas con anticipación

2. **Prepara las URLs de fotos:**
   - Sube todas las actas a Google Drive
   - Comparte con "Cualquiera con el enlace"
   - Copia los IDs en un documento

3. **Llena datos:**
   - Filtra por tu departamento
   - Busca el recinto por código
   - Llena mesa por mesa
   - Agrega fotos
   - Guarda

4. **Verifica:**
   - Revisa que el punto cambió de color
   - Confirma en Google Sheets
   - Pasa al siguiente recinto

### 5.2 Atajos útiles

- **Tab** → Pasar al siguiente campo
- **Ctrl + F** → Buscar recinto rápido
- **ESC** → Cerrar modal
- **🔄 Actualizar desde Sheet** → Recargar datos

---

## 🎨 PASO 6: PERSONALIZAR (Opcional)

### Cambiar colores de partidos

Edita la hoja "Candidatos" en Google Sheets:

```
municipio | partido | candidato | cargo | color    | orden
La Paz    | IH      | Candidato | Alcalde | #8B5CF6 | 1
```

Cambia el valor de la columna "color" a tu preferencia.

### Agregar más candidatos

Simplemente agrega más filas en la hoja "Candidatos":

```
Municipio Nuevo | PARTIDO-X | Nombre | Alcalde | #FF5733 | 1
Municipio Nuevo | PARTIDO-Y | Nombre | Alcalde | #33FF57 | 2
```

**El sistema los cargará automáticamente** al abrir un recinto de ese municipio.

---

## 🐛 SOLUCIÓN RÁPIDA DE PROBLEMAS

| Problema | Solución |
|----------|----------|
| No carga el mapa | Verifica que `data.js` esté en la carpeta |
| Error 403 al leer candidatos | Publica la sheet (Paso 1.5) |
| Candidatos predeterminados | Agrega el municipio en la hoja "Candidatos" |
| No guarda en Sheets | Verifica API Key y Sheet ID en `script.js` |
| Fotos no se ven | La URL debe ser pública |

---

## 📊 ESTADÍSTICAS DE USO

Después de trabajar, puedes ver:

**En el header del sistema:**
- X recintos cargados
- X pendientes

**En Google Sheets (hoja "Log"):**
- Cuántos recintos se llenaron
- Quién llenó qué
- Cuándo se llenaron

**En la hoja "Resultados":**
- Total de votos por recinto
- Distribución por partido
- Porcentajes

---

## ✅ CHECKLIST FINAL

Antes de empezar a llenar datos reales:

- [ ] Google Sheet tiene 4 hojas
- [ ] Encabezados correctos en cada hoja
- [ ] Hoja "Candidatos" tiene al menos 10 municipios
- [ ] Sheet publicada en la web
- [ ] Test de lectura de API funciona
- [ ] Sistema abre en el navegador
- [ ] Mapa muestra 5,741 recintos
- [ ] Test de guardado exitoso
- [ ] Datos aparecen en Google Sheets

---

## 🎓 CAPACITACIÓN DEL EQUIPO

Para entrenar a otros operadores:

1. **Muéstrales este documento** (5 min)
2. **Haz una demo en vivo** (10 min):
   - Buscar recinto
   - Llenar 1 mesa de ejemplo
   - Mostrar cómo agregar fotos
   - Guardar datos
3. **Déjalos practicar** con 2-3 recintos
4. **Verifica** que entiendan el flujo

---

## 📞 SOPORTE

Si algo no funciona:

1. **Abre la consola** (F12) y lee los errores
2. **Revisa este documento** paso a paso
3. **Verifica Google Sheets** está bien configurado
4. **Lee CONFIGURACION_SHEETS.md** para más detalles

---

## 🚀 ¡LISTO PARA PRODUCCIÓN!

El sistema está **100% funcional** y listo para:

✅ Llenar los 5,741 recintos
✅ Registrar millones de votos
✅ Subir miles de fotos de actas
✅ Generar datos en tiempo real
✅ Sincronizar con sistema de visualización

---

**¡A llenar datos!** 🗳️

---

*Sistema de Control Electoral · Innovación Humana 2026*
