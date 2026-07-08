// about.js - In-app About / Privacy summary for Play review.

const About = (() => {
  const APP_VERSION = '1.0.0';
  const SUPPORT_EMAIL = 'ssuerx.u@gmail.com';

  const PRIVACY_TEXT = {
    en: [
      'Rez Lector stores your books, reading progress, preferences, and reading stats locally on your device. Imported books are not uploaded to external servers.',
      'PREMIUM: the monthly subscription is processed by Google Play Billing with product ID premium_monthly. The app may receive productId, purchaseToken, packageName, and subscription status to verify Premium. Rez Lector never sees card numbers or payment credentials.',
      "WHAT THE APP DOES NOT DO: it has no accounts, login, cloud sync, analytics, tracking SDKs, real advertising SDKs, or external payment methods.",
      "PERMISSIONS: Android's system file picker is used when you choose a book. The app requests INTERNET for Google Play Billing and VIBRATE for tap feedback.",
      'DATA DELETION: delete books individually inside the app, or uninstall the app to erase local data.',
      `SUPPORT: ${SUPPORT_EMAIL}`,
    ].join('\n\n'),
    es: [
      'Rez Lector guarda tus libros, progreso, preferencias y estadisticas localmente en tu dispositivo. Los libros importados no se suben a servidores externos.',
      'PREMIUM: la suscripcion mensual se procesa con Google Play Billing usando el Product ID premium_monthly. La app puede recibir productId, purchaseToken, packageName y estado de suscripcion para verificar Premium. Rez Lector no ve numeros de tarjeta ni credenciales de pago.',
      'QUE NO HACE LA APP: no tiene cuentas, inicio de sesion, sincronizacion en la nube, analiticas, SDKs de rastreo, SDKs reales de anuncios ni metodos de pago externos.',
      'PERMISOS: se usa el selector de archivos del sistema cuando eliges un libro. La app solicita INTERNET para Google Play Billing y VIBRATE para feedback tactil.',
      'ELIMINACION DE DATOS: borra libros individualmente desde la app, o desinstala la app para eliminar los datos locales.',
      `SOPORTE: ${SUPPORT_EMAIL}`,
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
