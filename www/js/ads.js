// ads.js - Production build: no advertising SDK and no visual ad placeholders.

const Ads = (() => {
  function showInterstitialOnOpen() {
    // Intentionally empty. Keeping the method avoids touching app startup
    // logic while ensuring Play reviewers never see fake ads.
  }

  return { showInterstitialOnOpen };
})();

window.Ads = Ads;
