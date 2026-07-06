// about.js — Pantalla "Acerca de / Privacidad", requerida por las
// políticas de Google Play: la app debe mostrar un link o texto de
// política de privacidad DESDE DENTRO de la app, no solo en la ficha de
// la tienda. Como todavía no hay una URL pública donde hospedar el
// documento completo, embebemos el texto completo aquí mismo — eso
// también satisface el requisito ("a privacy policy link or text within
// the app itself").

const About = (() => {
  const APP_VERSION = '1.0.0'; // debe coincidir con version.properties

  const PRIVACY_TEXT = {
    en: [
      "Rez Lector does not collect, store on external servers, or share any personal data. Everything happens exclusively on your device.",
      "WHAT THE APP STORES (locally only, never uploaded): the books you upload (.epub/.txt) via IndexedDB on your device; your reading progress and preferences (speed, language, word grouping); whether you've unlocked premium features, as a simple local flag.",
      "WHAT THE APP DOES NOT DO: it doesn't require internet access to read books; it has no accounts, login, name, or email collection; it doesn't use analytics or tracking SDKs; it doesn't access your camera, microphone, location, or contacts.",
      "ADVERTISING: the ad spaces you see are visual placeholders only. No advertising SDK is connected yet, no ad network receives data about you, and no real ads are shown.",
      "PERMISSIONS: only the standard file picker (to choose a book) and VIBRATE (for tap feedback) — neither involves data collection.",
      "DATA DELETION: delete books individually inside the app, or uninstall the app to erase everything.",
      "This is a short summary. The full privacy policy is included with the app's source files (PRIVACY_POLICY.md).",
    ].join('\n\n'),
    es: [
      "Rez Lector no recolecta, almacena en servidores externos, ni comparte ningún dato personal. Todo ocurre exclusivamente en tu dispositivo.",
      "QUÉ GUARDA LA APP (solo localmente, nunca se sube): los libros que subís (.epub/.txt) vía IndexedDB en tu dispositivo; tu progreso de lectura y preferencias (velocidad, idioma, agrupamiento); si desbloqueaste premium, como un simple indicador local.",
      "QUÉ NO HACE LA APP: no necesita internet para leer libros; no tiene cuentas, inicio de sesión, ni recolecta nombre o correo; no usa SDKs de analítica ni rastreo; no accede a tu cámara, micrófono, ubicación, ni contactos.",
      "PUBLICIDAD: los espacios de anuncios que ves son solo marcadores visuales. Todavía no hay ningún SDK conectado, ninguna red recibe datos sobre vos, y no se muestra ningún anuncio real.",
      "PERMISOS: solo el selector de archivos estándar (para elegir un libro) y VIBRATE (para el feedback táctil) — ninguno implica recolección de datos.",
      "ELIMINACIÓN DE DATOS: borrá libros individualmente desde la app, o desinstalá la app para borrar todo.",
      "Este es un resumen breve. La política de privacidad completa está incluida con el código fuente de la app (PRIVACY_POLICY.md).",
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
