// library.js — Pantalla de biblioteca: lista de libros guardados,
// importación de nuevos archivos y borrado.

const Library = (() => {
  const els = {};
  let onOpenBook = null; // callback inyectado por app.js

  function cacheEls() {
    ['libraryScreen', 'libraryStatus', 'libraryEmpty', 'shelf', 'addBookBtn', 'fileInput',
     'statsArea', 'streakPill', 'streakValue', 'libraryAdSlot']
      .forEach(id => els[id] = document.getElementById(id));
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
      // Si falla, simplemente no mostramos nada de stats — no es crítico
      // para poder seguir usando la biblioteca.
      els.statsArea.innerHTML = '';
      els.streakPill.classList.add('hidden');
      return;
    }

    // Racha minimalista en el header: visible para todos (free y premium),
    // es el "gancho" de hábito que no tiene sentido esconder.
    if (summary.streakDays > 0) {
      els.streakValue.textContent = summary.streakDays;
      els.streakPill.classList.remove('hidden');
    } else {
      els.streakPill.classList.add('hidden');
    }

    // Sin actividad todavía: no mostramos ni tira ni teaser, sería ruido
    // en la primera apertura de la app.
    if (summary.totalWords <= 0) {
      els.statsArea.innerHTML = '';
      return;
    }

    if (Storage.isPremium()) {
      const wordsLabel = summary.totalWords >= 1000
        ? (summary.totalWords / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
        : String(summary.totalWords);
      els.statsArea.innerHTML = `
        <div class="statsStrip surface">
          <div class="statItem"><div class="statValue">${summary.streakDays}</div><div class="statLabel">días seguidos</div></div>
          <div class="statDivider"></div>
          <div class="statItem"><div class="statValue">${wordsLabel}</div><div class="statLabel">palabras leídas</div></div>
          <div class="statDivider"></div>
          <div class="statItem"><div class="statValue">${summary.totalMinutes}</div><div class="statLabel">minutos</div></div>
        </div>
      `;
    } else {
      // Teaser: muestra que hay algo ahí, sin dar el detalle completo,
      // invitando a desbloquear premium para verlo.
      els.statsArea.innerHTML = `
        <div class="statsTeaser surface" id="statsTeaserBtn">
          <div class="teaserIcon">📊</div>
          <div class="teaserText">Llevás <b>${summary.totalWords} palabras</b> leídas. <b>Premium</b> te muestra el detalle completo.</div>
          <div class="teaserArrow">›</div>
        </div>
      `;
      document.getElementById('statsTeaserBtn').addEventListener('click', () => Premium.show(onUnlocked));
    }
  }

  function onUnlocked() {
    render();
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
      els.libraryAdSlot.classList.add('hidden');
      return;
    }
    els.libraryEmpty.classList.add('hidden');
    els.shelf.classList.remove('hidden');
    els.shelf.innerHTML = '';

    const premium = Storage.isPremium();
    // getAllBooksMeta ya viene ordenado por lastOpenedAt/addedAt descendente
    // (más reciente primero) para la vista normal de "biblioteca". Pero el
    // límite gratis se calcula por orden de AGREGADO (los primeros 3 que
    // subiste quedan libres), no por los que más usás — si no, un libro que
    // ya estabas leyendo podría "bloquearse" solo por no abrirlo hace rato,
    // lo cual sería confuso e injusto para el usuario.
    const byAddedAsc = [...books].sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));
    const unlockedIds = new Set(byAddedAsc.slice(0, FREE_LIMITS.MAX_BOOKS).map(b => b.id));

    books.forEach(book => {
      const pct = book.totalWords ? Math.round((book.pos / book.totalWords) * 100) : 0;
      const isLocked = !premium && !unlockedIds.has(book.id);
      const card = document.createElement('div');
      card.className = 'bookCard' + (isLocked ? ' locked' : '');
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.innerHTML = `
        <div class="bookAccentBar"></div>
        <div class="bookBody">
          <div class="bookTopRow">
            <div class="bookCardTitle">${escapeHtml(book.title)}</div>
            ${isLocked ? '<div class="premiumLock">🔒 premium</div>' : `<div class="bookFormatTag">${formatLabel(book.format)}</div>`}
          </div>
          ${book.author ? `<div class="bookCardAuthor">${escapeHtml(book.author)}</div>` : ''}
          <div class="bookMetaRow">
            <div class="bookProgressTrack"><div class="bookProgressFill ${book.finished ? 'finished' : ''}" style="width:${isLocked ? 0 : pct}%"></div></div>
            <div class="bookPct">${isLocked ? 'bloqueado' : (book.finished ? 'leído' : pct + '%')}</div>
          </div>
        </div>
        <button class="bookDeleteBtn" aria-label="Eliminar libro">×</button>
      `;
      card.addEventListener('click', (e) => {
        if (e.target.closest('.bookDeleteBtn')) return;
        if (isLocked) { Premium.show(onUnlocked); return; }
        if (onOpenBook) onOpenBook(book.id);
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (isLocked) { Premium.show(onUnlocked); return; }
          if (onOpenBook) onOpenBook(book.id);
        }
      });
      card.querySelector('.bookDeleteBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        confirmDelete(book.id, book.title);
      });
      els.shelf.appendChild(card);
    });

    els.libraryAdSlot.classList.toggle('hidden', premium);
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
