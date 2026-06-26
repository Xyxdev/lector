// reader.js — Pantalla de lectura: conecta RsvpEngine con la UI,
// maneja el guardado de progreso y los controles (teclado, táctil, sliders).

const Reader = (() => {
  const els = {};
  let engine = null;
  let book = null;
  let onBack = null;
  let saveTimer = null;
  let savedFlashTimer = null;

  function cacheEls() {
    ['readerScreen', 'backBtn', 'bookTitle', 'chapterSelect',
     'stage', 'wordLeft', 'wordPivot', 'wordRight',
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
      engine.seekToWord(0);
      updatePlayButton();
      els.resumeBanner.classList.add('hidden');
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') doSave();
    });
    window.addEventListener('beforeunload', doSave);

    document.addEventListener('keydown', (e) => {
      if (els.readerScreen.classList.contains('hidden')) return;
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      if (e.code === 'ArrowLeft') { engine.stepBack(10); updatePlayButton(); }
      if (e.code === 'ArrowRight') { engine.stepFwd(10); updatePlayButton(); }
      if (e.code === 'ArrowUp') { engine.backToSentenceStart(); updatePlayButton(); }
    });
  }

  /** Abre un libro guardado (por id) en la pantalla de lectura. */
  async function open(bookId) {
    book = await Storage.getBook(bookId);
    if (!book) return;

    populateChapterSelect();
    els.bookTitle.textContent = book.title;
    els.ppmSlider.value = book.basePPM || 320;
    els.ppmValue.textContent = book.basePPM || 320;

    engine = new RsvpEngine({
      chapters: book.chapters,
      onWord: renderWord,
      onDone: () => { updatePlayButton(); doSave(); },
    });
    engine.basePPM = book.basePPM || 320;

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
