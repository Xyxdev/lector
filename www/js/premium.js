// premium.js - Paywall wired to Google Play Billing through Billing.
// No local bypass: premium is unlocked only after Billing confirms an active
// Google Play subscription. Storage keeps cache only for UX.

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
    if (!window.Billing) return I18N.t('premiumPriceLoading');
    const status = Billing.getStatus();
    if (status.productDetails && status.productDetails.formattedPrice) {
      return I18N.t('premiumPriceSubscription', {
        price: status.productDetails.formattedPrice,
        period: status.productDetails.billingPeriod || I18N.t('premiumMonthlyPeriod'),
      });
    }
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
    if (!window.Billing) return;
    try {
      await Billing.loadProductDetails();
      const price = document.getElementById('premiumPrice');
      if (price) price.textContent = priceCopy();
      const status = Billing.getStatus();
      if (!status.available) statusText(status.message, 'warning');
    } catch (e) {
      statusText(I18N.t('premiumBillingUnavailable'), 'warning');
    }
  }

  async function buy() {
    if (!window.Billing) {
      statusText(I18N.t('premiumBillingUnavailable'), 'error');
      return;
    }
    setBusy(true);
    statusText(I18N.t('premiumProcessing'), 'loading');
    const result = await Billing.purchasePremium();
    setBusy(false);
    if (result.premium) {
      Haptics.medium();
      statusText(I18N.t('premiumSuccess'), 'success');
      if (onUnlocked) onUnlocked();
      setTimeout(close, 450);
    } else {
      statusText(result.error || result.message || I18N.t('premiumPurchaseCancelled'), 'error');
    }
  }

  async function restore() {
    if (!window.Billing) {
      statusText(I18N.t('premiumBillingUnavailable'), 'error');
      return;
    }
    setBusy(true);
    statusText(I18N.t('premiumRestoring'), 'loading');
    const result = await Billing.restorePurchases();
    setBusy(false);
    if (result.premium) {
      statusText(I18N.t('premiumRestoreSuccess'), 'success');
      if (onUnlocked) onUnlocked();
      setTimeout(close, 450);
    } else {
      statusText(result.message || I18N.t('premiumRestoreEmpty'), 'warning');
    }
  }

  async function manage() {
    if (!window.Billing) return;
    await Billing.openManageSubscriptions();
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
