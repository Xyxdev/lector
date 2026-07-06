const assert = require('node:assert/strict');

global.window = global;
global.performance = { now: () => Date.now() };

const { RsvpEngine, RsvpTextProcessor } = require('../www/js/rsvp-engine.js');

function makeEngine(words, options = {}) {
  const events = [];
  const engine = new RsvpEngine({
    chapters: [{ title: 'Test', words }],
    onWord: (event) => events.push(event),
    onDone: () => {},
  });
  engine.setBasePPM(options.ppm || 300, { immediate: true });
  return { engine, events };
}

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`not ok - ${name}`);
    throw err;
  }
}

test('single-word ORP keeps the pivot inside the word', () => {
  const { engine } = makeEngine(['recognition']);
  const split = engine.splitPivot(['recognition']);
  assert.equal(split.left + split.pivot + split.right, 'recognition');
  assert.equal(split.pivot, 'g');
});

test('chunking keeps a letter-level pivot inside the anchor word', () => {
  const { engine } = makeEngine(['the', 'recognition', 'test']);
  engine.wordsPerGroup = 3;
  const split = engine.splitPivot(engine.currentGroupRaw());
  assert.equal(split.left + split.pivot + split.right, 'the recognition test');
  assert.equal(split.pivot, 'g');
});

test('long, uncommon, and numeric words receive longer delay factors', () => {
  const common = RsvpTextProcessor.analyzeToken('the', 0, null);
  const long = RsvpTextProcessor.analyzeToken('photosynthesis', 1, 'the');
  const number = RsvpTextProcessor.analyzeToken('2026', 2, 'photosynthesis');
  assert.ok(long.delayFactor > common.delayFactor);
  assert.ok(number.delayFactor > common.delayFactor);
});

test('punctuation and paragraph marks add natural pauses', () => {
  const plain = RsvpTextProcessor.analyzeToken('word', 0, null);
  const comma = RsvpTextProcessor.analyzeToken('word,', 0, null);
  const sentence = RsvpTextProcessor.analyzeToken('word.', 0, null);
  const paragraph = RsvpTextProcessor.analyzeToken(`word${RsvpTextProcessor.PARAGRAPH_MARK}`, 0, null);
  assert.ok(comma.delayFactor > plain.delayFactor);
  assert.ok(sentence.delayFactor > comma.delayFactor);
  assert.ok(paragraph.delayFactor > sentence.delayFactor);
});

test('sentence and paragraph navigation use preprocessed token metadata', () => {
  const { engine } = makeEngine(['One', 'sentence.', 'Second', `paragraph${RsvpTextProcessor.PARAGRAPH_MARK}`, 'Third']);
  engine.seekToWord(4);
  engine.backToSentenceStart();
  assert.equal(engine.pos, 2);
  engine.seekToWord(4);
  engine.backToParagraphStart();
  assert.equal(engine.pos, 0);
  engine.seekToWord(3);
  engine.backToSentenceStart();
  assert.equal(engine.pos, 2);
});

test('effective speed cap is respected in delay calculation', () => {
  const { engine } = makeEngine(['one', 'two'], { ppm: 600 });
  engine.maxEffectivePPM = 300;
  const delay = engine.delayForGroup(['one']);
  assert.ok(delay >= 200);
  assert.equal(engine.effectivePPM(), 300);
});

test('play is idempotent and does not emit duplicate first frames', () => {
  const { engine, events } = makeEngine(['one', 'two', 'three'], { ppm: 600 });
  engine.play();
  engine.play();
  engine.pause();
  assert.equal(events.length, 1);
  assert.equal(events[0].pos, 0);
});
