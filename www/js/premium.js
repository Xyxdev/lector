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

  const FEATURES = [
    { title: 'Lectura a toda velocidad', sub: `Sin tope de ${FREE_LIMITS.MAX_PPM} ppm: subí todo lo que tu ojo aguante.` },
    { title: 'Agrupar 2 y 3 palabras', sub: 'Lee en bloques más grandes para ir todavía más rápido.' },
    { title: 'Biblioteca sin límite', sub: `Más de ${FREE_LIMITS.MAX_BOOKS} libros guardados a la vez.` },
    { title: 'Estadísticas y racha', sub: 'Seguí tu progreso día a día, sin restricciones.' },
    { title: 'Sin anuncios', sub: 'Una experiencia de lectura limpia, sin interrupciones.' },
  ];

  function render() {
    const root = document.getElementById('premiumRoot');
    const featuresHtml = FEATURES.map(f => `
      <div class="premiumFeature">
        <div class="checkDot">✓</div>
        <div class="featureText">${escapeHtml(f.title)}<span>${escapeHtml(f.sub)}</span></div>
      </div>
    `).join('');

    root.innerHTML = `
      <div class="premiumOverlay" id="premiumOverlay">
        <div class="premiumCard">
          <div class="premiumBadge">⚡ Rez Lector Premium</div>
          <h2>Lee sin límites</h2>
          <div class="premiumSub">Desbloqueá todo el potencial de tu lectura con un pago único. Sin suscripciones, es para siempre.</div>
          <div class="premiumFeatureList">${featuresHtml}</div>
          <div class="premiumPriceRow"><span class="price">$5</span><span class="priceNote">pago único</span></div>
          <div class="premiumPriceSub">No es una suscripción · se paga una sola vez</div>
          <button id="premiumBuyBtn" class="premiumBuyBtn">Desbloquear por $5</button>
          <button id="premiumCloseBtn" class="premiumCloseBtn">Tal vez más tarde</button>
          <div class="premiumDisclaimer">Modo de prueba: esta versión simula la compra localmente y no realiza ningún cobro real todavía.</div>
        </div>
      </div>
    `;

    document.getElementById('premiumCloseBtn').addEventListener('click', close);
    document.getElementById('premiumOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'premiumOverlay') close();
    });
    document.getElementById('premiumBuyBtn').addEventListener('click', async () => {
      const btn = document.getElementById('premiumBuyBtn');
      btn.textContent = 'Procesando…';
      btn.disabled = true;
      // Simulamos una pequeña demora de "procesando pago" para que la
      // transición no se sienta instantánea/falsa.
      await new Promise(r => setTimeout(r, 600));
      Storage.setPremium(true);
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
