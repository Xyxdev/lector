// app.js — Arranque de la aplicación. Conecta Library <-> Reader.

function goToLibrary() {
  Reader.hide();
  Library.show();
  Library.render();
}

function goToReader(bookId) {
  Reader.open(bookId).then((success) => {
    if (success) {
      Library.hide();
      Reader.show();
    } else {
      // El libro ya no existe (por ejemplo, se borró justo antes del
      // click). Nos quedamos en la biblioteca y avisamos en vez de
      // mostrar una pantalla de lectura vacía y rota.
      Library.notifyMissingBook();
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

document.addEventListener('DOMContentLoaded', () => {
  I18N.init();
  Reader.init(goToLibrary);
  Library.init(goToReader);
  initLangSwitch();
  // Anuncio de pantalla completa al abrir la app (placeholder visual, sin
  // SDK real conectado todavía). Se muestra una sola vez por sesión, no
  // en cada vez que se vuelve a la biblioteca.
  Ads.showInterstitialOnOpen();
});
