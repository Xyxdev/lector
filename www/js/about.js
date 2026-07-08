// about.js - In-app About / Privacy summary required for Play review.

const About = (() => {
  const APP_VERSION = '1.0.0';

  const PRIVACY_TEXT = {
    en: [
      'Rez Lector stores your books, reading progress, preferences, and reading stats locally on your device. Imported books are not uploaded to external servers.',
      'PREMIUM: the monthly subscription is processed by Google Play Billing with product ID premium_monthly. The app may receive productId, purchaseToken, packageName, and subscription status to verify Premium. Rez Lector never sees card numbers or payment credentials.',
      "WHAT THE APP DOES NOT DO: it has no accounts, login, name, or email collection; it doesn't use analytics or tracking SDKs; it doesn't access your camera, microphone, location, or contacts.",
      'ADVERTISING: the ad spaces you see are visual placeholders only. No advertising SDK is connected yet, no ad network receives data about you, and no real ads are shown.',
      "PERMISSIONS: Android's standard file picker is used when you choose a book. The app requests INTERNET for Google Play Billing and VIBRATE for tap feedback.",
      'DATA DELETION: delete books individually inside the app, or uninstall the app to erase everything.',
      'BLOCKER BEFORE RELEASE: publish PRIVACY_POLICY.md at a public HTTPS URL and add a real support email.',
    ].join('\n\n'),
    es: [
      'Rez Lector guarda tus libros, progreso, preferencias y estadisticas localmente en tu dispositivo. Los libros importados no se suben a servidores externos.',
      'PREMIUM: la suscripcion mensual se procesa con Google Play Billing usando el Product ID premium_monthly. La app puede recibir productId, purchaseToken, packageName y estado de suscripcion para verificar Premium. Rez Lector no ve numeros de tarjeta ni credenciales de pago.',
      'QUE NO HACE LA APP: no tiene cuentas, inicio de sesion, ni recolecta nombre o correo; no usa SDKs de analitica ni rastreo; no accede a tu camara, microfono, ubicacion, ni contactos.',
      'PUBLICIDAD: los espacios de anuncios son solo marcadores visuales. Todavia no hay ningun SDK conectado, ninguna red recibe datos y no se muestran anuncios reales.',
      'PERMISOS: se usa el selector de archivos del sistema cuando eliges un libro. La app solicita INTERNET para Google Play Billing y VIBRATE para feedback tactil.',
      'ELIMINACION DE DATOS: borra libros individualmente desde la app, o desinstala la app para borrar todo.',
      'BLOQUEANTE ANTES DE PUBLICAR: publicar PRIVACY_POLICY.md en una URL HTTPS publica y agregar un email real de soporte.',
    ].join('\n\n'),
  };

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.textContent ? div.innerHTML : '';
  }

  function render() {
    const root = document.getElementById('aboutRoot');
    const lang = I18N.getLang();
    const text = PRIVACY_TEXT[lang] || PRIVACY_TEXT.en;
    const isPremium = Storage.isPremium();

    root.innerHTML = `
      <div class="modalOverlay" id="aboutOverlay">
        <div class="modalCard aboutCard">
          <div class="modalTitle">${escapeHtml(I18N.t('appName'))}</div>
          <div class="aboutVersion">${escapeHtml(I18N.t('aboutVersion', { version: APP_VERSION }))}</div>
          <div class="aboutPremiumStatus">${isPremium ? escapeHtml(I18N.t('aboutPremiumActive')) : escapeHtml(I18N.t('aboutPremiumInactive'))}</div>
          <div class="aboutPrivacyTitle">${escapeHtml(I18N.t('aboutPrivacyTitle'))}</div>
          <div class="aboutPrivacyText">${escapeHtml(text)}</div>
          <div class="modalActions">
            <button id="aboutCloseBtn">${escapeHtml(I18N.t('interstitialClose'))}</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('aboutCloseBtn').addEventListener('click', close);
    document.getElementById('aboutOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'aboutOverlay') close();
    });
  }

  function close() {
    document.getElementById('aboutRoot').innerHTML = '';
  }

  function show() {
    render();
  }

  return { show, close };
})();

window.About = About;
