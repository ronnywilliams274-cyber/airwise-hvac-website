/* =====================================================================
   AIRWISE THEMES: three named color themes + floating switcher
     night  → Arctic Night   (default: deep navy, ice blue, ember)
     breeze → Summer Breeze  (bright: sky blue, aqua, coral, sunshine)
     gold   → Obsidian Gold  (premium: black, champagne gold, serif type)
   Colors for the page live in assets/css/style.css ([data-theme="..."]).
   Colors for the 3D scenes live in "scene" below.
   ===================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var STORE = 'airwise-theme';
  var THEMES = {
    night: {
      name: 'Arctic Night', meta: '#050A14',
      scene: {
        light: false, cold: ['#5ce1ff', '#2f7bff', '#d8f7ff'], hot: ['#ff7a45', '#ffb547', '#ff4d6d'],
        accent: '#5ce1ff', warm: '#ff7a45', off: '#22324d',
        housing: '#d3dbe4', louver: '#4a5668', pad: '#323a48', ground: '#0e1c34',
        label: { bg: '#0b1424', accent: '#5ce1ff', text: '#ffffff' }
      }
    },
    breeze: {
      name: 'Summer Breeze', meta: '#F5F9FF',
      scene: {
        light: true, cold: ['#00c2ff', '#0a7cff', '#6a3dff'], hot: ['#ff5a36', '#ffb300', '#ff2e63'],
        accent: '#0a7cff', warm: '#ff5a36', off: '#c7d6ec',
        housing: '#f4f7fb', louver: '#8ea6c4', pad: '#c3cfdd', ground: '#e3effd',
        label: { bg: '#ffffff', accent: '#0a7cff', text: '#0b1b33' }
      }
    },
    gold: {
      name: 'Obsidian Gold', meta: '#0A0908',
      scene: {
        light: false, cold: ['#e3c27d', '#f6e3b4', '#b8893f'], hot: ['#e07a4f', '#f2c46d', '#c23b52'],
        accent: '#e3c27d', warm: '#e07a4f', off: '#3a3226',
        housing: '#3a342b', louver: '#1d1a16', pad: '#1f1c18', ground: '#17140f',
        label: { bg: '#0f0d0a', accent: '#e3c27d', text: '#f6f0e6' }
      }
    }
  };
  window.AIRWISE_THEMES = THEMES;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wrap, fab, menu, opts = [], label;

  function current() { var t = root.getAttribute('data-theme'); return THEMES[t] ? t : 'night'; }

  function apply(name) {
    root.setAttribute('data-theme', name);
    try { window.localStorage.setItem(STORE, name); } catch (e) { /* private mode */ }
    var mt = document.querySelector('meta[name=theme-color]');
    if (mt) mt.setAttribute('content', THEMES[name].meta);
    syncUI();
    document.dispatchEvent(new CustomEvent('airwise:theme', { detail: { name: name, theme: THEMES[name] } }));
  }

  function set(name, origin) {
    if (!THEMES[name] || name === current()) return;
    var x = origin ? origin.x : window.innerWidth - 50;
    var y = origin ? origin.y : window.innerHeight - 50;
    if (document.startViewTransition && !reduced) {
      // circular "paint splash" reveal from the button
      try {
        var vt = document.startViewTransition(function () { apply(name); });
        vt.ready.then(function () {
          var r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
          root.animate(
            { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + r + 'px at ' + x + 'px ' + y + 'px)'] },
            { duration: 800, easing: 'cubic-bezier(.2,.7,.1,1)', pseudoElement: '::view-transition-new(root)' }
          );
        }).catch(function () { /* transition skipped */ });
        return;
      } catch (e) { /* fall through */ }
    }
    root.classList.add('theme-anim');
    apply(name);
    setTimeout(function () { root.classList.remove('theme-anim'); }, 700);
  }

  function syncUI() {
    var c = current();
    opts.forEach(function (o) { o.setAttribute('aria-checked', o.getAttribute('data-theme-set') === c ? 'true' : 'false'); });
    if (label) label.textContent = THEMES[c].name;
  }
  function isOpen() { return wrap && wrap.classList.contains('is-open'); }
  function open() {
    wrap.classList.add('is-open'); fab.setAttribute('aria-expanded', 'true');
    fab.classList.remove('is-hint');
    try { window.localStorage.setItem(STORE + '-seen', '1'); } catch (e) { /* noop */ }
    var cur = opts.filter(function (o) { return o.getAttribute('aria-checked') === 'true'; })[0] || opts[0];
    setTimeout(function () { if (cur) cur.focus({ preventScroll: true }); }, 60);
  }
  function close(refocus) {
    if (!isOpen()) return;
    wrap.classList.remove('is-open'); fab.setAttribute('aria-expanded', 'false');
    if (refocus) fab.focus({ preventScroll: true });
  }

  function init() {
    wrap = document.getElementById('theme-switch');
    if (!wrap) return;
    fab = document.getElementById('theme-fab');
    menu = document.getElementById('theme-menu');
    label = document.getElementById('theme-current');
    opts = Array.prototype.slice.call(wrap.querySelectorAll('[data-theme-set]'));
    syncUI();

    fab.addEventListener('click', function (e) { e.stopPropagation(); isOpen() ? close() : open(); });
    opts.forEach(function (o) {
      o.addEventListener('click', function (e) {
        e.stopPropagation();
        var r = fab.getBoundingClientRect();
        var origin = (e.clientX || e.clientY) ? { x: e.clientX, y: e.clientY } : { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        set(o.getAttribute('data-theme-set'), origin);
      });
    });
    document.addEventListener('click', function (e) { if (isOpen() && !wrap.contains(e.target)) close(); });
    document.addEventListener('keydown', function (e) {
      if (!isOpen()) return;
      if (e.key === 'Escape') { e.stopPropagation(); close(true); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        var i = opts.indexOf(document.activeElement);
        var n = (i + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length;
        opts[n].focus();
      }
    }, true);
    // hide while a pop-up or the mobile menu is open
    document.addEventListener('airwise:modal-open', function () { close(); });

    // gentle one-time hint so visitors notice the switcher
    var seen = null;
    try { seen = window.localStorage.getItem(STORE + '-seen'); } catch (e) { /* noop */ }
    if (!seen && !reduced) setTimeout(function () { if (!isOpen()) fab.classList.add('is-hint'); }, 5200);
  }

  window.AirwiseTheme = { set: set, get: current, themes: THEMES };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
