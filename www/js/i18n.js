// i18n.js — Sistema de idioma: inglés (US, default) y español (México).
//
// Cómo funciona: cualquier elemento del HTML con data-i18n="clave" se
// traduce automáticamente al texto correspondiente cada vez que se llama
// a I18N.apply(). Para textos que se generan dinámicamente desde JS
// (library.js, reader.js, premium.js), usar I18N.t('clave') para obtener
// el string ya traducido en el idioma actual.

const I18N = (() => {
  const DICTS = {
    en: {
      appName: 'Rez Lector',
      reading: 'Reading',

      libraryTitle: 'Your library',
      addBookAria: 'Add book',
      emptyTitle: 'Read at the speed of your mind',
      emptySub: 'Upload an .epub or .txt and the app shows it to you one word at a time, right where your eyes are looking, at a pace that adjusts itself.',
      adPlaceholder: 'Ad space',
      streaksDays: 'day streak',
      wordsRead: 'words read',
      minutes: 'minutes',
      statsTeaser: 'You\'ve read <b>{words} words</b>. <b>Premium</b> shows you the full picture.',
      formatLocked: 'locked',
      bookLockedPct: 'locked',
      bookFinishedPct: 'done',
      deleteBookAria: 'Delete book',
      deleteConfirmTitle: 'Delete this book?',
      deleteConfirmBody: '"{title}" and your reading progress will be deleted. This can\'t be undone.',
      cancel: 'Cancel',
      delete: 'Delete',
      statusReading: 'Reading the book…',
      statusFormatUnsupported: 'Unsupported format. For now: .epub and .txt.',
      statusFileTooBig: 'This file is {size} MB. The limit is {limit} MB for now, to keep the app from freezing while processing it.',
      statusMissingBook: 'That book is no longer available (it may have been deleted). We refreshed your library.',
      statusNoIndexedDB: 'This browser doesn\'t have local storage available (IndexedDB). Try updating the app or using a different browser.',
      statusStorageGeneric: 'Couldn\'t access device storage.',
      statusFileReadGeneric: 'Couldn\'t read the file.',

      backAria: 'Back to library',
      sentenceBack: '⟲ sentence',
      stepBack: '−10',
      stepFwd: '+10',
      playAria: 'Play',
      pauseAria: 'Pause',
      stageHint: 'tap to pause',
      progressSaved: 'progress saved',
      finished: 'finished',
      resumeText: 'You left off at word {pos} of {total} ({pct}%)',
      resumeContinue: 'Continue',
      resumeRestart: 'Start over',
      speedLabel: 'Base speed',
      speedCapNote: '🔒 Premium unlocks unlimited speed',
      group1: '1 word',
      group2: '2 words',
      group3: '3 words',
      adaptiveLabel: 'Adaptive mode · live pace',
      footnote: 'space: pause · ← →: skip 10 words · ↑: previous sentence',
      chapterPrefix: 'Ch.',

      premiumBadge: '⚡ Rez Lector Premium',
      premiumHeadline: 'Read without limits',
      premiumSub: 'Unlock the full potential of your reading with a monthly subscription managed by Google Play.',
      premiumFeature1Title: 'Read at full speed',
      premiumFeature1Sub: 'No {cap} ppm cap: go as fast as your eyes can handle.',
      premiumFeature2Title: 'Group 2 and 3 words',
      premiumFeature2Sub: 'Read in bigger chunks to go even faster.',
      premiumFeature3Title: 'Unlimited library',
      premiumFeature3Sub: 'More than {max} books saved at once.',
      premiumFeature4Title: 'Stats and streaks',
      premiumFeature4Sub: 'Track your progress day by day, with no restrictions.',
      premiumFeature5Title: 'No ads',
      premiumFeature5Sub: 'A clean reading experience, with no interruptions.',
      premiumPriceOneTime: 'monthly subscription',
      premiumPriceNote: 'Renews automatically through Google Play',
      premiumPriceLoading: 'Loading price...',
      premiumPriceSubscription: '{price} / {period}',
      premiumMonthlyPeriod: 'month',
      premiumRenewalNote: 'Auto-renewable subscription. Manage or cancel anytime in Google Play.',
      premiumBuyBtn: 'Activate Premium',
      premiumRestoreBtn: 'Restore purchase',
      premiumManageBtn: 'Manage subscription',
      premiumCloseBtn: 'Maybe later',
      premiumProcessing: 'Processing…',
      premiumRestoring: 'Restoring...',
      premiumSuccess: 'Premium is active.',
      premiumPurchaseStarting: 'Opening Google Play...',
      premiumPurchaseSuccess: 'Premium activated.',
      premiumPurchasePending: 'Purchase is pending. Premium will unlock after Google Play confirms the subscription.',
      premiumPurchaseError: 'The purchase could not be completed.',
      premiumRestoreChecking: 'Checking Google Play...',
      premiumRestoreSuccess: 'Subscription restored.',
      premiumRestoreEmpty: 'No active subscription was found.',
      premiumPurchaseCancelled: 'Purchase was cancelled or not completed.',
      premiumBillingUnavailable: 'Google Play Billing is available only in the Android app installed from Google Play.',
      premiumDisclaimer: 'Premium must be verified by Google Play in the Android app. Local storage is only a cache; production builds should validate entitlement on a backend.',

      interstitialLabel: 'Advertisement',
      interstitialClose: 'Close',

      aboutAria: 'About & privacy',
      themeSystemAria: 'Use system theme',
      themeLightAria: 'Use light theme',
      themeDarkAria: 'Use dark theme',
      aboutVersion: 'Version {version}',
      aboutPremiumActive: '⚡ Premium unlocked',
      aboutPremiumInactive: 'Free version',
      aboutPrivacyTitle: 'Privacy',
    },
    es: {
      appName: 'Rez Lector',
      reading: 'Leyendo',

      libraryTitle: 'Tu biblioteca',
      addBookAria: 'Agregar libro',
      emptyTitle: 'Lee a la velocidad de tu mente',
      emptySub: 'Sube un .epub o .txt y la app te lo muestra palabra por palabra, en el centro de la mirada, a un ritmo que se ajusta solo.',
      adPlaceholder: 'Espacio publicitario',
      streaksDays: 'días seguidos',
      wordsRead: 'palabras leídas',
      minutes: 'minutos',
      statsTeaser: 'Llevás <b>{words} palabras</b> leídas. <b>Premium</b> te muestra el detalle completo.',
      formatLocked: 'bloqueado',
      bookLockedPct: 'bloqueado',
      bookFinishedPct: 'leído',
      deleteBookAria: 'Eliminar libro',
      deleteConfirmTitle: '¿Eliminar este libro?',
      deleteConfirmBody: 'Se borrará «{title}» y tu progreso de lectura. Esta acción no se puede deshacer.',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      statusReading: 'Leyendo el libro…',
      statusFormatUnsupported: 'Formato no soportado. Por ahora: .epub y .txt.',
      statusFileTooBig: 'El archivo pesa {size} MB. Por ahora el límite es {limit} MB para evitar que la app se trabe al procesarlo.',
      statusMissingBook: 'Ese libro ya no está disponible (puede que se haya eliminado). Actualizamos tu biblioteca.',
      statusNoIndexedDB: 'Este navegador no tiene almacenamiento local disponible (IndexedDB). Probá actualizar la app o usar otro navegador.',
      statusStorageGeneric: 'No se pudo acceder al almacenamiento del dispositivo.',
      statusFileReadGeneric: 'No se pudo leer el archivo.',

      backAria: 'Volver a la biblioteca',
      sentenceBack: '⟲ frase',
      stepBack: '−10',
      stepFwd: '+10',
      playAria: 'Reproducir',
      pauseAria: 'Pausar',
      stageHint: 'toca para pausar',
      progressSaved: 'progreso guardado',
      finished: 'terminado',
      resumeText: 'Quedaste en la palabra {pos} de {total} ({pct}%)',
      resumeContinue: 'Continuar',
      resumeRestart: 'Empezar de nuevo',
      speedLabel: 'Velocidad base',
      speedCapNote: '🔒 Premium desbloquea velocidad ilimitada',
      group1: '1 palabra',
      group2: '2 palabras',
      group3: '3 palabras',
      adaptiveLabel: 'Modo adaptativo · ritmo real',
      footnote: 'espacio: pausa · ← →: saltar 10 palabras · ↑: frase anterior',
      chapterPrefix: 'Cap.',

      premiumBadge: '⚡ Rez Lector Premium',
      premiumHeadline: 'Lee sin límites',
      premiumSub: 'Desbloqueá todo el potencial de tu lectura con una suscripción mensual administrada por Google Play.',
      premiumFeature1Title: 'Lectura a toda velocidad',
      premiumFeature1Sub: 'Sin tope de {cap} ppm: subí todo lo que tu ojo aguante.',
      premiumFeature2Title: 'Agrupar 2 y 3 palabras',
      premiumFeature2Sub: 'Lee en bloques más grandes para ir todavía más rápido.',
      premiumFeature3Title: 'Biblioteca sin límite',
      premiumFeature3Sub: 'Más de {max} libros guardados a la vez.',
      premiumFeature4Title: 'Estadísticas y racha',
      premiumFeature4Sub: 'Seguí tu progreso día a día, sin restricciones.',
      premiumFeature5Title: 'Sin anuncios',
      premiumFeature5Sub: 'Una experiencia de lectura limpia, sin interrupciones.',
      premiumPriceOneTime: 'suscripción mensual',
      premiumPriceNote: 'Se renueva automáticamente por Google Play',
      premiumPriceLoading: 'Cargando precio...',
      premiumPriceSubscription: '{price} / {period}',
      premiumMonthlyPeriod: 'mes',
      premiumRenewalNote: 'Suscripción autorrenovable. Podés administrarla o cancelarla en Google Play.',
      premiumBuyBtn: 'Activar Premium',
      premiumRestoreBtn: 'Restaurar compra',
      premiumManageBtn: 'Administrar suscripción',
      premiumCloseBtn: 'Tal vez más tarde',
      premiumProcessing: 'Procesando…',
      premiumRestoring: 'Restaurando...',
      premiumSuccess: 'Premium está activo.',
      premiumPurchaseStarting: 'Abriendo Google Play...',
      premiumPurchaseSuccess: 'Premium activado.',
      premiumPurchasePending: 'La compra está pendiente. Premium se activará cuando Google Play confirme la suscripción.',
      premiumPurchaseError: 'No se pudo completar la compra.',
      premiumRestoreChecking: 'Consultando Google Play...',
      premiumRestoreSuccess: 'Suscripción restaurada.',
      premiumRestoreEmpty: 'No se encontró una suscripción activa.',
      premiumPurchaseCancelled: 'La compra fue cancelada o no se completó.',
      premiumBillingUnavailable: 'Google Play Billing solo está disponible en la app Android instalada desde Google Play.',
      premiumDisclaimer: 'Premium debe verificarse con Google Play en la app Android. El almacenamiento local es solo cache; en producción conviene validar el acceso en un backend.',

      interstitialLabel: 'Publicidad',
      interstitialClose: 'Cerrar',

      aboutAria: 'Acerca de y privacidad',
      themeSystemAria: 'Usar tema del sistema',
      themeLightAria: 'Usar tema claro',
      themeDarkAria: 'Usar tema oscuro',
      aboutVersion: 'Versión {version}',
      aboutPremiumActive: '⚡ Premium desbloqueado',
      aboutPremiumInactive: 'Versión gratis',
      aboutPrivacyTitle: 'Privacidad',
    },
  };

  let currentLang = 'en';

  function detectInitialLang() {
    try {
      const saved = Storage.getPrefs().lang;
      if (saved === 'en' || saved === 'es') return saved;
    } catch (e) { /* Storage puede no estar listo todavía */ }
    return 'en'; // default explícito pedido: inglés (US)
  }

  /** Reemplaza {placeholders} en un string de traducción. */
  function format(str, vars) {
    if (!vars) return str;
    return str.replace(/\{(\w+)\}/g, (_, key) => (key in vars ? vars[key] : `{${key}}`));
  }

  function t(key, vars) {
    const dict = DICTS[currentLang] || DICTS.en;
    const raw = dict[key] != null ? dict[key] : (DICTS.en[key] || key);
    return format(raw, vars);
  }

  /** Aplica las traducciones a todos los elementos data-i18n del DOM. */
  function apply() {
    document.documentElement.lang = currentLang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      const key = el.getAttribute('data-i18n-aria');
      el.setAttribute('aria-label', t(key));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.setAttribute('placeholder', t(key));
    });
    document.querySelectorAll('.langSwitch button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === currentLang);
    });
  }

  function setLang(lang) {
    if (lang !== 'en' && lang !== 'es') return;
    currentLang = lang;
    try {
      const prefs = Storage.getPrefs();
      prefs.lang = lang;
      Storage.setPrefs(prefs);
    } catch (e) { /* no crítico si falla guardar la preferencia */ }
    apply();
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
  }

  function getLang() { return currentLang; }

  function init() {
    currentLang = detectInitialLang();
    apply();
  }

  return { init, apply, t, setLang, getLang };
})();

window.I18N = I18N;
