// app.js — Arranque de la aplicación. Conecta Library <-> Reader.

function goToLibrary() {
  Reader.hide();
  Library.show();
  Library.render();
}

function goToReader(bookId) {
  Reader.open(bookId).then((success) => {
    if (success) {
      Library.hide();
      Reader.show();
    } else {
      // El libro ya no existe (por ejemplo, se borró justo antes del
      // click). Nos quedamos en la biblioteca y avisamos en vez de
      // mostrar una pantalla de lectura vacía y rota.
      Library.notifyMissingBook();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  Reader.init(goToLibrary);
  Library.init(goToReader);
});
