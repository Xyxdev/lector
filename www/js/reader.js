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
     'savedBadge', 'finishedBadge']
      .forEach(id => els[id] = document.getElementById(id));
  }

  function populateChapterSelect() {
    els.chapterSelect.innerHTML = '';
    book.chapters.forEach((ch, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `Cap. ${i + 1} — ${ch.title}`;
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
    els.playBtn.setAttribute('aria-label', engine.playing ? 'Pausar' : 'Reproducir');
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

  function setGroupSize(n) {
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
      engine.basePPM = parseInt(e.target.value, 10);
      els.ppmValue.textContent = engine.basePPM;
      updateLiveRate();
    });

    els.adaptiveToggle.addEventListener('change', (e) => {
      engine.adaptive = e.target.checked;
    });

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

    // El color del stage es el mismo tono pastel asignado a este libro en
    // la biblioteca. coverColor puede venir como índice 1-5 (formato
    // actual) o como un string hsl() de versiones anteriores de la app;
    // en ese caso caemos al pastel 1 en vez de romper el render.
    const pIdx = (typeof book.coverColor === 'number' && book.coverColor >= 1 && book.coverColor <= 5)
      ? book.coverColor : 1;
    const stageBg = getComputedStyle(document.documentElement).getPropertyValue(`--pastel-${pIdx}`).trim();
    const stageInk = getComputedStyle(document.documentElement).getPropertyValue(`--pastel-${pIdx}-ink`).trim();
    els.stage.style.background = stageBg;
    els.stage.style.setProperty('--pastel-1-ink', stageInk);

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
      els.resumeText.textContent = `Quedaste en la palabra ${book.pos} de ${engine.totalWords()} (${pct}%)`;
      els.resumeBanner.classList.remove('hidden');
      engine.pos = book.pos;
    } else {
      els.resumeBanner.classList.add('hidden');
      engine.pos = book.finished ? 0 : (book.pos || 0);
    }

    engine.renderCurrent();
    updateLiveRate();
    updatePlayButton();
    book.lastOpenedAt = Date.now();
    await Storage.saveBook(book);
    return true;
  }

  function init(backCallback) {
    onBack = backCallback;
    cacheEls();
    initEvents();
  }

  return {
    init, open,
    show: () => document.getElementById('readerScreen').classList.remove('hidden'),
    hide: () => {
      if (engine) engine.pause();
      document.getElementById('readerScreen').classList.add('hidden');
    },
  };
})();

window.Reader = Reader;
