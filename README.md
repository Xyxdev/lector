# Lector RSVP — App nativa Android

Esta carpeta es un proyecto listo para que GitHub compile, en sus propios
servidores, un APK **nativo** (todo el código va adentro del APK, no depende
de ninguna web).

## Pasos (sin instalar nada en tu computadora)

1. Crea una cuenta gratis en https://github.com/signup si no tienes una.

2. Crea un repositorio nuevo:
   - Entra a https://github.com/new
   - Ponle un nombre, por ejemplo `lector-rsvp`
   - Déjalo en **Público** o **Privado**, cualquiera funciona
   - NO marques "Add a README" (ya tenemos uno)
   - Clic en **Create repository**

3. Sube los archivos:
   - En la página del repo recién creado, busca el link
     **"uploading an existing file"**
   - Arrastra **todo el contenido de esta carpeta** (todos los archivos y
     subcarpetas: `www/`, `.github/`, `scripts/`, `package.json`,
     `capacitor.config.json`, `.gitignore`) directo al cuadro de subida
   - Importante: arrastra el *contenido*, no la carpeta contenedora
   - Abajo, clic en **Commit changes**

4. La compilación arranca sola:
   - Ve a la pestaña **Actions** de tu repositorio
   - Vas a ver un workflow llamado "Build Android APK" corriendo
     (tarda entre 3 y 8 minutos la primera vez)
   - Si por algún motivo no arrancó solo, entra al workflow y clic en
     **"Run workflow"**

5. Descarga el APK:
   - Cuando el workflow termine con un check ✅ verde, entra a esa
     ejecución
   - Abajo, en la sección **Artifacts**, vas a ver
     `lector-rsvp-debug-apk` — descárgalo (viene en un .zip)
   - Descomprime y ahí está tu `app-debug.apk`

6. Pásalo a tu celular e instálalo igual que la vez anterior
   (Drive, cable USB, etc.) y ábrelo. Esta vez la app funciona
   completamente offline, sin depender de ningún sitio web.

## Si el workflow falla (❌ rojo)

Entra a la ejecución fallida, abre el paso que tiene la cruz roja, copia
el mensaje de error y pégamelo — lo más probable es algún ajuste de
versión de Android/Gradle que se resuelve rápido.

## Notas

- El APK que genera este workflow es una build de **debug** (sin firmar
  para Play Store), perfecta para instalar y probar en tu propio celular.
- Si más adelante quieres subirla a Play Store, hay que generar una build
  de "release" firmada — avísame cuando llegues a ese punto y lo armamos.
