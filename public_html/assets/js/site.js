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

/* Continuous photo carousel; scrolling remains native, and motion pauses on interaction. */
(function () {
  var rail = document.querySelector('.rail');
  if (!rail) return;
  var track = rail.querySelector('.rail-track');
  var group = track && track.querySelector('.rail-group');
  if (!track || !group) return;

  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (motion.matches) {
    return;
  }

  var groupWidth = group.getBoundingClientRect().width;
  if (!groupWidth) return;
  function ensureLoopWidth() {
    while (track.scrollWidth <= rail.clientWidth + groupWidth) {
      var clone = group.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.querySelectorAll('img').forEach(function (img) { img.alt = ''; });
      track.appendChild(clone);
    }
  }
  ensureLoopWidth();
  window.addEventListener('resize', ensureLoopWidth);
  rail.classList.add('is-carousel');
  rail.classList.add('is-carousel');
  var frame = 0;
  var lastTime = 0;
  var resumeTimer = 0;

  function stop() {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
  }
  function start() {
    if (motion.matches || document.hidden || frame) return;
    frame = window.requestAnimationFrame(tick);
  }
  function tick(time) {
    if (lastTime) rail.scrollLeft += Math.min(time - lastTime, 50) * 0.025;
    lastTime = time;
    if (rail.scrollLeft >= groupWidth) rail.scrollLeft -= groupWidth;
    frame = window.requestAnimationFrame(tick);
  }
  rail.addEventListener('pointerenter', stop);
  rail.addEventListener('pointerleave', start);
  rail.addEventListener('focusin', stop);
  rail.addEventListener('focusout', function (event) {
    if (!rail.contains(event.relatedTarget)) start();
  });
  rail.addEventListener('touchstart', function () {
    window.clearTimeout(resumeTimer);
    stop();
  }, { passive: true });
  rail.addEventListener('touchend', function () {
    resumeTimer = window.setTimeout(start, 800);
  }, { passive: true });
  rail.addEventListener('touchcancel', function () {
    window.clearTimeout(resumeTimer);
    start();
  }, { passive: true });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });
  motion.addEventListener('change', function (event) {
    if (event.matches) {
      stop();
    } else {
      start();
    }
  });
  start();
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
