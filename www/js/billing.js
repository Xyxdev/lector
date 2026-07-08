// billing.js - Google Play Billing bridge for the Capacitor Android app.
//
// Product ID placeholder. Change it here if Play Console uses another ID.
// The product must be an auto-renewable monthly subscription in Google Play.
const BILLING_PREMIUM_PRODUCT_ID = 'premium_monthly';

const Billing = (() => {
  const PRODUCT_ID = BILLING_PREMIUM_PRODUCT_ID;
  const SUBSCRIPTIONS_URL = 'https://play.google.com/store/account/subscriptions';

  let initialized = false;
  let productDetails = null;
  let lastStatus = {
    available: false,
    loading: false,
    premium: Storage.isPremium(),
    message: '',
  };

  function plugin() {
    return window.Capacitor
      && window.Capacitor.Plugins
      && window.Capacitor.Plugins.GooglePlayBilling;
  }

  function setPremiumFromResult(result) {
    const premium = !!(result && result.premium);
    Storage.setPremiumFromBilling(premium);
    lastStatus = {
      ...lastStatus,
      premium,
      available: !!plugin(),
      message: result && result.message ? result.message : '',
    };
    if (window.Theme) Theme.apply();
    document.dispatchEvent(new CustomEvent('premiumchange', { detail: { premium } }));
    return premium;
  }

  function friendlyError(error, fallback) {
    if (!error) return fallback;
    if (typeof error === 'string') return error;
    return error.message || fallback;
  }

  async function ensureReady() {
    const native = plugin();
    if (!native) {
      lastStatus = {
        ...lastStatus,
        available: false,
        loading: false,
        message: 'Google Play Billing is only available in the Android app installed from Google Play.',
      };
      return false;
    }
    if (!initialized) {
      await native.initialize({ productId: PRODUCT_ID });
      initialized = true;
    }
    lastStatus = { ...lastStatus, available: true };
    return true;
  }

  async function loadProductDetails() {
    if (!(await ensureReady())) return null;
    try {
      const result = await plugin().getProductDetails({ productId: PRODUCT_ID });
      productDetails = result || null;
      return productDetails;
    } catch (error) {
      lastStatus = { ...lastStatus, message: friendlyError(error, 'Product not found.') };
      return null;
    }
  }

  async function refreshEntitlement() {
    if (!(await ensureReady())) {
      Storage.setPremiumFromBilling(false);
      return { premium: false, available: false, message: lastStatus.message };
    }
    lastStatus = { ...lastStatus, loading: true };
    try {
      const result = await plugin().queryPurchases({ productId: PRODUCT_ID });
      const premium = setPremiumFromResult(result);
      lastStatus = { ...lastStatus, loading: false, premium };
      return { ...result, premium, available: true };
    } catch (error) {
      Storage.setPremiumFromBilling(false);
      lastStatus = {
        ...lastStatus,
        loading: false,
        premium: false,
        message: friendlyError(error, 'Could not verify subscription status.'),
      };
      document.dispatchEvent(new CustomEvent('premiumchange', { detail: { premium: false } }));
      return { premium: false, available: true, error: lastStatus.message };
    }
  }

  async function purchasePremium() {
    if (!(await ensureReady())) return { premium: false, error: lastStatus.message };
    lastStatus = { ...lastStatus, loading: true };
    try {
      const details = productDetails || await loadProductDetails();
      const result = await plugin().purchase({
        productId: PRODUCT_ID,
        offerToken: details && details.offerToken ? details.offerToken : undefined,
      });
      const premium = setPremiumFromResult(result);
      lastStatus = { ...lastStatus, loading: false, premium };
      return { ...result, premium };
    } catch (error) {
      lastStatus = {
        ...lastStatus,
        loading: false,
        message: friendlyError(error, 'Purchase could not be completed.'),
      };
      return { premium: Storage.isPremium(), error: lastStatus.message };
    }
  }

  async function restorePurchases() {
    const result = await refreshEntitlement();
    return {
      ...result,
      restored: !!result.premium,
      message: result.premium ? 'Subscription restored.' : (result.message || 'No active subscription found.'),
    };
  }

  async function openManageSubscriptions() {
    const native = plugin();
    if (native && native.openManageSubscriptions) {
      await native.openManageSubscriptions({ productId: PRODUCT_ID });
      return;
    }
    window.open(`${SUBSCRIPTIONS_URL}?sku=${encodeURIComponent(PRODUCT_ID)}`, '_blank', 'noopener');
  }

  function getPriceLabel() {
    return productDetails && productDetails.formattedPrice
      ? productDetails.formattedPrice
      : 'Google Play';
  }

  function getBillingPeriodLabel() {
    return productDetails && productDetails.billingPeriod
      ? productDetails.billingPeriod
      : 'monthly';
  }

  function getStatus() {
    return { ...lastStatus, productDetails, productId: PRODUCT_ID };
  }

  async function init() {
    await loadProductDetails();
    await refreshEntitlement();
  }

  return {
    PRODUCT_ID,
    init,
    loadProductDetails,
    refreshEntitlement,
    purchasePremium,
    restorePurchases,
    openManageSubscriptions,
    getPriceLabel,
    getBillingPeriodLabel,
    getStatus,
  };
})();

window.Billing = Billing;
