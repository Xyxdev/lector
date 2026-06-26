// rsvp-engine.js — El motor que decide qué mostrar y por cuánto tiempo.
// Mejoras sobre la v1:
//  - Agrupamiento configurable (1-3 palabras por flash): a velocidades altas,
//    mostrar de a 1 palabra cansa más que comprender de a 2-3 si son cortas.
//  - Pausas por fin de párrafo (marca ¶ insertada por los parsers), no solo
//    por puntuación de oración.
//  - El cálculo del ORP (Optimal Recognition Point) ahora se hace sobre el
//    grupo completo, eligiendo el pivote dentro de la palabra más larga del grupo.
//  - Adaptación de ritmo más suave y con memoria limitada (no se dispara con
//    un solo evento aislado).
(function () {

const PARAGRAPH_MARK = '¶';

function stripMarks(word) {
  return word.replace(new RegExp(PARAGRAPH_MARK, 'g'), '');
}

function endsParagraph(word) {
  return word.includes(PARAGRAPH_MARK);
}

class RsvpEngine {
  constructor({ chapters, onWord, onDone }) {
    this.chapters = chapters;       // [{title, words:[...]}]
    this.flatIndex = [];
    this.chapters.forEach((ch, ci) => {
      ch.words.forEach((_, wi) => this.flatIndex.push({ chapterIdx: ci, wordIdx: wi }));
    });

    this.pos = 0;
    this.playing = false;
    this.timer = null;

    this.basePPM = 320;
    this.wordsPerGroup = 1;     // 1, 2 o 3
    this.adaptive = true;
    this.adaptMult = 1.0;       // multiplicador de DELAY (más alto = más lento)
    this.pauseEvents = [];      // historial corto de pausas para suavizar adaptación
    this.flowCount = 0;

    this.onWord = onWord || (() => {});
    this.onDone = onDone || (() => {});
  }

  totalWords() { return this.flatIndex.length; }

  totalGroups() {
    return Math.ceil(this.totalWords() / this.wordsPerGroup);
  }

  currentGroupIndex() {
    return Math.floor(this.pos / this.wordsPerGroup);
  }

  rawWordAt(pos) {
    if (pos < 0 || pos >= this.flatIndex.length) return null;
    const { chapterIdx, wordIdx } = this.flatIndex[pos];
    return this.chapters[chapterIdx].words[wordIdx];
  }

  /** Devuelve las palabras crudas del grupo actual (con marcas de párrafo intactas). */
  currentGroupRaw() {
    const group = [];
    for (let i = 0; i < this.wordsPerGroup; i++) {
      const w = this.rawWordAt(this.pos + i);
      if (w) group.push(w);
    }
    return group;
  }

  /** Elige, dentro del grupo, la palabra "ancla" para calcular el pivote ORP. */
  pivotAnchorWord(groupRaw) {
    let longest = groupRaw[0] || '';
    for (const w of groupRaw) {
      if (stripMarks(w).length > stripMarks(longest).length) longest = w;
    }
    return longest;
  }

  /** Divide un grupo de palabras en left/pivot/right para el render con foco óptico. */
  splitPivot(groupRaw) {
    if (groupRaw.length === 0) return { left: '', pivot: '', right: '' };
    const display = groupRaw.map(stripMarks).join(' ');
    const anchor = stripMarks(this.pivotAnchorWord(groupRaw));
    const clean = anchor.replace(/^[^\wÀ-ÿ]+|[^\wÀ-ÿ]+$/g, '') || anchor;
    const len = clean.length;
    let pivotIdxInClean;
    if (len <= 1) pivotIdxInClean = 0;
    else if (len <= 5) pivotIdxInClean = 1;
    else if (len <= 9) pivotIdxInClean = Math.floor(len * 0.35);
    else pivotIdxInClean = Math.floor(len * 0.4);

    const anchorPosInDisplay = display.indexOf(anchor);
    const leadTrim = anchor.match(/^[^\wÀ-ÿ]*/)[0].length;
    const pivotPosInDisplay = anchorPosInDisplay >= 0
      ? anchorPosInDisplay + leadTrim + pivotIdxInClean
      : Math.floor(display.length / 2);

    const left = display.slice(0, pivotPosInDisplay);
    const pivot = display.slice(pivotPosInDisplay, pivotPosInDisplay + 1) || ' ';
    const right = display.slice(pivotPosInDisplay + 1);
    return { left, pivot, right };
  }

  /** Tiempo en ms que debe mostrarse el grupo actual. */
  delayForGroup(groupRaw) {
    const baseDelayPerWord = 60000 / this.basePPM;
    let delay = 0;
    groupRaw.forEach((w) => {
      const clean = stripMarks(w).replace(/[^\wÀ-ÿ]/g, '');
      const len = clean.length;
      const lengthFactor = 1 + Math.max(0, len - 6) * 0.05;
      let punctFactor = 1;
      if (/[.!?…]$/.test(stripMarks(w))) punctFactor = 2.0;
      else if (/[,;:—–]$/.test(stripMarks(w))) punctFactor = 1.4;
      if (endsParagraph(w)) punctFactor = Math.max(punctFactor, 2.6);
      delay += baseDelayPerWord * lengthFactor * punctFactor;
    });
    return delay * this.adaptMult;
  }

  effectivePPM() {
    return Math.round(this.basePPM / this.adaptMult);
  }

  /** Llamar cuando el usuario pausa manualmente: señal de "iba muy rápido". */
  registerManualPause() {
    if (!this.adaptive) return;
    const now = Date.now();
    this.pauseEvents.push(now);
    this.pauseEvents = this.pauseEvents.filter(t => now - t < 20000);
    this.flowCount = 0;
    if (this.pauseEvents.length >= 2) {
      this.adaptMult = Math.min(1.6, this.adaptMult * 1.1);
      this.pauseEvents = [];
    }
  }

  /** Llamar en cada grupo reproducido sin interrupción: señal de "va cómodo". */
  registerFlow() {
    if (!this.adaptive) return;
    this.flowCount++;
    if (this.flowCount >= 50) {
      this.adaptMult = Math.max(0.7, this.adaptMult * 0.96);
      this.flowCount = 0;
    }
  }

  _emitCurrent() {
    const groupRaw = this.currentGroupRaw();
    if (groupRaw.length === 0) { this.onDone(); return false; }
    const { left, pivot, right } = this.splitPivot(groupRaw);
    this.onWord({
      left, pivot, right,
      pos: this.pos,
      total: this.totalWords(),
      effectivePPM: this.effectivePPM(),
    });
    return true;
  }

  _tick() {
    if (!this.playing) return;
    const groupRaw = this.currentGroupRaw();
    if (groupRaw.length === 0) { this.pause(); this.onDone(); return; }
    this._emitCurrent();
    this.registerFlow();
    const delay = this.delayForGroup(groupRaw);
    this.timer = setTimeout(() => {
      this.pos += this.wordsPerGroup;
      if (this.pos >= this.totalWords()) {
        this.pos = Math.max(0, this.totalWords() - this.wordsPerGroup);
        this.pause();
        this._emitCurrent();
        this.onDone();
        return;
      }
      this._tick();
    }, delay);
  }

  play() {
    if (this.totalWords() === 0) return;
    if (this.pos >= this.totalWords()) this.pos = 0;
    this.playing = true;
    this._tick();
  }

  pause() {
    const wasPlaying = this.playing;
    this.playing = false;
    clearTimeout(this.timer);
    if (wasPlaying) this.registerManualPause();
  }

  toggle() { this.playing ? this.pause() : this.play(); }

  seekToWord(pos) {
    this.pause();
    this.pos = Math.max(0, Math.min(this.totalWords() - 1, pos));
    this._emitCurrent();
  }

  stepBack(nWords = 10) { this.seekToWord(this.pos - nWords); }
  stepFwd(nWords = 10) { this.seekToWord(this.pos + nWords); }

  /** Retrocede hasta el inicio de la oración actual (o la anterior, si ya
   *  se estaba parado justo en el inicio de la actual). */
  isSentenceStart(pos) {
    if (pos <= 0) return true;
    return /[.!?…¶]$/.test(this.rawWordAt(pos - 1) || '');
  }

  backToSentenceStart() {
    let i = this.pos;
    // Si ya estamos en el inicio de una oración, retrocedemos una más,
    // para que repetir la acción tenga sentido (oración anterior, no la misma).
    if (this.isSentenceStart(i) && i > 0) i--;
    while (i > 0 && !this.isSentenceStart(i)) i--;
    this.seekToWord(Math.max(0, i));
  }

  jumpToChapterStart(chapterIdx) {
    const idx = this.flatIndex.findIndex(f => f.chapterIdx === chapterIdx);
    if (idx >= 0) this.seekToWord(idx);
  }

  currentChapterIdx() {
    if (this.pos < 0 || this.pos >= this.flatIndex.length) return 0;
    return this.flatIndex[this.pos].chapterIdx;
  }

  renderCurrent() { this._emitCurrent(); }
}

window.RsvpEngine = RsvpEngine;
window.RSVP_PARAGRAPH_MARK = PARAGRAPH_MARK;

})();
