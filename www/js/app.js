// app.js — Arranque de la aplicación. Conecta Library <-> Reader.
//
// Manejo del botón atrás físico de Android: Capacitor, de fábrica y sin
// ningún plugin adicional, intercepta el botón atrás del hardware y lo
// redirige al historial del WebView (Bridge.onBackPressed -> WebView.
// canGoBack()/goBack()) — así es como Android maneja cualquier WebView
// nativo, documentado en su training oficial. Por eso, en vez de usar
// @capacitor/app (que requeriría un bundler, ver notas de la sesión sobre
// @capacitor/haptics), navegamos con el History API estándar del
// navegador (pushState/popstate). Así el botón atrás físico simplemente
// "funciona": vuelve de la lectura a la biblioteca en vez de cerrar la app.

let _suppressPopstate = false;

function goToLibrary({ fromPopstate = false } = {}) {
  Reader.hide();
  Library.show();
  Library.render();
  if (!fromPopstate && history.state && history.state.screen === 'reader') {
    // Si la navegación la disparó la UI (botón "← " en pantalla, no el
    // hardware), retrocedemos un paso real en el historial para que quede
    // sincronizado; el popstate resultante está marcado para no reprocesarse.
    _suppressPopstate = true;
    history.back();
  }
}

function goToReader(bookId, { fromPopstate = false } = {}) {
  Reader.open(bookId).then((success) => {
    if (success) {
      Library.hide();
      Reader.show();
      if (!fromPopstate) {
        history.pushState({ screen: 'reader', bookId }, '', '');
      }
    } else {
      // El libro ya no existe (por ejemplo, se borró justo antes del
      // click). Nos quedamos en la biblioteca y avisamos en vez de
      // mostrar una pantalla de lectura vacía y rota.
      Library.notifyMissingBook();
    }
  });
}

function initBackNavigation() {
  // Estado inicial: estamos en la biblioteca. Lo dejamos explícito en el
  // historial para tener algo contra lo que comparar en popstate.
  history.replaceState({ screen: 'library' }, '', '');

  window.addEventListener('popstate', (e) => {
    if (_suppressPopstate) { _suppressPopstate = false; return; }
    const state = e.state || { screen: 'library' };
    if (state.screen === 'reader' && state.bookId) {
      goToReader(state.bookId, { fromPopstate: true });
    } else {
      goToLibrary({ fromPopstate: true });
    }
  });
}

function initLangSwitch() {
  document.getElementById('langSwitch').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-lang]');
    if (!btn) return;
    I18N.setLang(btn.dataset.lang);
  });
  // Cuando cambia el idioma, hay textos generados dinámicamente (biblioteca,
  // lector) que data-i18n no cubre porque se construyen en JS — los
  // volvemos a renderizar para que también queden traducidos al instante.
  document.addEventListener('langchange', () => {
    Library.render();
    if (Reader.isOpen && Reader.isOpen()) Reader.refreshTexts();
  });
}

function initAboutButton() {
  document.getElementById('aboutBtn').addEventListener('click', () => About.show());
}

function initPremiumStateListener() {
  document.addEventListener('premiumchange', () => {
    Library.render();
    if (Reader.isOpen && Reader.isOpen()) Reader.refreshTexts();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.Theme) Theme.init();
  I18N.init();
  if (window.Billing) Billing.init().catch(() => {});
  Reader.init(goToLibrary);
  Library.init(goToReader);
  initLangSwitch();
  initAboutButton();
  initPremiumStateListener();
  initBackNavigation();
  // No-op in production: the app does not include an advertising SDK or fake ads.
  Ads.showInterstitialOnOpen();
});
