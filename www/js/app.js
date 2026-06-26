// app.js — Arranque de la aplicación. Conecta Library <-> Reader.

function goToLibrary() {
  Reader.hide();
  Library.show();
  Library.render();
}

function goToReader(bookId) {
  Reader.open(bookId).then(() => {
    Library.hide();
    Reader.show();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  Reader.init(goToLibrary);
  Library.init(goToReader);
});
