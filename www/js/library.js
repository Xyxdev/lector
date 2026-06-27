// library.js — Pantalla de biblioteca: lista de libros guardados,
// importación de nuevos archivos y borrado.

const Library = (() => {
  const els = {};
  let onOpenBook = null; // callback inyectado por app.js

  function cacheEls() {
    ['libraryScreen', 'libraryStatus', 'libraryEmpty', 'shelf', 'addBookBtn', 'fileInput',
     'statsStrip', 'statStreak', 'statWords', 'statMinutes']
      .forEach(id => els[id] = document.getElementById(id));
  }

  // Asigna a cada libro uno de los 5 tonos pastel del sistema de diseño,
  // de forma estable según su título (mismo libro = mismo color siempre).
  // Devuelve el índice (1-5) en vez de un color hsl arbitrario, para que
  // la tarjeta entera (fondo + texto) use las variables --pastel-N del CSS
  // y se vea bien tanto en modo claro como oscuro.
  const PASTEL_COUNT = 5;
  function pastelIndexFor(title) {
    let hash = 0;
    for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
    return (hash % PASTEL_COUNT) + 1;
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

  async function renderStats() {
    let summary;
    try {
      summary = await Storage.getStatsSummary();
    } catch (err) {
      // Si falla, simplemente no mostramos la tira — no es crítico para
      // poder seguir usando la biblioteca, así que no bloqueamos nada.
      els.statsStrip.classList.add('hidden');
      return;
    }
    // Solo mostramos la tira si hay algo real que contar; en la primera
    // apertura de la app (sin lectura todavía) no tiene sentido mostrar
    // ceros — sería ruido visual sin valor.
    if (summary.totalWords <= 0) {
      els.statsStrip.classList.add('hidden');
      return;
    }
    els.statStreak.textContent = summary.streakDays;
    els.statWords.textContent = summary.totalWords >= 1000
      ? (summary.totalWords / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
      : String(summary.totalWords);
    els.statMinutes.textContent = summary.totalMinutes;
    els.statsStrip.classList.remove('hidden');
  }

  async function render() {
    renderStats();
    let books;
    try {
      books = await Storage.getAllBooksMeta();
    } catch (err) {
      console.error(err);
      // Sin esto, un fallo de IndexedDB (navegador muy restrictivo, cuota
      // agotada) deja la pantalla completamente en blanco sin explicación.
      els.libraryEmpty.classList.add('hidden');
      els.shelf.classList.add('hidden');
      setStatus('error', (err && err.message) || 'No se pudo acceder al almacenamiento del dispositivo.');
      return;
    }
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
      const pIdx = pastelIndexFor(book.title);
      const card = document.createElement('div');
      card.className = 'bookCard';
      card.style.background = `var(--pastel-${pIdx})`;
      card.style.color = `var(--pastel-${pIdx}-ink)`;
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.innerHTML = `
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
        <div class="modalCard">
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
      Haptics.medium();
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

  const MAX_FILE_SIZE_MB = 60;
  let importing = false;

  async function importFile(file) {
    if (importing) return; // evita disparar una segunda importación en paralelo
    const format = detectFormat(file);
    if (!format) {
      setStatus('error', 'Formato no soportado. Por ahora: .epub y .txt.');
      return;
    }
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_FILE_SIZE_MB) {
      setStatus('error', `El archivo pesa ${sizeMB.toFixed(0)} MB. Por ahora el límite es ${MAX_FILE_SIZE_MB} MB para evitar que la app se trabe al procesarlo.`);
      return;
    }

    importing = true;
    els.addBookBtn.disabled = true;
    els.addBookBtn.style.opacity = '0.5';
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
        coverColor: pastelIndexFor(parsed.title),
        finished: existing ? existing.finished : false,
      };
      await Storage.saveBook(book);
      setStatus(null, null);
      render();
    } catch (err) {
      console.error(err);
      const msg = err && err.message ? err.message : 'No se pudo leer el archivo.';
      setStatus('error', msg);
    } finally {
      importing = false;
      els.addBookBtn.disabled = false;
      els.addBookBtn.style.opacity = '1';
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

  function notifyMissingBook() {
    setStatus('error', 'Ese libro ya no está disponible (puede que se haya eliminado). Actualizamos tu biblioteca.');
    render();
  }

  return {
    init, render, notifyMissingBook,
    show: () => document.getElementById('libraryScreen').classList.remove('hidden'),
    hide: () => document.getElementById('libraryScreen').classList.add('hidden'),
  };
})();

window.Library = Library;
