// premium.js — Paywall de la función premium ($5 pago único, simulado).
//
// IMPORTANTE: Premium.show()/buy() de este archivo NO realiza ningún cobro
// real. Marca Storage.setPremium(true) directamente al tocar "Comprar",
// para poder construir y probar toda la experiencia premium sin depender
// de Google Play Billing todavía. Antes de publicar con cobros reales,
// hay que reemplazar el handler del botón de compra por la integración
// real de Billing y solo llamar a setPremium(true) tras la confirmación
// del pago por parte de Google.

const Premium = (() => {
  let onUnlocked = null;

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.textContent ? div.innerHTML : '';
  }

  function getFeatures() {
    return [
      { title: I18N.t('premiumFeature1Title'), sub: I18N.t('premiumFeature1Sub', { cap: FREE_LIMITS.MAX_PPM }) },
      { title: I18N.t('premiumFeature2Title'), sub: I18N.t('premiumFeature2Sub') },
      { title: I18N.t('premiumFeature3Title'), sub: I18N.t('premiumFeature3Sub', { max: FREE_LIMITS.MAX_BOOKS }) },
      { title: I18N.t('premiumFeature4Title'), sub: I18N.t('premiumFeature4Sub') },
      { title: I18N.t('premiumFeature5Title'), sub: I18N.t('premiumFeature5Sub') },
    ];
  }

  function render() {
    const root = document.getElementById('premiumRoot');
    const featuresHtml = getFeatures().map(f => `
      <div class="premiumFeature">
        <div class="checkDot">✓</div>
        <div class="featureText">${escapeHtml(f.title)}<span>${escapeHtml(f.sub)}</span></div>
      </div>
    `).join('');

    root.innerHTML = `
      <div class="premiumOverlay" id="premiumOverlay">
        <div class="premiumCard">
          <div class="premiumBadge">${escapeHtml(I18N.t('premiumBadge'))}</div>
          <h2>${escapeHtml(I18N.t('premiumHeadline'))}</h2>
          <div class="premiumSub">${escapeHtml(I18N.t('premiumSub'))}</div>
          <div class="premiumFeatureList">${featuresHtml}</div>
          <div class="premiumPriceRow"><span class="price">$5</span><span class="priceNote">${escapeHtml(I18N.t('premiumPriceOneTime'))}</span></div>
          <div class="premiumPriceSub">${escapeHtml(I18N.t('premiumPriceNote'))}</div>
          <button id="premiumBuyBtn" class="premiumBuyBtn">${escapeHtml(I18N.t('premiumBuyBtn'))}</button>
          <button id="premiumCloseBtn" class="premiumCloseBtn">${escapeHtml(I18N.t('premiumCloseBtn'))}</button>
          <div class="premiumDisclaimer">${escapeHtml(I18N.t('premiumDisclaimer'))}</div>
        </div>
      </div>
    `;

    document.getElementById('premiumCloseBtn').addEventListener('click', close);
    document.getElementById('premiumOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'premiumOverlay') close();
    });
    document.getElementById('premiumBuyBtn').addEventListener('click', async () => {
      const btn = document.getElementById('premiumBuyBtn');
      btn.textContent = I18N.t('premiumProcessing');
      btn.disabled = true;
      // Simulamos una pequeña demora de "procesando pago" para que la
      // transición no se sienta instantánea/falsa.
      await new Promise(r => setTimeout(r, 600));
      Storage.setPremium(true);
      if (window.Theme) Theme.apply();
      Haptics.medium();
      close();
      if (onUnlocked) onUnlocked();
    });
  }

  function show(unlockedCallback) {
    onUnlocked = unlockedCallback || null;
    render();
  }

  function close() {
    const root = document.getElementById('premiumRoot');
    root.innerHTML = '';
  }

  return { show, close };
})();

window.Premium = Premium;
