/* Gallery larger view: native <dialog>, keyboard operable, Escape or Close returns focus. */
(function () {
  var dlg = document.querySelector('.lightbox');
  var buttons = Array.prototype.slice.call(document.querySelectorAll('.g-open'));
  if (!dlg || !buttons.length || typeof dlg.showModal !== 'function') return;
  var img = dlg.querySelector('.lb-img');
  var cap = dlg.querySelector('.lb-caption');
  var current = 0, opener = null;

  function show(i) {
    current = (i + buttons.length) % buttons.length;
    var b = buttons[current];
    var thumb = b.querySelector('img');
    img.src = b.dataset.full;
    img.width = b.dataset.w; img.height = b.dataset.h;
    img.alt = thumb.alt;
    var fc = b.closest('figure').querySelector('figcaption');
    cap.textContent = fc ? fc.textContent.replace(/\s+/g, ' ').trim() : '';
  }
  buttons.forEach(function (b, i) {
    b.addEventListener('click', function () { opener = b; show(i); dlg.showModal(); dlg.querySelector('.lb-close').focus(); });
  });
  dlg.querySelector('.lb-close').addEventListener('click', function () { dlg.close(); });
  dlg.querySelector('.lb-prev').addEventListener('click', function () { show(current - 1); });
  dlg.querySelector('.lb-next').addEventListener('click', function () { show(current + 1); });
  dlg.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', function () { img.removeAttribute('src'); if (opener) opener.focus(); });
  if (buttons.length < 2) { dlg.querySelector('.lb-prev').hidden = true; dlg.querySelector('.lb-next').hidden = true; }
})();
