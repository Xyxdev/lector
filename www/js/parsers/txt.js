// parsers/txt.js — Extrae palabras de un archivo .txt plano.
// Un TXT no tiene capítulos reales, así que lo tratamos como un solo
// capítulo, pero igual marcamos fin de párrafo (línea en blanco) para que
// el motor RSVP pueda pausar de forma natural.
(function () {

const PARAGRAPH_MARK = '¶';

class TxtParseError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code; // 'empty' | 'corrupt'
  }
}

async function parseTxt(file) {
  let text;
  try {
    text = await file.text();
  } catch (e) {
    throw new TxtParseError('No se pudo leer el archivo de texto.', 'corrupt');
  }

  // Si viene con BOM lo sacamos para no contarlo como "palabra".
  text = text.replace(/^\uFEFF/, '');

  const paragraphs = text.split(/\r?\n\s*\r?\n/);
  const words = [];
  paragraphs.forEach(p => {
    const clean = p.replace(/\r?\n/g, ' ').trim();
    if (!clean) return;
    const pWords = clean.split(/\s+/).filter(Boolean);
    if (pWords.length === 0) return;
    pWords[pWords.length - 1] += PARAGRAPH_MARK;
    words.push(...pWords);
  });

  if (words.length === 0) {
    throw new TxtParseError('El archivo de texto está vacío.', 'empty');
  }

  const title = file.name.replace(/\.txt$/i, '');
  return {
    title,
    author: '',
    chapters: [{ title: 'Texto completo', words }],
  };
}

window.TxtParser = { parseTxt, TxtParseError, PARAGRAPH_MARK };

})();
