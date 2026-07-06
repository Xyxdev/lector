// rsvp-engine.js - RSVP reading engine.
// Classic-script module: exposes window.RsvpEngine and window.RsvpTextProcessor.
(function () {

const PARAGRAPH_MARK = '\u00b6';
const LEGACY_PARAGRAPH_MARK = '\u00c2\u00b6';
const TARGET_EASING = 0.12;

const COMMON_WORDS = new Set((
  'the of and to in a is that it for on you with as was are be this have from or by not at but ' +
  'he she they we i his her their our my your me him them us do does did so if an can will would ' +
  'could should there what when where who how all one about into more no up out time some ' +
  'el la los las de del y a en que un una es por con no se su para como al lo mas o pero sus le ' +
  'ha me si sin sobre este esta estos estas entre cuando donde quien todo todos hay ser son fue'
).split(/\s+/));

function hasParagraphMark(word) {
  const value = String(word || '');
  return value.includes(PARAGRAPH_MARK) || value.includes(LEGACY_PARAGRAPH_MARK);
}

function stripMarks(word) {
  return String(word || '')
    .split(PARAGRAPH_MARK).join('')
    .split(LEGACY_PARAGRAPH_MARK).join('');
}

function normalizeWord(word) {
  return stripMarks(word)
    .normalize ? stripMarks(word).normalize('NFC') : stripMarks(word);
}

function coreOf(word) {
  return normalizeWord(word).replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

function lowerCore(word) {
  return coreOf(word).toLocaleLowerCase();
}

function punctuationType(word) {
  const clean = normalizeWord(word);
  if (/[.!?\u2026]+["')\]]*$/.test(clean)) return 'sentence';
  if (/[;:]+["')\]]*$/.test(clean)) return 'clause';
  if (/[,]+["')\]]*$/.test(clean)) return 'comma';
  if (/[\u2014\u2013-]+$/.test(clean)) return 'dash';
  return 'none';
}

function isDialogStart(word, prevWord) {
  const clean = normalizeWord(word);
  const prevEndsSentence = !prevWord || /[.!?\u2026\u00b6]$/.test(stripMarks(prevWord));
  return prevEndsSentence && /^[\u201c\u2018"'\u00ab\u00bf\u00a1-]/.test(clean);
}

function pivotIndexForCoreLength(len) {
  if (len <= 1) return 0;
  if (len <= 5) return 1;
  if (len <= 9) return Math.floor(len * 0.35);
  return Math.floor(len * 0.4);
}

function tokenDelayFactor(meta) {
  let factor = 1;
  if (meta.length >= 7) factor += Math.min(0.55, (meta.length - 6) * 0.055);
  if (meta.hasNumber) factor += 0.22;
  if (!meta.isCommon && meta.length >= 6) factor += 0.12;
  if (meta.dialogStart) factor += 0.18;

  if (meta.punctuation === 'sentence') factor += 0.85;
  else if (meta.punctuation === 'clause') factor += 0.52;
  else if (meta.punctuation === 'comma') factor += 0.32;
  else if (meta.punctuation === 'dash') factor += 0.36;

  if (meta.paragraphEnd) factor = Math.max(factor, 2.15);
  return factor;
}

function analyzeToken(raw, index, prevRaw) {
  const clean = normalizeWord(raw);
  const core = coreOf(raw);
  const lower = core.toLocaleLowerCase();
  const leading = clean.match(/^[^\p{L}\p{N}]*/u)?.[0] || '';
  const paragraphEnd = hasParagraphMark(raw);
  const punctuation = punctuationType(raw);
  const meta = {
    raw,
    clean,
    core,
    lower,
    index,
    length: core.length || clean.length,
    hasNumber: /\p{N}/u.test(core),
    isCommon: COMMON_WORDS.has(lower),
    punctuation,
    paragraphEnd,
    sentenceStart: !prevRaw || /[.!?\u2026]/.test(stripMarks(prevRaw).slice(-1)) || hasParagraphMark(prevRaw),
    dialogStart: isDialogStart(raw, prevRaw),
    pivotPos: 0,
    delayFactor: 1,
  };

  const pivotInCore = pivotIndexForCoreLength(meta.length);
  meta.pivotPos = Math.min(clean.length - 1, leading.length + pivotInCore);
  meta.delayFactor = tokenDelayFactor(meta);
  return meta;
}

function buildFlatTokens(chapters) {
  const flatIndex = [];
  const tokens = [];
  chapters.forEach((ch, chapterIdx) => {
    (ch.words || []).forEach((raw, wordIdx) => {
      const prevRaw = tokens.length ? tokens[tokens.length - 1].raw : null;
      const token = analyzeToken(raw, tokens.length, prevRaw);
      token.chapterIdx = chapterIdx;
      token.wordIdx = wordIdx;
      flatIndex.push({ chapterIdx, wordIdx });
      tokens.push(token);
    });
  });
  return { flatIndex, tokens };
}

function splitSingleToken(token) {
  const clean = token.clean;
  const pivotPos = Math.max(0, Math.min(clean.length - 1, token.pivotPos));
  return {
    left: clean.slice(0, pivotPos),
    pivot: clean.slice(pivotPos, pivotPos + 1) || ' ',
    right: clean.slice(pivotPos + 1),
  };
}

class RsvpEngine {
  constructor({ chapters, onWord, onDone }) {
    this.chapters = chapters || [];
    const prepared = buildFlatTokens(this.chapters);
    this.flatIndex = prepared.flatIndex;
    this.tokens = prepared.tokens;

    this.pos = 0;
    this.playing = false;
    this.timer = null;
    this.rafId = null;
    this.nextAt = 0;

    this.basePPM = 320;
    this.targetPPM = 320;
    this.currentPPM = 320;
    this.wordsPerGroup = 1;
    this.adaptive = true;
    this.adaptMult = 1.0;
    this.pauseEvents = [];
    this.flowCount = 0;
    this.maxEffectivePPM = null;

    this.onWord = onWord || (() => {});
    this.onDone = onDone || (() => {});
  }

  totalWords() { return this.tokens.length; }
  totalGroups() { return Math.ceil(this.totalWords() / this.wordsPerGroup); }
  currentGroupIndex() { return Math.floor(this.pos / this.wordsPerGroup); }

  rawWordAt(pos) {
    const token = this.tokens[pos];
    return token ? token.raw : null;
  }

  tokenAt(pos) {
    return this.tokens[pos] || null;
  }

  currentGroupRaw() {
    return this.currentGroupTokens().map(t => t.raw);
  }

  currentGroupTokens() {
    const group = [];
    for (let i = 0; i < this.wordsPerGroup; i++) {
      const token = this.tokenAt(this.pos + i);
      if (token) group.push(token);
    }
    return group;
  }

  pivotAnchorIndex(groupRawOrTokens) {
    const group = groupRawOrTokens.map(item => typeof item === 'string' ? analyzeToken(item, 0, null) : item);
    let bestIdx = 0;
    let bestScore = -Infinity;
    const mid = (group.length - 1) / 2;
    group.forEach((token, i) => {
      const centerBonus = 1 - Math.abs(i - mid) * 0.15;
      const score = token.length + (token.hasNumber ? 1.5 : 0) + centerBonus;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    });
    return bestIdx;
  }

  splitPivot(groupRaw) {
    const group = (groupRaw || this.currentGroupRaw()).map((raw, idx) => {
      const token = this.tokenAt(this.pos + idx);
      return token && token.raw === raw ? token : analyzeToken(raw, idx, idx ? groupRaw[idx - 1] : null);
    });
    if (group.length === 0) return { left: '', pivot: '', right: '' };
    if (group.length === 1) return splitSingleToken(group[0]);

    const anchorIdx = this.pivotAnchorIndex(group);
    const anchor = group[anchorIdx];
    const split = splitSingleToken(anchor);
    const leftPrefix = group.slice(0, anchorIdx).map(t => t.clean).join(' ');
    const rightSuffix = group.slice(anchorIdx + 1).map(t => t.clean).join(' ');
    return {
      left: (leftPrefix ? leftPrefix + ' ' : '') + split.left,
      pivot: split.pivot,
      right: split.right + (rightSuffix ? ' ' + rightSuffix : ''),
    };
  }

  setBasePPM(ppm, { immediate = false } = {}) {
    const next = Math.max(60, Number(ppm) || 320);
    this.basePPM = next;
    this.targetPPM = next;
    if (immediate) this.currentPPM = next;
  }

  _smoothPPM() {
    if (Math.abs(this.currentPPM - this.targetPPM) < 0.5) {
      this.currentPPM = this.targetPPM;
    } else {
      this.currentPPM += (this.targetPPM - this.currentPPM) * TARGET_EASING;
    }
  }

  effectivePPM() {
    const raw = this.currentPPM / this.adaptMult;
    const capped = this.maxEffectivePPM ? Math.min(raw, this.maxEffectivePPM) : raw;
    return Math.round(capped);
  }

  delayForGroup(groupRaw) {
    const tokens = (groupRaw || this.currentGroupRaw()).map((raw, idx) => {
      const token = this.tokenAt(this.pos + idx);
      return token && token.raw === raw ? token : analyzeToken(raw, idx, idx ? groupRaw[idx - 1] : null);
    });
    return this.delayForTokens(tokens);
  }

  delayForTokens(tokens) {
    if (!tokens.length) return 0;
    this._smoothPPM();
    const ppm = this.effectivePPM();
    const baseDelayPerWord = 60000 / Math.max(1, ppm);
    const totalFactor = tokens.reduce((sum, token) => sum + token.delayFactor, 0);
    let delay = baseDelayPerWord * totalFactor;
    if (this.maxEffectivePPM) {
      const minDelay = (60000 / this.maxEffectivePPM) * tokens.length;
      delay = Math.max(delay, minDelay);
    }
    return delay;
  }

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

  registerFlow() {
    if (!this.adaptive) return;
    this.flowCount++;
    if (this.flowCount >= 50) {
      this.adaptMult = Math.max(0.7, this.adaptMult * 0.96);
      this.flowCount = 0;
    }
  }

  _emitCurrent() {
    const groupTokens = this.currentGroupTokens();
    if (groupTokens.length === 0) { this.onDone(); return false; }
    const { left, pivot, right } = this.splitPivot(groupTokens.map(t => t.raw));
    this.onWord({
      left, pivot, right,
      pos: this.pos,
      total: this.totalWords(),
      effectivePPM: this.effectivePPM(),
      tokens: groupTokens,
    });
    return true;
  }

  _advanceOrFinish() {
    this.pos += this.wordsPerGroup;
    if (this.pos >= this.totalWords()) {
      this.pos = Math.max(0, this.totalWords() - this.wordsPerGroup);
      this.pause();
      this._emitCurrent();
      this.onDone();
      return false;
    }
    return true;
  }

  _scheduleNext(delay) {
    this.nextAt = this._now() + delay;
    if (typeof requestAnimationFrame === 'function') {
      const loop = () => {
        if (!this.playing) return;
        if (this._now() >= this.nextAt) {
          if (!this._advanceOrFinish()) return;
          this._tick();
          return;
        }
        this.rafId = requestAnimationFrame(loop);
      };
      this.rafId = requestAnimationFrame(loop);
    } else {
      this.timer = setTimeout(() => {
        if (!this.playing) return;
        if (!this._advanceOrFinish()) return;
        this._tick();
      }, delay);
    }
  }

  _now() {
    return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  }

  _tick() {
    if (!this.playing) return;
    const groupTokens = this.currentGroupTokens();
    if (groupTokens.length === 0) { this.pause(); this.onDone(); return; }
    this._emitCurrent();
    this.registerFlow();
    this._scheduleNext(this.delayForTokens(groupTokens));
  }

  play() {
    if (this.totalWords() === 0) return;
    if (this.playing) return;
    if (this.pos >= this.totalWords()) this.pos = 0;
    this.setBasePPM(this.basePPM, { immediate: this.currentPPM == null });
    this.playing = true;
    this._tick();
  }

  pause() {
    const wasPlaying = this.playing;
    this.playing = false;
    clearTimeout(this.timer);
    this.timer = null;
    if (this.rafId && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this.rafId);
    this.rafId = null;
    if (wasPlaying) this.registerManualPause();
  }

  toggle() { this.playing ? this.pause() : this.play(); }

  seekToWord(pos) {
    this.pause();
    pos = Math.max(0, Math.min(this.totalWords() - 1, pos));
    this.pos = pos - (pos % this.wordsPerGroup);
    this._emitCurrent();
  }

  stepBack(nWords = 1) { this.seekToWord(this.pos - nWords); }
  stepFwd(nWords = 1) { this.seekToWord(this.pos + nWords); }

  isSentenceStart(pos) {
    if (pos <= 0) return true;
    const prev = this.tokenAt(pos - 1);
    return !prev || prev.punctuation === 'sentence' || prev.paragraphEnd;
  }

  isParagraphStart(pos) {
    if (pos <= 0) return true;
    const prev = this.tokenAt(pos - 1);
    return !prev || prev.paragraphEnd;
  }

  backToSentenceStart() {
    let i = this.pos;
    if (this.isSentenceStart(i) && i > 0) i--;
    while (i > 0 && !this.isSentenceStart(i)) i--;
    this.seekToWord(Math.max(0, i));
  }

  fwdToSentenceStart() {
    let i = Math.min(this.totalWords() - 1, this.pos + 1);
    while (i < this.totalWords() - 1 && !this.isSentenceStart(i)) i++;
    this.seekToWord(i);
  }

  backToParagraphStart() {
    let i = this.pos;
    if (this.isParagraphStart(i) && i > 0) i--;
    while (i > 0 && !this.isParagraphStart(i)) i--;
    this.seekToWord(Math.max(0, i));
  }

  fwdToParagraphStart() {
    let i = Math.min(this.totalWords() - 1, this.pos + 1);
    while (i < this.totalWords() - 1 && !this.isParagraphStart(i)) i++;
    this.seekToWord(i);
  }

  resetAdaptiveState() {
    this.adaptMult = 1.0;
    this.pauseEvents = [];
    this.flowCount = 0;
  }

  jumpToChapterStart(chapterIdx) {
    const idx = this.flatIndex.findIndex(f => f.chapterIdx === chapterIdx);
    if (idx >= 0) this.seekToWord(idx);
  }

  currentChapterIdx() {
    const token = this.tokenAt(this.pos);
    return token ? token.chapterIdx : 0;
  }

  renderCurrent() { this._emitCurrent(); }
}

window.RsvpEngine = RsvpEngine;
window.RsvpTextProcessor = {
  PARAGRAPH_MARK,
  LEGACY_PARAGRAPH_MARK,
  stripMarks,
  analyzeToken,
  buildFlatTokens,
  pivotIndexForCoreLength,
  tokenDelayFactor,
};
window.RSVP_PARAGRAPH_MARK = PARAGRAPH_MARK;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RsvpEngine, RsvpTextProcessor: window.RsvpTextProcessor };
}

})();
