/* Pill menu: opens a full-screen navigation panel. Works with touch and keyboard,
   Escape closes, focus stays inside the panel while it is open. */
(function () {
  var toggle = document.querySelector('.menu-toggle');
  var nav = document.getElementById('site-nav');
  if (!toggle || !nav) return;
  var label = toggle.querySelector('.menu-label');
  var header = document.querySelector('.site-header');

  function focusables() {
    return [toggle].concat(Array.prototype.slice.call(nav.querySelectorAll('a')));
  }
  function setOpen(open) {
    toggle.setAttribute('aria-expanded', String(open));
    nav.hidden = !open;
    document.documentElement.classList.toggle('menu-open', open);
    if (label) label.textContent = open ? 'Close' : 'Menu';
    if (open) {
      var cur = nav.querySelector('[aria-current="page"]') || nav.querySelector('a');
      if (cur) cur.focus();
    }
  }
  toggle.addEventListener('click', function () {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });
  document.addEventListener('keydown', function (e) {
    if (toggle.getAttribute('aria-expanded') !== 'true') return;
    if (e.key === 'Escape') { setOpen(false); toggle.focus(); return; }
    if (e.key === 'Tab') {
      var f = focusables(), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  window.matchMedia('(min-width: 1021px)').addEventListener('change', function (m) {
    if (m.matches && toggle.getAttribute('aria-expanded') === 'true') setOpen(false);
  });

  // Solid background for the floating bar once the page scrolls past the top.
  function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 40); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* Banner videos (home and every inner page): fade in when playing,
   pause/play control, start paused for reduced motion, fall back to the line drawing. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.bg-video').forEach(function (video) {
    var host = video.closest('.hero, .page-intro');
    var btn = host && host.querySelector('.video-toggle');
    var label = btn && btn.querySelector('.vt-label');
    function setPaused(paused) {
      if (paused) video.pause(); else { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
      if (btn) { btn.setAttribute('aria-pressed', String(paused)); label.textContent = paused ? 'Play video' : 'Pause video'; }
    }
    video.addEventListener('playing', function () { video.classList.add('is-ready'); });
    video.addEventListener('loadeddata', function () { video.classList.add('is-ready'); });
    var sources = video.querySelectorAll('source');
    if (sources.length) sources[sources.length - 1].addEventListener('error', function () {
      video.remove(); if (btn) btn.hidden = true;
    });
    if (btn) btn.addEventListener('click', function () { setPaused(!video.paused); });
    if (reduce) setPaused(true);
  });
  document.querySelectorAll('.video-toggle').forEach(function (btn) {
    var host = btn.closest('.hero, .page-intro') || btn.parentElement;
    if (!host.querySelector('.bg-video')) btn.hidden = true;
  });
})();

/* Stock photos: if one fails to load, remove it so the gold line drawing underneath shows. */
(function () {
  document.querySelectorAll('img[data-fallback]').forEach(function (img) {
    function drop() { img.remove(); }
    if (img.complete && img.naturalWidth === 0) drop();
    img.addEventListener('error', drop);
  });
})();

/* Home services panel: the preview image follows the hovered or focused row. */
(function () {
  var rows = document.querySelectorAll('.svc-row[data-preview]');
  var frames = document.querySelectorAll('.svc-preview [data-key]');
  if (!rows.length || !frames.length) return;
  function show(key) {
    rows.forEach(function (r) { r.classList.toggle('is-active', r.dataset.preview === key); });
    frames.forEach(function (f) { f.classList.toggle('is-active', f.dataset.key === key); });
  }
  rows.forEach(function (r) {
    var k = r.dataset.preview;
    r.addEventListener('mouseenter', function () { show(k); });
    r.addEventListener('focusin', function () { show(k); });
  });
})();

/* Services page: highlight the tab for the service in view. */
(function () {
  var tabs = document.querySelectorAll('.svc-tabs a[href^="#"]');
  if (!tabs.length || !('IntersectionObserver' in window)) return;
  var map = {};
  tabs.forEach(function (t) { map[t.getAttribute('href').slice(1)] = t; });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      tabs.forEach(function (t) { t.removeAttribute('aria-current'); });
      var t = map[e.target.id]; if (t) t.setAttribute('aria-current', 'true');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  Object.keys(map).forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
})();
