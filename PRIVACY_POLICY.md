# Privacy Policy for Rez Lector

**Last updated: July 7, 2026**

## BLOCKER BEFORE RELEASE

- Publish this privacy policy at a public HTTPS URL and paste that URL in Google Play Console.
- Replace the contact placeholder below with a real support email before production release.

## Short Summary

Rez Lector is an offline-first RSVP reading app. Books, reading progress,
preferences, and reading stats are stored locally on your device. Rez Lector
does not run analytics, tracking SDKs, real advertising SDKs, accounts, cloud
sync, or external payment methods.

Rez Lector offers an optional monthly Premium subscription through Google Play
Billing using product ID `premium_monthly`. Google Play processes payments.
Rez Lector does not see or store your card number or payment credentials.

## Data Handled By The App

- **Books you import** (`.epub` and `.txt`) are processed and stored only on
  your device through IndexedDB/WebView storage.
- **Reading progress and preferences** such as current word position, speed,
  language, theme, and word grouping are stored locally.
- **Reading statistics** such as words read and day streaks are stored locally.
- **Premium entitlement cache** may store whether Google Play reported an
  active subscription. This is only a local cache for UX.
- **Billing verification data** may include `productId`, `purchaseToken`, and
  `packageName` so the app, and a future backend validator, can verify the
  active `premium_monthly` subscription.

## Payments

Premium is a monthly subscription managed by Google Play. Google Play handles
payment collection, renewals, cancellations, refunds, and payment credentials.
Rez Lector may receive subscription status information from Google Play Billing,
including the product ID and purchase token. Rez Lector does not receive credit
card numbers, bank details, or Google account payment credentials.

You can manage or cancel the subscription from Google Play subscriptions.

## What The App Does Not Do

- No user accounts or login.
- No collection of name, email, contacts, location, camera, microphone, or
  photos.
- No analytics SDKs or tracking SDKs.
- No advertising SDKs currently integrated.
- No upload of imported books to external servers.
- No external payment method outside Google Play Billing.

## Advertising

The app currently contains visual ad placeholders in the library/reader UI.
No real advertising SDK is connected, no ad network receives data, and no real
ads are served. If a real ad SDK is added later, this policy and the Google Play
Data Safety form must be updated before release.

## Permissions

Rez Lector uses Android's system file picker when you choose a book. The app
does not request broad storage permissions. The app requests `INTERNET` for
Google Play Billing and web platform support, and `VIBRATE` only for short
tap feedback. Cleartext traffic is disabled.

## Data Deletion

You can delete books inside the app. You can also uninstall Rez Lector to remove
all app-local data from the device.

## Children's Privacy

Rez Lector is not directed at children and does not knowingly collect personal
information from anyone.

## Changes

If Rez Lector adds cloud sync, analytics, real advertising, backend validation,
or other data handling, this policy will be updated before release.

## Contact

TODO before release: add a real support email.

---

# Politica de privacidad de Rez Lector

**Ultima actualizacion: 7 de julio de 2026**

## BLOQUEANTE ANTES DE PUBLICAR

- Publicar esta politica en una URL HTTPS publica y pegar esa URL en Google Play Console.
- Reemplazar el email pendiente por un correo real de soporte antes de produccion.

## Resumen breve

Rez Lector es una app de lectura RSVP pensada para funcionar localmente. Los
libros, progreso, preferencias y estadisticas se guardan en el dispositivo. Rez
Lector no usa analiticas, SDKs de rastreo, SDKs reales de anuncios, cuentas,
sincronizacion en la nube, ni metodos de pago externos.

Rez Lector ofrece una suscripcion Premium mensual por Google Play Billing con
Product ID `premium_monthly`. Google Play procesa los pagos. Rez Lector no ve
ni guarda datos de tarjeta ni credenciales de pago.

## Datos que maneja la app

- **Libros importados** (`.epub` y `.txt`), procesados y guardados solo en el
  dispositivo mediante IndexedDB/WebView storage.
- **Progreso y preferencias de lectura**, como palabra actual, velocidad,
  idioma, tema y agrupamiento de palabras.
- **Estadisticas de lectura**, como palabras leidas y racha de dias.
- **Cache local de Premium**, con el estado que Google Play haya reportado.
- **Datos de verificacion de Billing**, como `productId`, `purchaseToken` y
  `packageName`, para verificar la suscripcion `premium_monthly` activa.

## Pagos

Premium es una suscripcion mensual administrada por Google Play. Google Play
gestiona cobros, renovaciones, cancelaciones, reembolsos y credenciales de
pago. Rez Lector puede recibir el estado de suscripcion, Product ID y purchase
token desde Google Play Billing. Rez Lector no recibe numeros de tarjeta, datos
bancarios ni credenciales de pago de Google.

La suscripcion se puede administrar o cancelar desde Google Play.

## Lo que la app no hace

- No tiene cuentas ni inicio de sesion.
- No recolecta nombre, email, contactos, ubicacion, camara, microfono ni fotos.
- No usa SDKs de analitica ni rastreo.
- No integra SDKs reales de publicidad actualmente.
- No sube los libros importados a servidores externos.
- No usa metodos de pago externos a Google Play Billing.

## Publicidad

La app contiene placeholders visuales de anuncios en la UI. No hay SDK real de
publicidad conectado, ninguna red recibe datos y no se muestran anuncios reales.
Si se agrega un SDK de anuncios en el futuro, esta politica y Data Safety de
Google Play deben actualizarse antes de publicar.

## Permisos

Rez Lector usa el selector de archivos del sistema cuando eliges un libro. No
pide permisos amplios de almacenamiento. La app solicita `INTERNET` para Google
Play Billing y soporte web, y `VIBRATE` solo para feedback tactil breve.
Cleartext traffic esta deshabilitado.

## Eliminacion de datos

Puedes borrar libros dentro de la app. Tambien puedes desinstalar Rez Lector
para eliminar los datos locales de la app en el dispositivo.

## Privacidad de menores

Rez Lector no esta dirigida a menores y no recolecta informacion personal.

## Cambios

Si Rez Lector agrega sincronizacion, analiticas, publicidad real, validacion en
backend u otro manejo de datos, esta politica debe actualizarse antes de publicar.

## Contacto

TODO antes de publicar: agregar un email real de soporte.
