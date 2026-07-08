// premium.js - Paywall shell.
// No local bypass: this web bundle does not unlock premium by itself. The
// Android Google Play integration must provide entitlement before release.

const Premium = (() => {
  let onUnlocked = null;

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s == null ? '' : String(s);
    return div.innerHTML;
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

  function statusText(message, kind = '') {
    const el = document.getElementById('premiumStatus');
    if (!el) return;
    el.textContent = message || '';
    el.className = `premiumStatus ${kind}`.trim();
  }

  function setBusy(busy) {
    ['premiumBuyBtn', 'premiumRestoreBtn', 'premiumManageBtn'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.disabled = !!busy;
    });
  }

  function priceCopy() {
    return I18N.t('premiumPriceLoading');
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
          <div class="premiumPriceRow"><span class="price" id="premiumPrice">${escapeHtml(priceCopy())}</span></div>
          <div class="premiumPriceSub">${escapeHtml(I18N.t('premiumRenewalNote'))}</div>
          <button id="premiumBuyBtn" class="premiumBuyBtn">${escapeHtml(I18N.t('premiumBuyBtn'))}</button>
          <button id="premiumRestoreBtn" class="premiumRestoreBtn">${escapeHtml(I18N.t('premiumRestoreBtn'))}</button>
          <button id="premiumManageBtn" class="premiumManageBtn">${escapeHtml(I18N.t('premiumManageBtn'))}</button>
          <button id="premiumCloseBtn" class="premiumCloseBtn">${escapeHtml(I18N.t('premiumCloseBtn'))}</button>
          <div id="premiumStatus" class="premiumStatus"></div>
          <div class="premiumDisclaimer">${escapeHtml(I18N.t('premiumDisclaimer'))}</div>
        </div>
      </div>
    `;

    document.getElementById('premiumCloseBtn').addEventListener('click', close);
    document.getElementById('premiumOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'premiumOverlay') close();
    });
    document.getElementById('premiumBuyBtn').addEventListener('click', buy);
    document.getElementById('premiumRestoreBtn').addEventListener('click', restore);
    document.getElementById('premiumManageBtn').addEventListener('click', manage);

    refreshPrice();
  }

  async function refreshPrice() {
    statusText(I18N.t('premiumBillingUnavailable'), 'warning');
  }

  async function buy() {
    statusText(I18N.t('premiumBillingUnavailable'), 'error');
  }

  async function restore() {
    statusText(I18N.t('premiumBillingUnavailable'), 'warning');
  }

  async function manage() {
    window.open('https://play.google.com/store/account/subscriptions', '_blank', 'noopener');
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
