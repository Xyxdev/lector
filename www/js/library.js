// library.js — Pantalla de biblioteca: lista de libros guardados,
// importación de nuevos archivos y borrado.

const Library = (() => {
  const els = {};
  let onOpenBook = null; // callback inyectado por app.js

  function cacheEls() {
    ['libraryScreen', 'libraryStatus', 'libraryEmpty', 'shelf', 'addBookBtn', 'fileInput']
      .forEach(id => els[id] = document.getElementById(id));
  }

  // Genera un color de "lomo" estable a partir del título, para que cada
  // libro se sienta distinto en el estante sin necesitar portadas reales.
  function spineColorFor(title) {
    let hash = 0;
    for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
    const hue = hash % 360;
    return `hsl(${hue}, 38%, 32%)`;
  }

  function setStatus(kind, msg) {
    if (!msg) { els.libraryStatus.innerHTML = ''; return; }
    els.libraryStatus.innerHTML = `<div class="libraryStatus ${kind}">${escapeHtml(msg)}</div>`;
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.textContent ? div.innerHTML : '';
  }

  function formatLabel(format) {
    return { epub: 'EPUB', txt: 'TXT', pdf: 'PDF' }[format] || format.toUpperCase();
  }

  async function render() {
    const books = await Storage.getAllBooksMeta();
    if (books.length === 0) {
      els.libraryEmpty.classList.remove('hidden');
      els.shelf.classList.add('hidden');
      return;
    }
    els.libraryEmpty.classList.add('hidden');
    els.shelf.classList.remove('hidden');
    els.shelf.innerHTML = '';

    books.forEach(book => {
      const pct = book.totalWords ? Math.round((book.pos / book.totalWords) * 100) : 0;
      const card = document.createElement('div');
      card.className = 'bookCard glass';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.innerHTML = `
        <div class="bookSpine" style="background:${spineColorFor(book.title)}"></div>
        <div class="bookBody">
          <div class="bookTopRow">
            <div class="bookCardTitle">${escapeHtml(book.title)}</div>
            <div class="bookFormatTag">${formatLabel(book.format)}</div>
          </div>
          ${book.author ? `<div class="bookCardAuthor">${escapeHtml(book.author)}</div>` : ''}
          <div class="bookMetaRow">
            <div class="bookProgressTrack"><div class="bookProgressFill ${book.finished ? 'finished' : ''}" style="width:${pct}%"></div></div>
            <div class="bookPct">${book.finished ? 'leído' : pct + '%'}</div>
          </div>
        </div>
        <button class="bookDeleteBtn" aria-label="Eliminar libro">×</button>
      `;
      card.addEventListener('click', (e) => {
        if (e.target.closest('.bookDeleteBtn')) return;
        if (onOpenBook) onOpenBook(book.id);
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (onOpenBook) onOpenBook(book.id); }
      });
      card.querySelector('.bookDeleteBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        confirmDelete(book.id, book.title);
      });
      els.shelf.appendChild(card);
    });
  }

  function confirmDelete(id, title) {
    const root = document.getElementById('modalRoot');
    root.innerHTML = `
      <div class="modalOverlay">
        <div class="modalCard glass">
          <div class="modalTitle">¿Eliminar este libro?</div>
          <div class="modalBody">Se borrará «${escapeHtml(title)}» y tu progreso de lectura. Esta acción no se puede deshacer.</div>
          <div class="modalActions">
            <button id="modalCancel">Cancelar</button>
            <button id="modalConfirm" class="danger">Eliminar</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('modalCancel').addEventListener('click', () => { root.innerHTML = ''; });
    document.getElementById('modalConfirm').addEventListener('click', async () => {
      root.innerHTML = '';
      await Storage.deleteBook(id);
      render();
    });
  }

  function detectFormat(file) {
    if (/\.epub$/i.test(file.name)) return 'epub';
    if (/\.txt$/i.test(file.name)) return 'txt';
    return null;
  }

  async function importFile(file) {
    const format = detectFormat(file);
    if (!format) {
      setStatus('error', 'Formato no soportado. Por ahora: .epub y .txt.');
      return;
    }
    setStatus('loading', 'Leyendo el libro…');
    try {
      let parsed;
      if (format === 'epub') parsed = await EpubParser.parseEpub(file);
      else parsed = await TxtParser.parseTxt(file);

      const id = Storage.idFor(file);
      const existing = await Storage.getBook(id);
      const book = {
        id,
        title: parsed.title,
        author: parsed.author || '',
        format,
        chapters: parsed.chapters,
        addedAt: existing ? existing.addedAt : Date.now(),
        lastOpenedAt: existing ? existing.lastOpenedAt : null,
        pos: existing ? existing.pos : 0,
        totalWords: parsed.chapters.reduce((sum, c) => sum + c.words.length, 0),
        basePPM: existing ? existing.basePPM : 320,
        coverColor: spineColorFor(parsed.title),
        finished: existing ? existing.finished : false,
      };
      await Storage.saveBook(book);
      setStatus(null, null);
      render();
    } catch (err) {
      console.error(err);
      const msg = err && err.message ? err.message : 'No se pudo leer el archivo.';
      setStatus('error', msg);
    }
  }

  function initEvents() {
    els.addBookBtn.addEventListener('click', () => els.fileInput.click());
    els.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (file) importFile(file);
    });
  }

  function init(openBookCallback) {
    onOpenBook = openBookCallback;
    cacheEls();
    initEvents();
    render();
  }

  return {
    init, render,
    show: () => document.getElementById('libraryScreen').classList.remove('hidden'),
    hide: () => document.getElementById('libraryScreen').classList.add('hidden'),
  };
})();

window.Library = Library;
