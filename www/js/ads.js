// ads.js — Espacios publicitarios de la app.
//
// IMPORTANTE: esto es 100% placeholder visual. No hay ningún SDK de
// publicidad (AdMob u otro) conectado todavía — son solo los espacios en
// la UI reservados para cuando se integre uno real. Nada de esto hace
// llamadas de red ni carga anuncios de verdad.

const Ads = (() => {
  let interstitialShownThisSession = false;

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.textContent ? div.innerHTML : '';
  }

  /** Anuncio de pantalla completa al abrir la app. Se muestra una sola
   *  vez por sesión (no cada vez que se navega entre pantallas), y nunca
   *  para usuarios premium. Tiene una cuenta atrás de 3s antes de poder
   *  cerrarse, simulando el comportamiento típico de un interstitial real. */
  function showInterstitialOnOpen() {
    if (interstitialShownThisSession) return;
    if (Storage.isPremium()) return;
    interstitialShownThisSession = true;

    const root = document.getElementById('adRoot');
    root.innerHTML = `
      <div class="interstitialOverlay" id="interstitialOverlay">
        <span class="adTag" data-i18n="interstitialLabel">Advertisement</span>
        <div class="interstitialCountdown" id="interstitialCountdown">3</div>
        <div class="interstitialBody">
          <span>AD</span>
          <span data-i18n="adPlaceholder">Ad space</span>
        </div>
      </div>
    `;
    I18N.apply();

    let secondsLeft = 3;
    const countdownEl = document.getElementById('interstitialCountdown');
    const timer = setInterval(() => {
      secondsLeft--;
      if (secondsLeft <= 0) {
        clearInterval(timer);
        countdownEl.outerHTML = `<button id="interstitialCloseBtn" class="interstitialCloseBtn" aria-label="${escapeHtml(I18N.t('interstitialClose'))}">×</button>`;
        document.getElementById('interstitialCloseBtn').addEventListener('click', closeInterstitial);
      } else {
        countdownEl.textContent = String(secondsLeft);
      }
    }, 1000);
  }

  function closeInterstitial() {
    const root = document.getElementById('adRoot');
    root.innerHTML = '';
  }

  return { showInterstitialOnOpen };
})();

window.Ads = Ads;
