// billing.js - Small Capacitor bridge for Google Play Billing.
// It never unlocks premium locally. Entitlement is cached only from the
// native GooglePlayBilling plugin response.

const Billing = (() => {
  const PRODUCT_ID = 'premium_monthly';
  let plugin = null;
  let ready = false;
  let productDetails = null;
  let lastStatus = {
    available: false,
    ready: false,
    premium: false,
    message: 'Google Play Billing is available only in the Android app installed from Google Play.',
  };

  function getPlugin() {
    return window.Capacitor &&
      window.Capacitor.Plugins &&
      window.Capacitor.Plugins.GooglePlayBilling
      ? window.Capacitor.Plugins.GooglePlayBilling
      : null;
  }

  function emitPremiumChange(premium) {
    document.dispatchEvent(new CustomEvent('premiumchange', { detail: { premium: !!premium } }));
  }

  function applyEntitlement(result) {
    const valid = !!(
      result &&
      result.premium === true &&
      result.productId === PRODUCT_ID &&
      result.pending !== true
    );
    Storage.setPremiumFromBilling(valid);
    lastStatus = {
      ...lastStatus,
      premium: valid,
      pending: !!(result && result.pending),
      message: result && result.message ? result.message : (valid ? 'Subscription active.' : 'No active subscription found.'),
      entitlement: result || null,
    };
    emitPremiumChange(valid);
    return lastStatus;
  }

  function unavailableStatus() {
    Storage.setPremiumFromBilling(false);
    lastStatus = {
      available: false,
      ready: false,
      premium: false,
      message: window.I18N ? I18N.t('premiumBillingUnavailable') : lastStatus.message,
    };
    emitPremiumChange(false);
    return lastStatus;
  }

  async function init() {
    plugin = getPlugin();
    if (!plugin) return unavailableStatus();
    try {
      const result = await plugin.initialize({ productId: PRODUCT_ID });
      ready = !!(result && result.ready);
      lastStatus = { ...lastStatus, available: true, ready, message: ready ? 'Billing ready.' : lastStatus.message };
      await refreshEntitlement();
    } catch (e) {
      ready = false;
      Storage.setPremiumFromBilling(false);
      lastStatus = {
        ...lastStatus,
        available: true,
        ready: false,
        premium: false,
        message: e.message || 'Google Play Billing is not ready.',
      };
      emitPremiumChange(false);
    }
    return lastStatus;
  }

  async function ensureReady() {
    if (!plugin) plugin = getPlugin();
    if (!plugin) throw new Error(window.I18N ? I18N.t('premiumBillingUnavailable') : lastStatus.message);
    if (!ready) await init();
  }

  async function loadProductDetails() {
    await ensureReady();
    productDetails = await plugin.getProductDetails({ productId: PRODUCT_ID });
    lastStatus = { ...lastStatus, productDetails, message: 'Product details loaded.' };
    return productDetails;
  }

  async function refreshEntitlement() {
    await ensureReady();
    const result = await plugin.queryPurchases({ productId: PRODUCT_ID });
    return applyEntitlement(result);
  }

  async function purchasePremium() {
    await ensureReady();
    if (!productDetails) await loadProductDetails();
    const result = await plugin.purchase({
      productId: PRODUCT_ID,
      offerToken: productDetails && productDetails.offerToken,
    });
    return applyEntitlement(result);
  }

  async function restorePurchases() {
    return refreshEntitlement();
  }

  async function openManageSubscriptions() {
    if (!plugin) plugin = getPlugin();
    if (plugin) {
      return plugin.openManageSubscriptions({ productId: PRODUCT_ID });
    }
    window.open('https://play.google.com/store/account/subscriptions', '_blank', 'noopener');
    return { opened: true };
  }

  function getStatus() {
    return { ...lastStatus, productId: PRODUCT_ID, productDetails };
  }

  return {
    PRODUCT_ID,
    init,
    loadProductDetails,
    refreshEntitlement,
    purchasePremium,
    restorePurchases,
    openManageSubscriptions,
    getStatus,
  };
})();

window.Billing = Billing;
