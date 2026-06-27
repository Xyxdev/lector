// storage.js — Persistencia local: biblioteca de libros + progreso + preferencias.
// Usa IndexedDB para el contenido de los libros (puede ser pesado) y
// localStorage para preferencias chicas (es sincrónico y más simple para eso).

const DB_NAME = 'rez-lector';
const DB_VERSION = 2; // v2: agrega el store de estadísticas de lectura (stats)
const STORE_BOOKS = 'books';
const STORE_STATS = 'stats'; // keyPath: 'date' (YYYY-MM-DD), value: { wordsRead, sessionsCount }

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('Este navegador no tiene almacenamiento local disponible (IndexedDB). Probá actualizar la app o usar otro navegador.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      // Migración segura: solo creamos lo que falta, nunca tocamos datos
      // existentes. Esto cubre tanto instalaciones nuevas (sin nada) como
      // actualizaciones desde la v1 (que ya tiene 'books' pero no 'stats').
      if (!db.objectStoreNames.contains(STORE_BOOKS)) {
        const store = db.createObjectStore(STORE_BOOKS, { keyPath: 'id' });
        store.createIndex('lastOpenedAt', 'lastOpenedAt');
      }
      if (!db.objectStoreNames.contains(STORE_STATS)) {
        db.createObjectStore(STORE_STATS, { keyPath: 'date' });
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

  // ---- Estadísticas de lectura ----
  // Guardamos un registro por día con la cantidad de palabras leídas ese
  // día. A partir de esos registros calculamos totales y racha de días
  // consecutivos sin necesidad de guardar un contador "racha" aparte
  // (que se desincroniza fácil); la racha siempre se deriva de las fechas
  // reales, así que nunca puede quedar inconsistente.
  todayKey() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  },

  /** Suma `delta` palabras al contador del día de hoy (crea el registro si no existe). */
  async addWordsReadToday(delta) {
    if (!delta || delta <= 0) return;
    const today = this.todayKey();
    const store = await tx(STORE_STATS, 'readwrite');
    return new Promise((resolve, reject) => {
      const getReq = store.get(today);
      getReq.onsuccess = () => {
        const existing = getReq.result || { date: today, wordsRead: 0 };
        existing.wordsRead += delta;
        const putReq = store.put(existing);
        putReq.onsuccess = () => resolve(existing);
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  },

  async getAllStats() {
    const store = await tx(STORE_STATS, 'readonly');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  /** Resumen agregado: total de palabras leídas (de siempre), minutos
   *  estimados (a ~250 ppm de referencia, independiente de la velocidad
   *  real configurada, para tener una unidad estable de comparación), y
   *  racha de días consecutivos con actividad terminando hoy o ayer. */
  async getStatsSummary() {
    const all = await this.getAllStats();
    const totalWords = all.reduce((sum, d) => sum + (d.wordsRead || 0), 0);
    const totalMinutes = Math.round(totalWords / 250);

    const datesWithActivity = new Set(all.filter(d => d.wordsRead > 0).map(d => d.date));
    let streak = 0;
    const cursor = new Date();
    // Si hoy todavía no se leyó nada, la racha puede seguir contando desde
    // ayer (para no "romper" la racha de alguien a las 00:01 si todavía no
    // abrió la app hoy).
    if (!datesWithActivity.has(this.todayKey())) {
      cursor.setDate(cursor.getDate() - 1);
    }
    while (true) {
      const mm = String(cursor.getMonth() + 1).padStart(2, '0');
      const dd = String(cursor.getDate()).padStart(2, '0');
      const key = `${cursor.getFullYear()}-${mm}-${dd}`;
      if (!datesWithActivity.has(key)) break;
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    return { totalWords, totalMinutes, streakDays: streak, daysActive: datesWithActivity.size };
  },

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

  // ---- Premium (desbloqueo de pago único, $5) ----
  // NOTA IMPORTANTE: esto es una simulación local del desbloqueo, NO un
  // cobro real. No hay integración con Google Play Billing todavía.
  // setPremium(true) marca la app como desbloqueada en este dispositivo.
  // Cuando se conecte Billing real, el único cambio necesario es llamar
  // a setPremium(true) recién después de que Google confirme la compra
  // (en vez de hacerlo inmediatamente al tocar "comprar").
  isPremium() {
    return this.getPrefs().premium === true;
  },

  setPremium(value) {
    const prefs = this.getPrefs();
    prefs.premium = !!value;
    this.setPrefs(prefs);
  },
};

window.Storage = Storage;

// Límites de la versión gratuita. Centralizados aquí para que reader.js
// y library.js siempre chequeen el mismo número, en vez de tener "3" o
// "250" repetido y desincronizable en varios archivos.
window.FREE_LIMITS = {
  MAX_BOOKS: 3,
  MAX_PPM: 250,
  MAX_WORDS_PER_GROUP: 1,
};

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
