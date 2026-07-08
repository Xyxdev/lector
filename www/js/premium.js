// premium.js - Paywall backed by Google Play Billing through Capacitor.
// Premium is unlocked only after Billing confirms an active subscription.

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
    const status = window.Billing ? Billing.getStatus() : null;
    const details = status && status.productDetails;
    if (details && details.formattedPrice) {
      return I18N.t('premiumPriceSubscription', {
        price: details.formattedPrice,
        period: details.billingPeriod || 'month',
      });
    }
    return I18N.t('premiumPriceLoading');
  }

  function updatePrice(details) {
    const price = document.getElementById('premiumPrice');
    if (!price) return;
    if (details && details.formattedPrice) {
      price.textContent = I18N.t('premiumPriceSubscription', {
        price: details.formattedPrice,
        period: details.billingPeriod || 'month',
      });
    } else {
      price.textContent = I18N.t('premiumPriceLoading');
    }
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
    if (!window.Billing) {
      statusText(I18N.t('premiumBillingUnavailable'), 'warning');
      return;
    }
    setBusy(true);
    statusText(I18N.t('premiumPriceLoading'), 'warning');
    try {
      const details = await Billing.loadProductDetails();
      updatePrice(details);
      const status = Billing.getStatus();
      statusText(status.message || '', status.ready ? 'success' : 'warning');
    } catch (e) {
      statusText(e.message || I18N.t('premiumBillingUnavailable'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function buy() {
    if (!window.Billing) {
      statusText(I18N.t('premiumBillingUnavailable'), 'error');
      return;
    }
    setBusy(true);
    statusText(I18N.t('premiumPurchaseStarting'), 'warning');
    try {
      const status = await Billing.purchasePremium();
      if (status.premium) {
        statusText(I18N.t('premiumPurchaseSuccess'), 'success');
        if (onUnlocked) onUnlocked();
        setTimeout(close, 650);
      } else if (status.pending) {
        statusText(I18N.t('premiumPurchasePending'), 'warning');
      } else {
        statusText(status.message || I18N.t('premiumRestoreEmpty'), 'warning');
      }
    } catch (e) {
      statusText(e.message || I18N.t('premiumPurchaseError'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    if (!window.Billing) {
      statusText(I18N.t('premiumBillingUnavailable'), 'warning');
      return;
    }
    setBusy(true);
    statusText(I18N.t('premiumRestoreChecking'), 'warning');
    try {
      const status = await Billing.restorePurchases();
      if (status.premium) {
        statusText(I18N.t('premiumRestoreSuccess'), 'success');
        if (onUnlocked) onUnlocked();
        setTimeout(close, 650);
      } else if (status.pending) {
        statusText(I18N.t('premiumPurchasePending'), 'warning');
      } else {
        statusText(I18N.t('premiumRestoreEmpty'), 'warning');
      }
    } catch (e) {
      statusText(e.message || I18N.t('premiumPurchaseError'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function manage() {
    if (window.Billing) {
      await Billing.openManageSubscriptions();
      return;
    }
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
