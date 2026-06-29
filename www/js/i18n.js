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
      premiumSub: 'Unlock the full potential of your reading with a single payment. No subscriptions, it\'s yours forever.',
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
      premiumPriceOneTime: 'one-time payment',
      premiumPriceNote: 'Not a subscription · pay once',
      premiumBuyBtn: 'Unlock for $5',
      premiumCloseBtn: 'Maybe later',
      premiumProcessing: 'Processing…',
      premiumDisclaimer: 'Test mode: this version simulates the purchase locally and doesn\'t charge anything real yet.',

      interstitialLabel: 'Advertisement',
      interstitialClose: 'Close',

      aboutAria: 'About & privacy',
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
      premiumSub: 'Desbloqueá todo el potencial de tu lectura con un pago único. Sin suscripciones, es para siempre.',
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
      premiumPriceOneTime: 'pago único',
      premiumPriceNote: 'No es una suscripción · se paga una sola vez',
      premiumBuyBtn: 'Desbloquear por $5',
      premiumCloseBtn: 'Tal vez más tarde',
      premiumProcessing: 'Procesando…',
      premiumDisclaimer: 'Modo de prueba: esta versión simula la compra localmente y no realiza ningún cobro real todavía.',

      interstitialLabel: 'Publicidad',
      interstitialClose: 'Cerrar',

      aboutAria: 'Acerca de y privacidad',
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
