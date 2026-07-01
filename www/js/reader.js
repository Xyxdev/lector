// reader.js — Pantalla de lectura: conecta RsvpEngine con la UI,
// maneja el guardado de progreso y los controles (teclado, táctil, sliders).

const Reader = (() => {
  const els = {};
  let engine = null;
  let book = null;
  let onBack = null;
  let saveTimer = null;
  let savedFlashTimer = null;
  // Posición desde la que empezamos a "contar" palabras leídas para las
  // estadísticas. Se resetea cada vez que el usuario salta manualmente
  // (adelante, atrás, cambia de capítulo) para no inflar el conteo con
  // navegación que no es lectura real; solo avanza por reproducción.
  let statsBasePos = 0;

  function cacheEls() {
    ['readerScreen', 'backBtn', 'bookTitle', 'chapterSelect',
     'stage', 'wordrow', 'wordLeft', 'wordPivot', 'wordRight',
     'progressBar', 'progressFill', 'progressLabel',
     'playBtn', 'prevBtn', 'nextBtn', 'sentenceBackBtn',
     'ppmSlider', 'ppmValue', 'adaptiveToggle', 'liveRate',
     'resumeBanner', 'resumeText', 'resumeBtn', 'restartBtn',
     'savedBadge', 'finishedBadge', 'sliderLockOverlay', 'speedCapNote',
     'readerAdSlot']
      .forEach(id => els[id] = document.getElementById(id));
  }

  function populateChapterSelect() {
    els.chapterSelect.innerHTML = '';
    book.chapters.forEach((ch, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `${I18N.t('chapterPrefix')} ${i + 1} — ${ch.title}`;
      els.chapterSelect.appendChild(opt);
    });
  }

  function renderWord({ left, pivot, right, pos, total }) {
    els.wordLeft.textContent = left;
    els.wordPivot.textContent = pivot;
    els.wordRight.textContent = right;
    const pct = total ? (pos / total) * 100 : 0;
    els.progressFill.style.width = pct + '%';
    els.progressBar.setAttribute('aria-valuenow', Math.round(pct));
    els.progressLabel.textContent = `${pos} / ${total}`;
    els.chapterSelect.value = engine.currentChapterIdx();
    els.finishedBadge.classList.toggle('hidden', !(total && pos >= total - 1));
    scheduleSave();
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(doSave, 800);
  }

  async function doSave() {
    if (!book) return;
    await Storage.updateProgress(book.id, engine.pos, engine.totalWords(), engine.basePPM);
    // Solo contamos como "leídas" las palabras avanzadas hacia adelante
    // desde el último checkpoint (reproducción real), nunca saltos manuales
    // hacia atrás ni retrocesos, para que las estadísticas reflejen lectura
    // genuina y no se puedan inflar navegando.
    const delta = engine.pos - statsBasePos;
    if (delta > 0) {
      await Storage.addWordsReadToday(delta);
    }
    statsBasePos = engine.pos;
  }

  function flashSaved() {
    els.savedBadge.classList.remove('hidden');
    clearTimeout(savedFlashTimer);
    savedFlashTimer = setTimeout(() => els.savedBadge.classList.add('hidden'), 1400);
  }

  function updatePlayButton() {
    els.playBtn.textContent = engine.playing ? '⏸' : '▶';
    els.playBtn.setAttribute('aria-label', engine.playing ? I18N.t('pauseAria') : I18N.t('playAria'));
  }

  function togglePlay() {
    Haptics.light();
    engine.toggle();
    updatePlayButton();
    if (!engine.playing) { doSave(); flashSaved(); }
  }

  function updateLiveRate() {
    els.liveRate.textContent = engine.effectivePPM();
  }

  /** Ajusta la UI del slider de velocidad y los botones de agrupamiento
   *  según si la app está desbloqueada (premium) o no. No modifica el
   *  dato guardado del libro (basePPM/wordsPerGroup) si ya tenía un valor
   *  alto de antes — solo limita lo que se puede USAR mientras no sea
   *  premium, para no perder esa preferencia si el usuario compra después. */
  function applyPremiumLimits() {
    const premium = Storage.isPremium();
    const cap = FREE_LIMITS.MAX_PPM;
    const maxSlider = parseInt(els.ppmSlider.max, 10);

    els.readerAdSlot.classList.toggle('hidden', premium);

    // Tope real de reproducción: si no es premium, ni el modo adaptativo
    // puede empujar el ritmo efectivo por encima del límite gratis.
    if (engine) engine.maxEffectivePPM = premium ? null : cap;

    els.sliderLockOverlay.classList.toggle('hidden', premium);
    els.speedCapNote.classList.toggle('hidden', premium);
    const minSlider = parseInt(els.ppmSlider.min, 10);
    if (!premium && maxSlider > cap) {
      // El overlay (anclado a la derecha vía CSS "right:0") debe ocupar
      // desde el valor "cap" hasta el final del rango REAL del slider
      // (que va de minSlider a maxSlider, no de 0 a maxSlider — ese fue
      // el bug original que lo corría hacia la derecha).
      const totalRange = maxSlider - minSlider;
      const capPositionPct = ((cap - minSlider) / totalRange) * 100;
      const overlayWidthPct = 100 - capPositionPct;
      els.sliderLockOverlay.style.width = overlayWidthPct + '%';
    }

    document.querySelectorAll('.groupBtn').forEach(btn => {
      const n = parseInt(btn.dataset.group, 10);
      const locked = !premium && n > FREE_LIMITS.MAX_WORDS_PER_GROUP;
      btn.classList.toggle('locked', locked);
      const label = I18N.t(n === 1 ? 'group1' : n === 2 ? 'group2' : 'group3');
      btn.innerHTML = locked ? `<span class="lockIcon">🔒</span> ${label}` : label;
    });

    // Si el motor ya quedó con un valor por encima de lo permitido (venía
    // guardado de antes), lo bajamos al tope gratis para esta sesión.
    if (!premium && engine) {
      if (engine.basePPM > cap) {
        engine.basePPM = cap;
        els.ppmSlider.value = cap;
        els.ppmValue.textContent = cap;
      }
      if (engine.wordsPerGroup > FREE_LIMITS.MAX_WORDS_PER_GROUP) {
        setGroupSize(FREE_LIMITS.MAX_WORDS_PER_GROUP);
      }
    }
    // El número "ritmo real" mostrado en pantalla debe reflejar el cap
    // recién aplicado, no quedar mostrando un valor viejo de antes de
    // ajustar basePPM/maxEffectivePPM.
    if (engine) updateLiveRate();
  }

  function setGroupSize(n) {
    if (!Storage.isPremium() && n > FREE_LIMITS.MAX_WORDS_PER_GROUP) {
      Premium.show(() => { applyPremiumLimits(); });
      return;
    }
    engine.wordsPerGroup = n;
    document.querySelectorAll('.groupBtn').forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.group, 10) === n);
    });
    els.wordrow.setAttribute('data-group-size', String(n));
    engine.renderCurrent();
  }

  function initEvents() {
    els.backBtn.addEventListener('click', () => {
      engine.pause();
      doSave();
      if (onBack) onBack();
    });

    els.playBtn.addEventListener('click', togglePlay);
    els.stage.addEventListener('click', togglePlay);

    els.prevBtn.addEventListener('click', () => { engine.stepBack(10); updatePlayButton(); });
    els.nextBtn.addEventListener('click', () => { engine.stepFwd(10); updatePlayButton(); });
    els.sentenceBackBtn.addEventListener('click', () => { engine.backToSentenceStart(); updatePlayButton(); });

    els.chapterSelect.addEventListener('change', (e) => {
      engine.jumpToChapterStart(parseInt(e.target.value, 10));
      updatePlayButton();
    });

    els.progressBar.addEventListener('click', (e) => {
      const rect = els.progressBar.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      engine.seekToWord(Math.floor(ratio * engine.totalWords()));
      updatePlayButton();
    });

    // Soporte de teclado para el slider de progreso (rol "slider" ARIA
    // requiere poder moverse con flechas cuando tiene el foco).
    els.progressBar.addEventListener('keydown', (e) => {
      if (e.code === 'ArrowRight' || e.code === 'ArrowUp') {
        e.preventDefault();
        engine.stepFwd(10);
        updatePlayButton();
      } else if (e.code === 'ArrowLeft' || e.code === 'ArrowDown') {
        e.preventDefault();
        engine.stepBack(10);
        updatePlayButton();
      } else if (e.code === 'Home') {
        e.preventDefault();
        engine.seekToWord(0);
        updatePlayButton();
      } else if (e.code === 'End') {
        e.preventDefault();
        engine.seekToWord(engine.totalWords() - 1);
        updatePlayButton();
      }
    });

    els.ppmSlider.addEventListener('input', (e) => {
      let value = parseInt(e.target.value, 10);
      if (!Storage.isPremium() && value > FREE_LIMITS.MAX_PPM) {
        value = FREE_LIMITS.MAX_PPM;
        e.target.value = value;
        Premium.show(() => { applyPremiumLimits(); });
      }
      engine.basePPM = value;
      els.ppmValue.textContent = value;
      updateLiveRate();
    });

    els.adaptiveToggle.addEventListener('change', (e) => {
      engine.adaptive = e.target.checked;
    });

    els.speedCapNote.addEventListener('click', () => Premium.show(() => { applyPremiumLimits(); }));

    document.querySelectorAll('.groupBtn').forEach(btn => {
      btn.addEventListener('click', () => setGroupSize(parseInt(btn.dataset.group, 10)));
    });

    els.resumeBtn.addEventListener('click', () => {
      els.resumeBanner.classList.add('hidden');
    });
    els.restartBtn.addEventListener('click', () => {
      engine.resetAdaptiveState();
      engine.seekToWord(0);
      updateLiveRate();
      updatePlayButton();
      els.resumeBanner.classList.add('hidden');
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') doSave();
    });
    window.addEventListener('beforeunload', doSave);

    document.addEventListener('keydown', (e) => {
      if (els.readerScreen.classList.contains('hidden')) return;
      if (e.defaultPrevented) return; // ya lo manejó otro listener (p.ej. el slider de progreso)
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      if (e.code === 'ArrowLeft') { engine.stepBack(10); updatePlayButton(); }
      if (e.code === 'ArrowRight') { engine.stepFwd(10); updatePlayButton(); }
      if (e.code === 'ArrowUp') { engine.backToSentenceStart(); updatePlayButton(); }
    });
  }

  /** Abre un libro guardado (por id) en la pantalla de lectura.
   *  Devuelve true si se abrió correctamente, false si el libro ya no
   *  existe (por ejemplo, borrado justo antes de hacer click en la tarjeta). */
  async function open(bookId) {
    book = await Storage.getBook(bookId);
    if (!book) return false;

    populateChapterSelect();
    els.bookTitle.textContent = book.title;
    els.ppmSlider.value = book.basePPM || 320;
    els.ppmValue.textContent = book.basePPM || 320;

    // Reseteamos el agrupamiento de palabras a 1 en cada apertura, para que
    // no quede "pegado" el valor de un libro anterior (cada libro empieza
    // en el modo de lectura más simple por default).
    document.querySelectorAll('.groupBtn').forEach(b => {
      b.classList.toggle('active', b.dataset.group === '1');
    });
    els.wordrow.setAttribute('data-group-size', '1');

    engine = new RsvpEngine({
      chapters: book.chapters,
      onWord: renderWord,
      onDone: () => { updatePlayButton(); doSave(); },
    });
    engine.basePPM = book.basePPM || 320;
    engine.wordsPerGroup = 1;
    // Reseteamos la base de conteo de estadísticas a la posición de
    // arranque de ESTE libro. Si no lo hiciéramos, el delta de palabras
    // leídas se calcularía contra la posición absoluta del libro anterior,
    // pudiendo quedar negativo y no contar nada hasta "alcanzarla".
    statsBasePos = book.finished ? 0 : (book.pos || 0);

    const hasProgress = book.pos > 0 && book.pos < engine.totalWords() - 1 && !book.finished;
    if (hasProgress) {
      const pct = Math.round((book.pos / engine.totalWords()) * 100);
      els.resumeText.textContent = I18N.t('resumeText', { pos: book.pos, total: engine.totalWords(), pct });
      els.resumeBanner.classList.remove('hidden');
      engine.pos = book.pos;
    } else {
      els.resumeBanner.classList.add('hidden');
      engine.pos = book.finished ? 0 : (book.pos || 0);
    }

    engine.renderCurrent();
    applyPremiumLimits();
    updateLiveRate();
    updatePlayButton();
    book.lastOpenedAt = Date.now();
    await Storage.saveBook(book);
    return true;
  }

  /** Refresca los textos que se generan dinámicamente en JS (no cubiertos
   *  por data-i18n) tras un cambio de idioma, sin perder el estado de
   *  reproducción actual (no reabre el libro, solo repinta texto). */
  function refreshTexts() {
    if (!book || !engine) return;
    populateChapterSelect();
    els.chapterSelect.value = engine.currentChapterIdx();
    updatePlayButton();
    applyPremiumLimits();
    const hasProgress = book.pos > 0 && book.pos < engine.totalWords() - 1 && !book.finished;
    if (hasProgress) {
      const pct = Math.round((book.pos / engine.totalWords()) * 100);
      els.resumeText.textContent = I18N.t('resumeText', { pos: book.pos, total: engine.totalWords(), pct });
    }
  }

  function init(backCallback) {
    onBack = backCallback;
    cacheEls();
    initEvents();
  }

  return {
    init, open, refreshTexts,
    isOpen: () => !!book && !document.getElementById('readerScreen').classList.contains('hidden'),
    show: () => document.getElementById('readerScreen').classList.remove('hidden'),
    hide: () => {
      if (engine) engine.pause();
      document.getElementById('readerScreen').classList.add('hidden');
    },
  };
})();

window.Reader = Reader;
