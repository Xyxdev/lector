// reader.js — Pantalla de lectura: conecta RsvpEngine con la UI,
// maneja el guardado de progreso y los controles (teclado, táctil, sliders).

const Reader = (() => {
  const els = {};
  let engine = null;
  let book = null;
  let onBack = null;
  let saveTimer = null;
  let savedFlashTimer = null;
  let landscapeQuery = null;
  // Posición desde la que empezamos a "contar" palabras leídas para las
  // estadísticas. Se resetea cada vez que el usuario salta manualmente
  // (adelante, atrás, cambia de capítulo) para no inflar el conteo con
  // navegación que no es lectura real; solo avanza por reproducción.
  let statsBasePos = 0;

  function cacheEls() {
    ['readerScreen', 'backBtn', 'bookTitle', 'chapterSelect',
     'stage', 'wordrow', 'wordLeft', 'wordPivot', 'wordRight',
     'tickerTrack', 'landscapePlayBtn', 'landscapeProgressText',
     'landscapeRateText', 'landscapeProgressFill',
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

  function displayTextFromParts(left, pivot, right) {
    return `${left || ''}${pivot || ''}${right || ''}`.replace(/\s+/g, ' ').trim();
  }

  function cleanTickerWord(word) {
    const paragraphMark = window.RSVP_PARAGRAPH_MARK || 'Â¶';
    return String(word || '')
      .split(paragraphMark).join('')
      .split('\u00b6').join('')
      .split('\u00c2\u00b6').join('')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tickerGroupTextAt(startPos) {
    if (!engine || startPos < 0 || startPos >= engine.totalWords()) return '';
    const words = [];
    for (let i = 0; i < engine.wordsPerGroup; i++) {
      const raw = engine.rawWordAt(startPos + i);
      if (raw) words.push(cleanTickerWord(raw));
    }
    return words.join(' ').trim();
  }

  function resetTicker() {
    renderTicker();
  }

  function renderTicker(currentText, pos) {
    if (!els.tickerTrack) return;
    els.tickerTrack.replaceChildren();
    if (!engine || !els.readerScreen.classList.contains('landscape-mode')) return;

    const group = Math.max(1, engine.wordsPerGroup || 1);
    for (let offset = -6; offset <= 5; offset++) {
      const itemPos = pos + (offset * group);
      const text = offset === 0 ? currentText : tickerGroupTextAt(itemPos);
      if (!text) continue;
      const span = document.createElement('span');
      const side = offset < 0 ? 'past' : offset > 0 ? 'future' : 'current';
      span.className = `tickerWord ${side} age-${Math.abs(offset)}`;
      span.textContent = text;
      els.tickerTrack.appendChild(span);
    }
  }

  function renderWord({ left, pivot, right, pos, total }) {
    els.wordLeft.textContent = left;
    els.wordPivot.textContent = pivot;
    els.wordRight.textContent = right;
    const currentText = displayTextFromParts(left, pivot, right);
    if (els.readerScreen.classList.contains('landscape-mode')) renderTicker(currentText, pos);
    const pct = total ? (pos / total) * 100 : 0;
    els.progressFill.style.width = pct + '%';
    if (els.landscapeProgressFill) els.landscapeProgressFill.style.width = pct + '%';
    if (els.landscapeProgressText) els.landscapeProgressText.textContent = `${Math.round(pct)}%`;
    if (els.landscapeRateText) els.landscapeRateText.textContent = `${engine.effectivePPM()} ppm`;
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
    if (els.landscapePlayBtn) {
      els.landscapePlayBtn.textContent = '';
      els.landscapePlayBtn.classList.toggle('is-playing', engine.playing);
      els.landscapePlayBtn.setAttribute('aria-label', engine.playing ? I18N.t('pauseAria') : I18N.t('playAria'));
    }
  }

  function togglePlay() {
    Haptics.light();
    engine.toggle();
    updatePlayButton();
    if (!engine.playing) { doSave(); flashSaved(); }
  }

  function updateLiveRate() {
    els.liveRate.textContent = engine.effectivePPM();
    if (els.landscapeRateText) els.landscapeRateText.textContent = `${engine.effectivePPM()} ppm`;
  }

  function repaintAfterManualMove() {
    resetTicker();
    updateLiveRate();
    updatePlayButton();
  }

  function changeSpeed(delta) {
    const min = parseInt(els.ppmSlider.min, 10);
    const max = parseInt(els.ppmSlider.max, 10);
    const cap = Storage.isPremium() ? max : FREE_LIMITS.MAX_PPM;
    const current = parseInt(els.ppmSlider.value, 10) || engine.basePPM;
    const next = Math.max(min, Math.min(cap, current + delta));
    if (next !== current) {
      els.ppmSlider.value = next;
      els.ppmValue.textContent = next;
      engine.setBasePPM(next);
      updateLiveRate();
    } else if (!Storage.isPremium() && current + delta > cap) {
      Premium.show(() => { applyPremiumLimits(); });
    }
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
        engine.setBasePPM(cap);
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
    resetTicker();
    engine.renderCurrent();
  }

  function syncLandscapeMode() {
    if (!els.readerScreen || !landscapeQuery) return;
    const active = landscapeQuery.matches && !els.readerScreen.classList.contains('hidden');
    const wasActive = els.readerScreen.classList.contains('landscape-mode');
    if (active === wasActive) return;
    els.readerScreen.classList.toggle('landscape-mode', active);
    resetTicker();
    if (active && engine) engine.renderCurrent();
  }

  function initEvents() {
    els.backBtn.addEventListener('click', () => {
      engine.pause();
      doSave();
      if (onBack) onBack();
    });

    els.playBtn.addEventListener('click', togglePlay);
    els.stage.addEventListener('click', togglePlay);
    if (els.landscapePlayBtn) {
      els.landscapePlayBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePlay();
      });
    }

    els.prevBtn.addEventListener('click', () => { resetTicker(); engine.stepBack(10); repaintAfterManualMove(); });
    els.nextBtn.addEventListener('click', () => { resetTicker(); engine.stepFwd(10); repaintAfterManualMove(); });
    els.sentenceBackBtn.addEventListener('click', () => { resetTicker(); engine.backToSentenceStart(); repaintAfterManualMove(); });

    els.chapterSelect.addEventListener('change', (e) => {
      resetTicker();
      engine.jumpToChapterStart(parseInt(e.target.value, 10));
      repaintAfterManualMove();
    });

    els.progressBar.addEventListener('click', (e) => {
      const rect = els.progressBar.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      resetTicker();
      engine.seekToWord(Math.floor(ratio * engine.totalWords()));
      repaintAfterManualMove();
    });

    // Soporte de teclado para el slider de progreso (rol "slider" ARIA
    // requiere poder moverse con flechas cuando tiene el foco).
    els.progressBar.addEventListener('keydown', (e) => {
      if (e.code === 'ArrowRight' || e.code === 'ArrowUp') {
        e.preventDefault();
        resetTicker();
        engine.stepFwd(10);
        repaintAfterManualMove();
      } else if (e.code === 'ArrowLeft' || e.code === 'ArrowDown') {
        e.preventDefault();
        resetTicker();
        engine.stepBack(10);
        repaintAfterManualMove();
      } else if (e.code === 'Home') {
        e.preventDefault();
        resetTicker();
        engine.seekToWord(0);
        repaintAfterManualMove();
      } else if (e.code === 'End') {
        e.preventDefault();
        resetTicker();
        engine.seekToWord(engine.totalWords() - 1);
        repaintAfterManualMove();
      }
    });

    els.ppmSlider.addEventListener('input', (e) => {
      let value = parseInt(e.target.value, 10);
      if (!Storage.isPremium() && value > FREE_LIMITS.MAX_PPM) {
        value = FREE_LIMITS.MAX_PPM;
        e.target.value = value;
        Premium.show(() => { applyPremiumLimits(); });
      }
      engine.setBasePPM(value);
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
      resetTicker();
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
      if (e.key === '+' || e.key === '=') { e.preventDefault(); changeSpeed(10); }
      if (e.key === '-' || e.key === '_') { e.preventDefault(); changeSpeed(-10); }
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        resetTicker();
        if (e.altKey) engine.backToParagraphStart();
        else if (e.shiftKey) engine.backToSentenceStart();
        else engine.stepBack(engine.wordsPerGroup);
        repaintAfterManualMove();
      }
      if (e.code === 'ArrowRight') {
        e.preventDefault();
        resetTicker();
        if (e.altKey) engine.fwdToParagraphStart();
        else if (e.shiftKey) engine.fwdToSentenceStart();
        else engine.stepFwd(engine.wordsPerGroup);
        repaintAfterManualMove();
      }
      if (e.code === 'ArrowUp') { e.preventDefault(); resetTicker(); engine.backToSentenceStart(); repaintAfterManualMove(); }
      if (e.code === 'ArrowDown') { e.preventDefault(); resetTicker(); engine.fwdToSentenceStart(); repaintAfterManualMove(); }
    });

    landscapeQuery = window.matchMedia('(orientation: landscape)');
    if (landscapeQuery.addEventListener) {
      landscapeQuery.addEventListener('change', syncLandscapeMode);
    } else if (landscapeQuery.addListener) {
      landscapeQuery.addListener(syncLandscapeMode);
    }
    window.addEventListener('resize', syncLandscapeMode);
  }

  /** Abre un libro guardado (por id) en la pantalla de lectura.
   *  Devuelve true si se abrió correctamente, false si el libro ya no
   *  existe (por ejemplo, borrado justo antes de hacer click en la tarjeta). */
  async function open(bookId) {
    book = await Storage.getBook(bookId);
    if (!book) return false;
    resetTicker();

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
    engine.setBasePPM(book.basePPM || 320, { immediate: true });
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
    show: () => {
      document.getElementById('readerScreen').classList.remove('hidden');
      syncLandscapeMode();
    },
    hide: () => {
      if (engine) engine.pause();
      document.getElementById('readerScreen').classList.add('hidden');
      syncLandscapeMode();
    },
  };
})();

window.Reader = Reader;
