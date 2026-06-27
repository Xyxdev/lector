// storage.js — Persistencia local: biblioteca de libros + progreso + preferencias.
// Usa IndexedDB para el contenido de los libros (puede ser pesado) y
// localStorage para preferencias chicas (es sincrónico y más simple para eso).

const DB_NAME = 'rez-lector';
const DB_VERSION = 1;
const STORE_BOOKS = 'books';

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_BOOKS)) {
        const store = db.createObjectStore(STORE_BOOKS, { keyPath: 'id' });
        store.createIndex('lastOpenedAt', 'lastOpenedAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(storeName, mode) {
  return openDB().then(db => db.transaction(storeName, mode).objectStore(storeName));
}

function idFor(file) {
  // Id estable basado en nombre + tamaño. No es criptográficamente único,
  // pero alcanza para distinguir libros distintos en una biblioteca personal.
  return `${file.name}__${file.size}`;
}

const Storage = {

  /**
   * Guarda un libro completo en la biblioteca.
   * book: { id, title, author, format, chapters, addedAt, lastOpenedAt, pos, basePPM, coverColor }
   */
  async saveBook(book) {
    const store = await tx(STORE_BOOKS, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put(book);
      req.onsuccess = () => resolve(book);
      req.onerror = () => reject(req.error);
    });
  },

  async getBook(id) {
    const store = await tx(STORE_BOOKS, 'readonly');
    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  async getAllBooksMeta() {
    const store = await tx(STORE_BOOKS, 'readonly');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => {
        // No devolvemos el texto completo de los capítulos en el listado,
        // solo lo necesario para pintar la biblioteca — más liviano.
        const list = req.result.map(b => ({
          id: b.id,
          title: b.title,
          author: b.author,
          format: b.format,
          addedAt: b.addedAt,
          lastOpenedAt: b.lastOpenedAt,
          pos: b.pos,
          totalWords: b.totalWords,
          basePPM: b.basePPM,
          coverColor: b.coverColor,
          finished: b.finished || false,
        }));
        list.sort((a, b) => (b.lastOpenedAt || b.addedAt) - (a.lastOpenedAt || a.addedAt));
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  },

  async updateProgress(id, pos, totalWords, basePPM) {
    const book = await this.getBook(id);
    if (!book) return;
    book.pos = pos;
    book.totalWords = totalWords;
    book.basePPM = basePPM;
    book.lastOpenedAt = Date.now();
    book.finished = totalWords > 0 && pos >= totalWords - 1;
    await this.saveBook(book);
  },

  async deleteBook(id) {
    const store = await tx(STORE_BOOKS, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  idFor,

  // ---- Preferencias globales (no por libro) ----
  getPrefs() {
    try {
      const raw = localStorage.getItem('rez-lector:prefs');
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  },

  setPrefs(prefs) {
    try {
      localStorage.setItem('rez-lector:prefs', JSON.stringify(prefs));
    } catch (e) { /* almacenamiento no disponible, se ignora */ }
  },
};

window.Storage = Storage;

// ---- Feedback háptico (vibración corta) ----
// Usamos la Vibration API web estándar en vez del plugin nativo de
// Capacitor: a partir de Capacitor 7+ ya no es posible acceder a plugins
// nativos sin un bundler, y este proyecto se mantiene deliberadamente
// como scripts clásicos sin build step. navigator.vibrate() funciona
// directo dentro del WebView de Android (con el permiso VIBRATE
// declarado en el manifest) y no hace nada si el navegador no lo soporta,
// así que es seguro llamarlo sin chequeos adicionales.
window.Haptics = {
  light() { try { navigator.vibrate && navigator.vibrate(10); } catch (e) {} },
  medium() { try { navigator.vibrate && navigator.vibrate(18); } catch (e) {} },
};
