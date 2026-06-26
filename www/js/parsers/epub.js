// parsers/epub.js — Extrae título, autor y capítulos de un archivo .epub
// Mejoras sobre la v1:
//  - Usa el índice real del libro (nav.xhtml epub3 o toc.ncx epub2) para
//    nombrar capítulos, en vez de adivinar con el primer <h1>/<h2> de cada archivo.
//  - Detecta EPUB con DRM (Adobe ADEPT / encryption.xml) y avisa en vez de fallar críptico.
//  - Conserva límites de párrafo como pausas largas (insertando un separador
//    que el motor RSVP interpreta como "fin de párrafo").
(function () {

function resolvePath(base, rel) {
  if (/^https?:\/\//i.test(rel)) return rel;
  if (rel.startsWith('/')) return rel.slice(1);
  const baseParts = base.split('/').filter(Boolean);
  baseParts.pop();
  const relParts = rel.split('/');
  for (const part of relParts) {
    if (part === '.' || part === '') continue;
    if (part === '..') baseParts.pop();
    else baseParts.push(part);
  }
  return baseParts.join('/');
}

function stripFragment(href) {
  return href.split('#')[0];
}

class EpubParseError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code; // 'drm' | 'corrupt' | 'empty'
  }
}

async function parseEpub(file) {
  let zip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch (e) {
    throw new EpubParseError('El archivo no es un .epub válido o está dañado.', 'corrupt');
  }

  if (zip.file('META-INF/encryption.xml')) {
    throw new EpubParseError(
      'Este EPUB tiene protección DRM (Adobe ADEPT u otra). No se puede leer el contenido.',
      'drm'
    );
  }

  const containerFile = zip.file('META-INF/container.xml');
  if (!containerFile) {
    throw new EpubParseError('Falta META-INF/container.xml: el EPUB está incompleto.', 'corrupt');
  }
  const containerXml = await containerFile.async('text');
  const containerDoc = new DOMParser().parseFromString(containerXml, 'application/xml');
  const rootfile = containerDoc.querySelector('rootfile');
  if (!rootfile) throw new EpubParseError('No se encontró el archivo .opf del libro.', 'corrupt');
  const opfPath = rootfile.getAttribute('full-path');
  const opfFile = zip.file(opfPath);
  if (!opfFile) throw new EpubParseError('No se encontró el archivo .opf del libro.', 'corrupt');
  const opfText = await opfFile.async('text');
  const opfDoc = new DOMParser().parseFromString(opfText, 'application/xml');

  const titleEl = opfDoc.querySelector('metadata title, title');
  const bookTitle = titleEl ? titleEl.textContent.trim() : file.name.replace(/\.epub$/i, '');
  const authorEl = opfDoc.querySelector('metadata creator, creator');
  const author = authorEl ? authorEl.textContent.trim() : '';

  const manifest = {};
  opfDoc.querySelectorAll('manifest > item').forEach(item => {
    manifest[item.getAttribute('id')] = {
      href: item.getAttribute('href'),
      type: item.getAttribute('media-type') || '',
      properties: item.getAttribute('properties') || '',
    };
  });

  const spineIds = Array.from(opfDoc.querySelectorAll('spine > itemref')).map(n => n.getAttribute('idref'));

  // --- Intentar resolver títulos de capítulo desde el índice real ---
  const titleByHref = await resolveTocTitles(zip, opfPath, manifest);

  const chapters = [];
  let chNum = 0;
  for (const id of spineIds) {
    const man = manifest[id];
    if (!man) continue;
    if (!/html|xml/i.test(man.type) && !/\.x?html?$/i.test(man.href)) continue;
    const fullPath = resolvePath(opfPath, man.href);
    const zf = zip.file(fullPath);
    if (!zf) continue;
    const html = await zf.async('text');
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script, style, nav').forEach(n => n.remove());

    const words = extractWordsWithParagraphBreaks(doc.body || doc.documentElement);
    if (words.length === 0) continue;

    chNum++;
    let chTitle = titleByHref[fullPath] || titleByHref[man.href];
    if (!chTitle) {
      const h = doc.querySelector('h1, h2, h3, title');
      chTitle = h ? h.textContent.trim().slice(0, 70) : '';
    }
    if (!chTitle) chTitle = `Capítulo ${chNum}`;
    chapters.push({ title: chTitle, words });
  }

  if (chapters.length === 0) {
    throw new EpubParseError('No se encontró texto legible en el EPUB.', 'empty');
  }

  return { title: bookTitle, author, chapters };
}

// Busca el nav.xhtml (epub3) o toc.ncx (epub2) y construye un mapa
// ruta-de-archivo -> título de capítulo, para nombrar bien el selector.
async function resolveTocTitles(zip, opfPath, manifest) {
  const map = {};

  // epub3: item con properties="nav"
  const navId = Object.keys(manifest).find(id => /nav/i.test(manifest[id].properties));
  if (navId) {
    const navPath = resolvePath(opfPath, manifest[navId].href);
    const navFile = zip.file(navPath);
    if (navFile) {
      try {
        const navHtml = await navFile.async('text');
        const navDoc = new DOMParser().parseFromString(navHtml, 'text/html');
        navDoc.querySelectorAll('a[href]').forEach(a => {
          const href = stripFragment(resolvePath(navPath, a.getAttribute('href')));
          const text = a.textContent.trim();
          if (text && !map[href]) map[href] = text;
        });
        return map;
      } catch (e) { /* seguimos al fallback ncx */ }
    }
  }

  // epub2: toc.ncx
  const ncxId = Object.keys(manifest).find(id => /ncx/i.test(manifest[id].type));
  if (ncxId) {
    const ncxPath = resolvePath(opfPath, manifest[ncxId].href);
    const ncxFile = zip.file(ncxPath);
    if (ncxFile) {
      try {
        const ncxXml = await ncxFile.async('text');
        const ncxDoc = new DOMParser().parseFromString(ncxXml, 'application/xml');
        ncxDoc.querySelectorAll('navPoint').forEach(np => {
          const src = np.querySelector('content')?.getAttribute('src');
          const text = np.querySelector('navLabel text')?.textContent.trim();
          if (src && text) {
            const href = stripFragment(resolvePath(ncxPath, src));
            if (!map[href]) map[href] = text;
          }
        });
      } catch (e) { /* sin TOC, usamos heurística de <h1> */ }
    }
  }
  return map;
}

// Extrae palabras del DOM, insertando un marcador especial '¶' al final de
// cada bloque de párrafo/encabezado para que el motor de lectura pueda
// hacer una pausa más larga ahí (lectura más natural).
const PARAGRAPH_MARK = '¶';

function extractWordsWithParagraphBreaks(root) {
  if (!root) return [];
  const blockSelector = 'p, h1, h2, h3, h4, h5, h6, blockquote, li, div';
  const blocks = root.querySelectorAll(blockSelector);

  if (blocks.length === 0) {
    const text = root.textContent || '';
    return text.split(/\s+/).map(w => w.trim()).filter(Boolean);
  }

  // Evitamos contar texto duplicado de divs que contienen p/h ya recorridos:
  // solo usamos bloques "de hoja" (sin descendientes de tipo bloque).
  const leafBlocks = Array.from(blocks).filter(el => !el.querySelector(blockSelector));
  const source = leafBlocks.length ? leafBlocks : Array.from(blocks);
  const words = [];

  source.forEach(block => {
    const text = (block.textContent || '').trim();
    if (!text) return;
    const blockWords = text.split(/\s+/).filter(Boolean);
    if (blockWords.length === 0) return;
    blockWords[blockWords.length - 1] += PARAGRAPH_MARK;
    words.push(...blockWords);
  });

  return words;
}

window.EpubParser = { parseEpub, EpubParseError, PARAGRAPH_MARK };

})();
