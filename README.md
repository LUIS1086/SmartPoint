# Smart Point · Sistema multi-sucursal

Sistema de gestión para tienda de celulares con 3 sucursales: ventas, reparación, inventario y reportes consolidados.

## 📁 Estructura del repositorio

```
smart-point/
├── index.html              ← La app completa (single-file)
├── manifest.json           ← Configuración PWA
├── service-worker.js       ← Cache offline
├── vercel.json             ← Configuración de Vercel (headers)
└── icons/
    ├── icon-192x192.png
    └── icon-512x512.png
```

## 🚀 Despliegue en Vercel

1. Crea un repositorio nuevo en GitHub (ej: `smart-point`).
2. Sube **todos** los archivos de esta carpeta al repo, **manteniendo la estructura**.
   La carpeta `icons/` debe quedar en la raíz, junto a `index.html`.
3. Entra a [vercel.com](https://vercel.com) → **Add New** → **Project** → importa el repo.
4. En la pantalla de configuración:
   - **Framework Preset:** Other
   - **Root Directory:** `./` (la raíz)
   - **Build Command:** déjalo vacío
   - **Output Directory:** déjalo vacío
5. Click **Deploy**. En 30 segundos tienes URL pública.

## 🔑 Primer ingreso

PIN por defecto: **`1234`**

Si te dice "PIN incorrecto" porque tu navegador tiene datos viejos de NelsonApp, abre la consola (F12) y ejecuta:

```js
localStorage.clear(); location.reload();
```

## 🏪 Sucursales (vienen pre-cargadas)

- Smart Point (sede principal)
- Smart Station La Sexta
- Smart Station La 15

Se pueden renombrar en `Datos & Config → Mi negocio → Sucursales`.

## ☁️ Google Drive

Las claves de almacenamiento están en namespace `smartpoint.*`, así no chocan con NelsonApp si las dos apps corren en el mismo navegador. El Client ID actual de OAuth se hereda de NelsonApp; si quieres uno propio para Smart Point, créalo en Google Cloud Console y guárdalo desde la consola del navegador:

```js
localStorage.setItem('smartpoint.driveClientId', 'TU-NUEVO-CLIENT-ID.apps.googleusercontent.com');
location.reload();
```

## 🤖 Smart IA (Gemini)

La llave de Gemini se pide la primera vez que abres el chat de Smart IA. Es **gratis** (hasta 500 consultas/día). Se guarda en `smartpoint.ia_key` — totalmente independiente de la de NelsonApp.

Para obtener una llave: [aistudio.google.com](https://aistudio.google.com) → Get API key.

## 📱 Convertir a APK (Appilix)

1. Despliega en Vercel y copia la URL pública.
2. Entra a [appilix.com](https://appilix.com).
3. Pega la URL, sube el icono `icons/icon-512x512.png`, configura el nombre "Smart Point".
4. Genera el APK y distribúyelo a las sucursales.

## 🛠️ Actualizar después del deploy

Cualquier cambio que subas a GitHub se despliega automáticamente en Vercel (en ~30s). Para que los empleados vean la actualización inmediata sin esperar al cache, pueden abrir el menú y usar "Actualizar app" — o simplemente cerrar y volver a abrir.
