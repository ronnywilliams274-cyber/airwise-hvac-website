/* =====================================================================
   AIRWISE HVAC SOLUTIONS: INTERACTIONS
   GSAP + ScrollTrigger + Lenis, with graceful fallbacks if a CDN fails.
   ===================================================================== */
(function () {
  'use strict';

  var C = window.AIRWISE_CONFIG || {};
  var S = (window.AIRWISE_STATE = window.AIRWISE_STATE || {});
  S.temp = 84; S.explode = 0; S.explodeAuto = false; S.pointer = { x: 0, y: 0 }; S.dial = null; S.userTemp = false;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var root = document.documentElement;
  var mqDesktop = window.matchMedia('(min-width: 1024px)');
  var mqFine = window.matchMedia('(pointer: fine)');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = !!(window.gsap && window.ScrollTrigger);
  var lenis = null;
  var menuOpen = false;
  var quoteSent = false;

  if (hasGSAP) { gsap.registerPlugin(ScrollTrigger); root.classList.add('gsap-ready'); ScrollTrigger.config({ ignoreMobileResize: true }); }
  else { root.classList.add('no-gsap'); console.warn('[Airwise] GSAP not available: using fallbacks'); }

  var store = {
    get: function (k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  /* ------------------------------------------------------------------ *
   * Toast
   * ------------------------------------------------------------------ */
  var toastTimer;
  function toast(msg) {
    var t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('is-show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('is-show'); }, 2800);
  }

  /* ------------------------------------------------------------------ *
   * 1. Config → DOM
   * ------------------------------------------------------------------ */
  function setText(sel, val) { if (val === undefined || val === null || val === '') return; $$(sel).forEach(function (el) { el.textContent = val; }); }
  function applyConfig() {
    var co = C.company || {};
    if (co.phone) {
      $$('[data-tel]').forEach(function (a) { a.setAttribute('href', 'tel:' + co.phone); });
      $$('[data-sms]').forEach(function (a) { a.setAttribute('href', 'sms:' + co.phone); });
    }
    if (co.email) $$('[data-mail]').forEach(function (a) { a.setAttribute('href', 'mailto:' + co.email); });
    setText('[data-phone-display]', co.phoneDisplay);
    setText('[data-email-display]', co.email);
    setText('[data-area]', co.serviceArea);
    if (co.serviceArea) setText('[data-area-line]', 'HVAC pros · ' + co.serviceArea);
    if (co.hours) setText('[data-hours]', co.hours.label);
    setText('[data-legal]', co.legalName);
    setText('#year', new Date().getFullYear());
    if (C.rating) { setText('[data-rating-value]', C.rating.value); setText('[data-rating-source]', C.rating.source); }
    var of = C.offer || {};
    setText('[data-offer-eyebrow]', of.eyebrow);
    setText('[data-offer-title]', of.title);
    setText('[data-offer-price]', of.price);
    setText('[data-anchor-label]', of.anchorLabel);
    setText('[data-anchor-price]', of.anchorPrice);
    var inc = $('#offer-includes');
    if (inc && of.includes) inc.innerHTML = of.includes.map(function (i) { return '<li><svg><use href="#i-check"/></svg>' + esc(i) + '</li>'; }).join('');
  }

  /* Live "Open now" badge from business hours (in the business time zone) */
  function openStatus() {
    var h = C.company && C.company.hours; if (!h || !h.week) return;
    var day, hour, minute;
    try {
      var parts = new Intl.DateTimeFormat('en-US', { timeZone: h.timeZone || undefined, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
      var get = function (t) { var p = parts.filter(function (x) { return x.type === t; })[0]; return p ? p.value : ''; };
      day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
      hour = parseInt(get('hour'), 10) % 24; minute = parseInt(get('minute'), 10);
    } catch (e) { var d = new Date(); day = d.getDay(); hour = d.getHours(); minute = d.getMinutes(); }
    var span = h.week[day]; var now = hour + minute / 60;
    var open = !!(span && now >= span[0] && now < span[1]);
    $$('[data-open-badge]').forEach(function (b) {
      b.hidden = false; b.classList.toggle('is-closed', !open);
      b.querySelector('span').textContent = open ? 'Open now' : 'Closed · msg us';
    });
    $$('[data-open-line]').forEach(function (l) {
      l.classList.toggle('is-closed', !open);
      l.textContent = open ? '● Open now · we reply fast' : '● Closed now · we reply first thing';
    });
  }

  /* ------------------------------------------------------------------ *
   * 2. Preloader
   * ------------------------------------------------------------------ */
  function preloader(done) {
    var el = $('#preloader'); if (!el) { done(); return; }
    var countEl = $('#pre-count'), bar = $('#pre-bar');
    var loaded = document.readyState === 'complete';
    window.addEventListener('load', function () { loaded = true; });
    var start = performance.now(), minT = reduced ? 250 : 1500, maxT = 3000, p = 0, finished = false;
    function finish() {
      if (finished) return; finished = true;
      countEl.textContent = '100'; bar.style.width = '100%';
      setTimeout(function () { el.classList.add('is-done'); done(); setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 900); }, 180);
    }
    function tick(now) {
      var t = now - start;
      var target = loaded ? 100 : Math.min(88, (t / minT) * 88);
      p += (target - p) * 0.07;
      if (t > maxT) p = 100;
      countEl.textContent = Math.min(100, Math.round(p));
      bar.style.width = Math.min(100, p) + '%';
      if ((p > 99 && t >= minT) || t > maxT) { finish(); return; }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------------ *
   * 3. Lenis smooth scroll (+ GSAP ticker sync)
   * ------------------------------------------------------------------ */
  function initLenis() {
    if (!window.Lenis || reduced) return;
    try {
      lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.3 });
      if (hasGSAP) {
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
        gsap.ticker.lagSmoothing(0);
      } else {
        var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
        requestAnimationFrame(raf);
      }
      window.AIRWISE_LENIS = lenis;
    } catch (e) { console.warn('[Airwise] Lenis failed', e); lenis = null; }
  }
  function scrollToTarget(target, opts) {
    var el = typeof target === 'string' ? $(target) : target; if (!el) return;
    if (lenis) lenis.scrollTo(el, Object.assign({ offset: 0, duration: 1.5 }, opts || {}));
    else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }
  function scrollToY(y) {
    if (lenis) lenis.scrollTo(y, { duration: 1 });
    else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  }
  function lockScroll(lock) {
    if (lenis) { lock ? lenis.stop() : lenis.start(); }
    root.style.overflow = lock ? 'hidden' : '';
  }

  /* ------------------------------------------------------------------ *
   * 4. Nav, progress bar, mobile menu, action bar
   * ------------------------------------------------------------------ */
  function initNav() {
    var nav = $('#nav'), bar = $('#scroll-progress'), lastY = window.scrollY;
    function onScroll() {
      var y = window.scrollY, max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? clamp(y / max, 0, 1) : 0) + ')';
      nav.classList.toggle('is-scrolled', y > 20);
      if (!menuOpen) {
        if (y > 500 && y - lastY > 6) nav.classList.add('is-hidden');
        else if (lastY - y > 6 || y < 200) nav.classList.remove('is-hidden');
      }
      lastY = y;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // active link
    var links = $$('.nav__links a');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var id = '#' + e.target.id;
          links.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === id); });
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      $$('main > section[id]').forEach(function (s) { io.observe(s); });
    }

    // burger
    var burger = $('#burger'), menu = $('#menu');
    function setMenu(open) {
      menuOpen = open;
      menu.classList.toggle('is-open', open);
      menu.setAttribute('aria-hidden', open ? 'false' : 'true');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      $('#action-bar').classList.toggle('is-hidden', open);
      nav.classList.remove('is-hidden');
      lockScroll(open);
    }
    burger.addEventListener('click', function () { setMenu(!menuOpen); });
    window.AIRWISE_MENU = { close: function () { if (menuOpen) setMenu(false); } };

    // hide action bar while the quote form is on screen
    var ab = $('#action-bar'), quote = $('#quote');
    if (ab && quote && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { es.forEach(function (e) { if (!menuOpen) ab.classList.toggle('is-hidden', e.isIntersecting); }); }, { threshold: 0.25 }).observe(quote);
    }
  }

  /* ------------------------------------------------------------------ *
   * 5. Cursor + magnetic buttons + pointer for 3D
   * ------------------------------------------------------------------ */
  function initPointer() {
    window.addEventListener('pointermove', function (e) {
      S.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      S.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    }, { passive: true });

    if (!(mqFine.matches && mqDesktop.matches) || reduced) return;
    var cursor = $('.cursor'); if (!cursor) return;
    var dot = $('.cursor__dot'), ring = $('.cursor__ring'), label = $('.cursor__label');
    var mx = -100, my = -100, rx = -100, ry = -100;
    window.addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });
    (function loop() {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
      ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
      requestAnimationFrame(loop);
    })();
    document.addEventListener('pointerover', function (e) {
      var t = e.target.closest && e.target.closest('a, button, input, label, summary, [data-cursor], .tile');
      var lab = e.target.closest && e.target.closest('[data-cursor]');
      cursor.classList.toggle('is-hover', !!t);
      if (lab && !e.target.closest('a, button')) { cursor.classList.add('has-label'); label.textContent = lab.getAttribute('data-cursor'); }
      else cursor.classList.remove('has-label');
    });
    document.addEventListener('pointerleave', function () { cursor.classList.remove('is-hover', 'has-label'); });

    // magnetic
    $$('[data-magnetic]').forEach(function (btn) {
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        btn.style.transform = 'translate(' + (dx * 0.22).toFixed(1) + 'px,' + (dy * 0.32).toFixed(1) + 'px)';
      });
      btn.addEventListener('pointerleave', function () { btn.style.transform = ''; });
    });
  }

  /* ------------------------------------------------------------------ *
   * 6. Split text + reveals
   * ------------------------------------------------------------------ */
  function splitWords(el) {
    if (el.getAttribute('data-split-done')) return $$('.w__i', el);
    el.setAttribute('data-split-done', '1');
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var parts = child.textContent.split(/(\s+)/), frag = document.createDocumentFragment();
          parts.forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span'); w.className = 'w';
            var i = document.createElement('span'); i.className = 'w__i'; i.textContent = part;
            w.appendChild(i); frag.appendChild(w);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1 && !child.classList.contains('w')) { walk(child); }
      });
    })(el);
    return $$('.w__i', el);
  }
  function revealIn(scope) {
    if (!hasGSAP || reduced) return;
    $$('[data-split]', scope).forEach(function (el) {
      var words = splitWords(el);
      gsap.from(words, { yPercent: 115, rotate: 3, duration: 1.1, ease: 'expo.out', stagger: 0.04, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });
    $$('[data-reveal]', scope).forEach(function (el) {
      gsap.from(el, { y: 34, autoAlpha: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
    });
  }

  /* ------------------------------------------------------------------ *
   * 7. Hero: intro, thermostat dial, parallax
   * ------------------------------------------------------------------ */
  var TMIN = 64, TMAX = 86;
  var heroTL = null;
  function updateRangeFill(r) {
    var min = +r.min || 0, max = +r.max || 100, v = +r.value;
    r.style.setProperty('--val', ((v - min) / (max - min) * 100) + '%');
  }
  function setTemp(t, src) {
    t = clamp(t, TMIN, TMAX); S.temp = t;
    var heat = clamp((t - 70) / 14, 0, 1);
    root.style.setProperty('--heat', heat.toFixed(3));
    var r = Math.round(t);
    var range = $('#temp-range'), dial = $('#dial');
    $('#dial-temp').textContent = r;
    $('#temp-out').textContent = r + '°';
    if (src !== 'range') range.value = r;
    updateRangeFill(range);
    range.setAttribute('aria-valuetext', r + ' degrees Fahrenheit');
    // theme-aware colors (CSS variables follow the active color theme)
    var st = t >= 80 ? ['Too hot', 'var(--warm)'] : t >= 76 ? ['Warm', 'var(--amber)'] : t >= 70 ? ['Perfect', 'var(--cool)'] : t >= 67 ? ['Crisp', 'var(--cool-2)'] : ['Chilly', 'var(--blue)'];
    $('#dial-state').textContent = st[0];
    dial.style.setProperty('--dial-color', st[1]);
    root.style.setProperty('--temp-color', st[1]);
    dial.style.setProperty('--dial-frac', ((t - TMIN) / (TMAX - TMIN)).toFixed(3));
  }
  function measureHero(force) {
    var hero = $('#top'), dial = $('#dial'); if (!hero || !dial) return;
    if (force || mqDesktop.matches || measureHero._w !== window.innerWidth) {
      root.style.setProperty('--hero-h', window.innerHeight + 'px');
      measureHero._w = window.innerWidth;
    }
    var hr = hero.getBoundingClientRect(), dr = dial.getBoundingClientRect();
    S.dial = { cx: dr.left - hr.left + dr.width / 2, cy: dr.top - hr.top + dr.height / 2, d: dr.width, w: hr.width, h: hr.height };
  }
  function initHero() {
    var range = $('#temp-range'), dial = $('#dial');
    setTemp(84);
    range.addEventListener('input', function () { S.userTemp = true; setTemp(+range.value, 'range'); });

    // Drag the dial (desktop). Arc spans 270° from bottom-left (cold) over the top to bottom-right (hot).
    var dragging = false;
    function fromPointer(e) {
      var r = dial.getBoundingClientRect();
      var a = Math.atan2(-(e.clientY - (r.top + r.height / 2)), e.clientX - (r.left + r.width / 2));
      if (a < -3 * Math.PI / 4) a += 2 * Math.PI;
      var frac = clamp((5 * Math.PI / 4 - a) / (3 * Math.PI / 2), 0, 1);
      S.userTemp = true;
      setTemp(TMIN + frac * (TMAX - TMIN));
    }
    dial.addEventListener('pointerdown', function (e) {
      if (!mqDesktop.matches) return;
      dragging = true; dial.setPointerCapture(e.pointerId); fromPointer(e);
    });
    dial.addEventListener('pointermove', function (e) { if (dragging) fromPointer(e); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) { dial.addEventListener(t, function () { dragging = false; }); });
    dial.addEventListener('wheel', function (e) { if (!mqDesktop.matches) return; e.preventDefault(); S.userTemp = true; setTemp(S.temp + (e.deltaY > 0 ? 0.5 : -0.5)); }, { passive: false });

    measureHero(true);
    window.addEventListener('resize', debounce(function () { measureHero(); }, 120));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measureHero(); });

    if (hasGSAP && !reduced) {
      heroTL = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
      heroTL.from('.hero__title .line__inner', { yPercent: 110, duration: 1.4, stagger: 0.12 })
        .from(['.hero__eyebrow', '.hero__sub', '.hero__ctas', '.thermo', '.hero__trust'], { y: 28, autoAlpha: 0, duration: 1.1, stagger: 0.08 }, 0.25)
        .from('.dial > *', { scale: 0.7, autoAlpha: 0, duration: 1.6, stagger: 0.1 }, 0.1)
        .from('#nav', { autoAlpha: 0, duration: 1 }, 0.2);
      // parallax out
      gsap.to('.hero__content', { yPercent: -14, autoAlpha: 0.15, ease: 'none', scrollTrigger: { trigger: '#top', start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('.hero__media', { scale: 1.12, ease: 'none', scrollTrigger: { trigger: '#top', start: 'top top', end: 'bottom top', scrub: true } });
    }
  }
  function playHero() {
    if (heroTL) heroTL.play();
    // Demo: watch the room cool from 84° to 72° (stops if the visitor takes over)
    var from = 84, to = 72, dur = reduced ? 0 : 2600, t0 = performance.now() + (reduced ? 0 : 900);
    (function step(now) {
      if (S.userTemp) return;
      var k = clamp((now - t0) / Math.max(1, dur), 0, 1);
      var e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      setTemp(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(step);
    })(performance.now());
  }

  /* ------------------------------------------------------------------ *
   * 8. Hidden-cost calculator (loss aversion)
   * ------------------------------------------------------------------ */
  function animateNumber(el, to, dur) {
    var from = +(el.getAttribute('data-val') || 0), t0 = performance.now(); dur = dur || 600;
    el.setAttribute('data-val', to);
    (function step(now) {
      var k = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(from + (to - from) * e).toLocaleString('en-US');
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }
  function initCost() {
    var age = $('#age'), bill = $('#bill'); if (!age) return;
    age.classList.add('range--warm'); bill.classList.add('range--warm');
    var CIRC = 578.05, started = false;
    function lossFrac(a) { return Math.min(0.45, 0.012 * a + (a > 10 ? 0.008 * (a - 10) : 0)); }
    function update() {
      var a = +age.value, b = +bill.value;
      updateRangeFill(age); updateRangeFill(bill);
      $('#age-out').textContent = a + (a === 1 ? ' yr' : ' yrs');
      $('#bill-out').textContent = '$' + b;
      if (!started) return;
      var lf = lossFrac(a), waste = Math.round(b * 12 * 0.5 * lf);
      $('#waste-pct').textContent = Math.round(lf * 100);
      $('#waste-months').textContent = (waste / b).toFixed(1);
      $('#gauge-fill').style.strokeDashoffset = (CIRC * (1 - lf / 0.45)).toFixed(1);
      $('#leak-fill').style.width = (lf / 0.45 * 100).toFixed(1) + '%';
      animateNumber($('#waste'), waste, 700);
    }
    age.addEventListener('input', update); bill.addEventListener('input', update);
    update();
    onceVisible($('#cost'), function () { started = true; setTimeout(update, 300); }, 0.3);
  }

  /* ------------------------------------------------------------------ *
   * 9. Inside the unit: pinned scroll story driving the 3D explode
   * ------------------------------------------------------------------ */
  function initInside() {
    var sec = $('#inside'), steps = $$('#unit-steps .step'), bar = $('#inside-bar'); if (!sec) return;
    var current = -1;
    function setProgress(p) {
      S.explode = p;
      var idx = Math.min(steps.length - 1, Math.floor(p * steps.length * 0.9999));
      if (idx !== current) { current = idx; steps.forEach(function (s, i) { s.classList.toggle('is-active', i === idx); }); }
      if (bar) bar.style.width = (p * 100).toFixed(2) + '%';
    }
    if (hasGSAP) {
      ScrollTrigger.create({
        trigger: sec, start: 'top top',
        end: function () { return '+=' + Math.round(window.innerHeight * (mqDesktop.matches ? 3 : 2.4)); },
        pin: true, scrub: true, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: function (self) { setProgress(self.progress); }
      });
    } else {
      S.explodeAuto = true;
      var i = 0; setInterval(function () { i = (i + 1) % steps.length; steps.forEach(function (s, k) { s.classList.toggle('is-active', k === i); }); if (bar) bar.style.width = ((i + 1) / steps.length * 100) + '%'; }, 3200);
    }
  }

  /* ------------------------------------------------------------------ *
   * 10. Services: horizontal pinned track (desktop) / swipe (mobile)
   * ------------------------------------------------------------------ */
  var SERVICES = {
    install: {
      eyebrow: '01 · Installations', title: 'New system installations', slot: 'svcInstall', prefill: 'Installation',
      lead: 'Central AC, heat pumps, furnaces and ductless mini-splits, sized with a real load calculation (not a rule of thumb) and installed so cleanly you would never know we were there.',
      list: ['Room-by-room load calculation', 'Good / better / best options in writing', 'Haul-away of old equipment', 'Thermostat setup & walkthrough', 'Warranty registration handled for you'],
      ideal: 'Your system is 12+ years old, needs frequent repairs, or some rooms never feel right.',
      time: 'Most change-outs: 1 day. Larger systems: 2–3 days.'
    },
    retrofit: {
      eyebrow: '02 · Retrofits', title: 'High-efficiency retrofits', slot: 'svcRetrofit', prefill: 'Retrofit / upgrade',
      lead: 'Keep what works and upgrade what doesn\'t. We modernize aging systems with high-efficiency equipment that fits your existing space and ductwork, with no tear-out drama.',
      list: ['Efficiency & duct leakage assessment', 'Heat-pump conversions', 'Duct sealing & airflow balancing', 'Smart thermostat & zoning upgrades', 'Help finding available rebates'],
      ideal: 'Your bills keep climbing, or you want heat-pump comfort without remodeling.',
      time: 'Typically 1–2 days, scheduled around your life.'
    },
    construction: {
      eyebrow: '03 · New construction', title: 'New construction HVAC', slot: 'svcConstruction', prefill: 'New construction',
      lead: 'Design-build HVAC for builders, GCs and custom-home owners. We plan it right on paper so it passes inspection and performs for decades.',
      list: ['Load calcs & equipment selection', 'Duct design & layout', 'Rough-in and trim-out', 'Coordination with your trades', 'Inspection-ready documentation'],
      ideal: 'You are building or adding on and need a crew that hits rough-in dates.',
      time: 'Built around your construction schedule.'
    },
    paint: {
      eyebrow: '04 · Paint jobs', title: 'Painting & protective coatings', slot: 'svcPaint', prefill: 'Paint job',
      lead: 'Interior and exterior painting, plus coatings that protect equipment, ductwork and metal from sun and rust, done by the same crew you already trust.',
      list: ['Interior walls, trim & ceilings', 'Exterior siding & eaves', 'Equipment & duct coatings', 'Color matching', 'Full prep, protection & cleanup'],
      ideal: 'You want one dependable team (and one invoice) for comfort and curb appeal.',
      time: 'Most rooms: 1–2 days. Exteriors: quoted per project.'
    },
    maintenance: {
      eyebrow: '05 · Maintenance', title: 'Tune-ups & maintenance', slot: 'svcMaintenance', prefill: 'Maintenance / tune-up',
      lead: 'Most breakdowns give warning signs weeks ahead. Our 21-point tune-ups catch them early, keep efficiency high and help your system last longer.',
      list: ['21-point safety & efficiency check', 'Coil & condensate cleaning', 'Electrical & capacitor testing', 'Refrigerant & airflow check', 'Written health report'],
      ideal: 'It has been a year or more since anyone looked at your system.',
      time: 'About 60–90 minutes per system.'
    }
  };
  var svcST = null;
  function initServices() {
    var sec = $('#services'), track = $('#services-track'), viewport = $('.services__viewport'); if (!sec) return;
    var cards = $$('.svc', track);

    if (hasGSAP) {
      var mm = gsap.matchMedia();
      mm.add('(min-width: 1024px)', function () {
        var dist = function () { return Math.max(0, track.scrollWidth - viewport.clientWidth); };
        var tween = gsap.to(track, {
          x: function () { return -dist(); }, ease: 'none',
          scrollTrigger: { trigger: sec, start: 'top top', end: function () { return '+=' + dist(); }, pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1 }
        });
        svcST = tween.scrollTrigger;
        return function () { svcST = null; gsap.set(track, { clearProps: 'transform' }); };
      });
    }

    function step() { var c = cards[0]; return c ? c.getBoundingClientRect().width + 22 : 360; }
    function move(dir) {
      if (svcST) {
        var cur = -(+gsap.getProperty(track, 'x') || 0), total = Math.max(1, track.scrollWidth - viewport.clientWidth);
        var next = clamp(cur + dir * step(), 0, total);
        scrollToY(svcST.start + (next / total) * (svcST.end - svcST.start));
      } else viewport.scrollBy({ left: dir * step(), behavior: 'smooth' });
    }
    $$('[data-svc-prev]').forEach(function (b) { b.addEventListener('click', function () { move(-1); }); });
    $$('[data-svc-next]').forEach(function (b) { b.addEventListener('click', function () { move(1); }); });

    // mobile dots
    var dots = $('#services-dots');
    if (dots) {
      dots.innerHTML = cards.map(function () { return '<i></i>'; }).join('');
      var di = $$('i', dots);
      var setDot = function () {
        var idx = Math.round(viewport.scrollLeft / Math.max(1, step()));
        di.forEach(function (d, i) { d.classList.toggle('is-active', i === clamp(idx, 0, di.length - 1)); });
      };
      viewport.addEventListener('scroll', setDot, { passive: true }); setDot();
    }

    // card tilt
    if (mqFine.matches && !reduced) {
      cards.forEach(function (card) {
        card.addEventListener('pointermove', function (e) {
          var r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
          card.style.setProperty('--rx', (-y * 7).toFixed(2) + 'deg'); card.style.setProperty('--ry', (x * 9).toFixed(2) + 'deg');
        });
        card.addEventListener('pointerleave', function () { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
      });
    }

    // open modal: button or the whole card
    cards.forEach(function (card) {
      var key = card.getAttribute('data-svc'); if (!key) return;
      card.addEventListener('click', function (e) { if (e.target.closest('a, [data-open-svc]')) return; openService(key); });
    });
  }
  function openService(key) {
    var d = SERVICES[key]; if (!d) return;
    $('#svc-eyebrow').textContent = d.eyebrow;
    $('#svc-title').textContent = d.title;
    $('#svc-lead').textContent = d.lead;
    $('#svc-list').innerHTML = d.list.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('');
    $('#svc-ideal').textContent = d.ideal;
    $('#svc-time').textContent = d.time;
    var cta = $('#svc-cta');
    cta.setAttribute('data-prefill', d.prefill);
    cta.setAttribute('data-close', '');
    cta.innerHTML = 'Get my quote <svg><use href="#i-arrow"/></svg>';
    // media: same Pexels slot as the card (served from cache)
    var holder = $('#svc-media'); holder.innerHTML = '';
    var cardMedia = $('[data-media="' + d.slot + '"]');
    var el = document.createElement(cardMedia && cardMedia.tagName === 'VIDEO' ? 'video' : 'img');
    if (el.tagName === 'VIDEO') { el.muted = true; el.loop = true; el.autoplay = true; el.playsInline = true; el.setAttribute('playsinline', ''); el.setAttribute('muted', ''); }
    else el.alt = '';
    holder.appendChild(el);
    if (window.AirwiseMedia) window.AirwiseMedia.get(d.slot).then(function (v) { window.AirwiseMedia.apply(el, v, true); }, function () { /* keep gradient */ });
    Modal.open('modal-svc');
  }

  /* ------------------------------------------------------------------ *
   * 11. Process timeline
   * ------------------------------------------------------------------ */
  function initProcess() {
    var items = $$('[data-tl]'), path = $('#timeline-path'); if (!items.length) return;
    function light(p) { items.forEach(function (li, i) { li.classList.toggle('is-on', p >= i / (items.length - 1) - 0.02); }); }
    if (hasGSAP && path) {
      gsap.fromTo(path, { strokeDashoffset: 1 }, {
        strokeDashoffset: 0, ease: 'none',
        scrollTrigger: { trigger: '#timeline', start: 'top 82%', end: 'bottom 80%', scrub: 0.6, onUpdate: function (self) { light(self.progress); } }
      });
    } else {
      onceVisible($('#timeline'), function () { items.forEach(function (li, i) { setTimeout(function () { li.classList.add('is-on'); }, i * 350); }); }, 0.4);
    }
  }

  /* ------------------------------------------------------------------ *
   * 12. Before / after comparison slider
   * ------------------------------------------------------------------ */
  function initCompare() {
    var ba = $('#ba'); if (!ba) return;
    var range = $('.ba__range', ba), dragging = false, touched = false;
    function setPos(p) { p = clamp(p, 2, 98); ba.style.setProperty('--pos', p.toFixed(2) + '%'); range.value = Math.round(p); }
    function fromEvent(e) { var r = ba.getBoundingClientRect(); return (e.clientX - r.left) / r.width * 100; }
    ba.addEventListener('pointerdown', function (e) { dragging = true; touched = true; try { ba.setPointerCapture(e.pointerId); } catch (x) { /* noop */ } setPos(fromEvent(e)); });
    ba.addEventListener('pointermove', function (e) { if (dragging) setPos(fromEvent(e)); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) { ba.addEventListener(t, function () { dragging = false; }); });
    range.addEventListener('input', function () { touched = true; setPos(+range.value); });
    // a little wiggle the first time it's seen, so people know it moves
    onceVisible(ba, function () {
      if (reduced) return;
      var keys = [[0, 50], [500, 28], [1100, 70], [1600, 50]], t0 = performance.now();
      (function step(now) {
        if (dragging || touched) return;
        var t = now - t0, i = 0; while (i < keys.length - 1 && t > keys[i + 1][0]) i++;
        if (i >= keys.length - 1) { setPos(50); return; }
        var a = keys[i], b = keys[i + 1], k = clamp((t - a[0]) / (b[0] - a[0]), 0, 1), e = k * k * (3 - 2 * k);
        setPos(a[1] + (b[1] - a[1]) * e); requestAnimationFrame(step);
      })(t0);
    }, 0.6);
  }

  /* ------------------------------------------------------------------ *
   * 13. Reviews carousel + stats counters
   * ------------------------------------------------------------------ */
  function initReviews() {
    var track = $('#reviews-track'); if (!track) return;
    var list = C.reviews || [];
    var star = '<svg><use href="#i-star"/></svg>';
    track.innerHTML = list.map(function (r) {
      var initials = String(r.name || '?').split(/\s+/).filter(function (w) { return /^[A-Za-z]/.test(w); }).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase() || '★';
      return '<article class="review">' + (C.reviewsAreSamples ? '<span class="review__tag">Sample</span>' : '') +
        '<div class="stars" aria-label="' + (r.stars || 5) + ' out of 5 stars">' + new Array((r.stars || 5) + 1).join(star) + '</div>' +
        '<blockquote>“' + esc(r.text) + '”</blockquote>' +
        '<footer><span class="review__avatar">' + esc(initials) + '</span><div class="review__who"><strong>' + esc(r.name) + '</strong><span>' + esc(r.place) + ' · ' + esc(r.service) + '</span></div></footer></article>';
    }).join('');
    if (C.reviewsAreSamples) $('#sample-note').hidden = false;

    function step() { var c = $('.review', track); return c ? c.getBoundingClientRect().width + (mqDesktop.matches ? 20 : 14) : 320; }
    function go(dir) {
      var max = track.scrollWidth - track.clientWidth;
      if (dir > 0 && track.scrollLeft >= max - 4) track.scrollTo({ left: 0, behavior: 'smooth' });
      else if (dir < 0 && track.scrollLeft <= 4) track.scrollTo({ left: max, behavior: 'smooth' });
      else track.scrollBy({ left: dir * step(), behavior: 'smooth' });
    }
    $$('[data-rev-prev]').forEach(function (b) { b.addEventListener('click', function () { go(-1); }); });
    $$('[data-rev-next]').forEach(function (b) { b.addEventListener('click', function () { go(1); }); });

    // autoplay (paused on hover/focus/touch or when off-screen)
    var paused = false, visible = false;
    track.addEventListener('pointerenter', function () { paused = true; });
    track.addEventListener('pointerleave', function () { paused = false; });
    track.addEventListener('focusin', function () { paused = true; });
    track.addEventListener('focusout', function () { paused = false; });
    track.addEventListener('touchstart', function () { paused = true; setTimeout(function () { paused = false; }, 8000); }, { passive: true });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { threshold: 0.4 }).observe(track);
    if (!reduced) setInterval(function () { if (visible && !paused && !document.hidden) go(1); }, 5500);

    // drag-to-scroll with a mouse
    var down = false, sx = 0, sl = 0, moved = false;
    track.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = track.scrollLeft; track.style.scrollSnapType = 'none'; });
    window.addEventListener('pointermove', function (e) { if (!down) return; var dx = e.clientX - sx; if (Math.abs(dx) > 3) moved = true; track.scrollLeft = sl - dx; });
    window.addEventListener('pointerup', function () { if (!down) return; down = false; track.style.scrollSnapType = ''; });
    track.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);

    // stats
    var stats = $('#stats');
    if (stats && C.stats) {
      stats.innerHTML = C.stats.map(function (s) {
        return '<div class="stat" data-reveal><strong><span data-count="' + (+s.value || 0) + '">0</span>' + esc(s.suffix || '') + '</strong><span>' + esc(s.label) + '</span></div>';
      }).join('');
      onceVisible(stats, function () { $$('[data-count]', stats).forEach(function (el, i) { setTimeout(function () { animateNumber(el, +el.getAttribute('data-count'), 1600); }, i * 120); }); }, 0.3);
    }
  }

  /* ------------------------------------------------------------------ *
   * 14. Offer countdown (deadline from config)
   * ------------------------------------------------------------------ */
  function initCountdown() {
    var box = $('#countdown'); if (!box) return;
    var of = C.offer || {}, end = null, now = new Date();
    if (of.deadline && /^\d{4}-\d{2}-\d{2}$/.test(of.deadline)) {
      var p = of.deadline.split('-').map(Number); end = new Date(p[0], p[1] - 1, p[2], 23, 59, 59);
    }
    if (!end || end < now) end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    var dl = $('#offer-deadline');
    if (dl) dl.textContent = end.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    var els = { d: $('[data-cd=d]', box), h: $('[data-cd=h]', box), m: $('[data-cd=m]', box), s: $('[data-cd=s]', box) };
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    function tick() {
      var diff = Math.max(0, end - new Date()), s = Math.floor(diff / 1000);
      var vals = { d: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60 };
      Object.keys(vals).forEach(function (k) { var v = pad(vals[k]); if (els[k].textContent !== v) els[k].textContent = v; });
    }
    tick(); setInterval(tick, 1000);
  }

  /* ------------------------------------------------------------------ *
   * 15. Quote wizard (micro-commitments + goal-gradient)
   * ------------------------------------------------------------------ */
  var Quote = {};
  function initWizard() {
    var form = $('#wizard'); if (!form) return;
    var steps = $$('.wizard__step', form), total = steps.length, cur = 1;
    var back = $('[data-wiz-back]', form), next = $('[data-wiz-next]', form), submit = $('[data-wiz-submit]', form);
    var pctFor = [10, 35, 60, 85];
    function go(n) {
      cur = clamp(n, 1, total);
      steps.forEach(function (s) { s.classList.toggle('is-active', +s.getAttribute('data-step') === cur); });
      back.disabled = cur === 1;
      next.hidden = cur === total; submit.hidden = cur !== total;
      $('#wiz-bar').style.width = pctFor[cur - 1] + '%';
      $('#wiz-pct').textContent = pctFor[cur - 1];
      $('#wiz-status').textContent = cur === total ? 'Last step!' : 'Step ' + cur + ' of ' + total;
    }
    function stepValid(n) {
      var s = steps[n - 1], radios = $$('input[type=radio]', s);
      if (radios.length) return radios.some(function (r) { return r.checked; });
      var ok = true;
      var name = form.elements.name, phone = form.elements.phone, email = form.elements.email;
      var mark = function (input, bad) { input.closest('.field').classList.toggle('is-invalid', bad); if (bad) ok = false; };
      mark(name, name.value.trim().length < 2);
      mark(phone, phone.value.replace(/\D/g, '').length < 10);
      mark(email, !!email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()));
      return ok;
    }
    function nope(msg) { form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake'); toast(msg); }
    $$('input[type=radio]', form).forEach(function (r) {
      r.addEventListener('change', function () { if (cur < total) setTimeout(function () { go(cur + 1); }, 280); });
    });
    next.addEventListener('click', function () { if (stepValid(cur)) go(cur + 1); else nope('Tap an option to continue'); });
    back.addEventListener('click', function () { go(cur - 1); });
    $$('.field input', form).forEach(function (i) { i.addEventListener('input', function () { i.closest('.field').classList.remove('is-invalid'); }); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!stepValid(total)) { nope('Please add your name and a valid phone number'); return; }
      var fd = new FormData(form), data = {};
      fd.forEach(function (v, k) { data[k] = String(v); });
      send(data);
    });

    function send(data) {
      var co = C.company || {};
      var subject = 'Free estimate request: ' + (data.service || 'HVAC') + ' (' + (data.name || '') + ')';
      var lines = [
        'Service: ' + (data.service || '-'), 'Property: ' + (data.property || '-'), 'Timing: ' + (data.timing || '-'),
        data.build ? '3D build: ' + data.build : null,
        '', 'Name: ' + data.name, 'Phone: ' + data.phone, 'Email: ' + (data.email || '-'), 'ZIP: ' + (data.zip || '-'),
        '', 'Notes: ' + (data.notes || '-'), '', '(Sent from the Airwise website)'
      ].filter(function (l) { return l !== null; });
      var done = function (viaMail) {
        quoteSent = true;
        $('#ok-name').textContent = (data.name || 'friend').split(' ')[0];
        $('#ok-msg').textContent = viaMail
          ? 'Your email app just opened with your request ready to go. Hit send and a real Airwise human will reply shortly.'
          : 'Your request is on its way. A real Airwise human will reach out shortly with next steps.';
        Modal.open('modal-success');
        form.reset(); go(1);
      };
      if (C.formEndpoint) {
        var btn = submit; btn.disabled = true;
        fetch(C.formEndpoint, { method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ _subject: subject }, data)) })
          .then(function (r) { if (!r.ok) throw new Error(r.status); done(false); })
          .catch(function () { window.location.href = 'mailto:' + co.email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n')); done(true); })
          .then(function () { btn.disabled = false; });
      } else {
        window.location.href = 'mailto:' + (co.email || '') + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
        done(true);
      }
    }

    Quote.prefill = function (service, build) {
      if (service) {
        var r = $$('input[name=service]', form).filter(function (i) { return i.value === service; })[0];
        if (r) { r.checked = true; go(2); }
      }
      if (build) {
        $('#build-field').value = build;
        var notes = form.elements.notes; if (notes && notes.value.indexOf(build) === -1) notes.value = ('My 3D build: ' + build + '. ' + notes.value).trim();
      }
    };
    go(1);
  }
  window.AirwiseQuote = Quote;

  /* ------------------------------------------------------------------ *
   * 16. Modals (focus trap, Esc, Lenis-aware)
   * ------------------------------------------------------------------ */
  var Modal = {
    stack: [], lastFocus: null,
    open: function (id) {
      var m = document.getElementById(id); if (!m || m.classList.contains('is-open')) return;
      if (window.AIRWISE_MENU) window.AIRWISE_MENU.close();
      Modal.lastFocus = document.activeElement;
      m.hidden = false; m.setAttribute('data-lenis-prevent', '');
      requestAnimationFrame(function () { requestAnimationFrame(function () { m.classList.add('is-open'); }); });
      Modal.stack.push(m); lockScroll(true);
      setTimeout(function () { var f = $('.modal__close', m); if (f) f.focus({ preventScroll: true }); }, 60);
      document.dispatchEvent(new CustomEvent('airwise:modal-open', { detail: { id: id } }));
    },
    close: function (m) {
      m = m || Modal.stack[Modal.stack.length - 1]; if (!m) return;
      m.classList.remove('is-open');
      Modal.stack = Modal.stack.filter(function (x) { return x !== m; });
      setTimeout(function () { if (!m.classList.contains('is-open')) { m.hidden = true; var v = $('video', m); if (v && m.id === 'modal-svc') v.pause(); } }, 550);
      if (!Modal.stack.length) lockScroll(false);
      if (Modal.lastFocus && Modal.lastFocus.focus) { try { Modal.lastFocus.focus({ preventScroll: true }); } catch (e) { /* noop */ } }
      document.dispatchEvent(new CustomEvent('airwise:modal-close', { detail: { id: m.id } }));
    }
  };
  window.AirwiseModal = Modal;
  function initModals() {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { if (Modal.stack.length) Modal.close(); else if (window.AIRWISE_MENU) window.AIRWISE_MENU.close(); }
      if (e.key === 'Tab' && Modal.stack.length) {
        var m = Modal.stack[Modal.stack.length - 1];
        var f = $$('a[href], button:not([disabled]), input:not([type=hidden]), textarea, select, [tabindex]:not([tabindex="-1"])', m).filter(function (el) { return el.offsetParent !== null; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * 17. Global click delegation: anchors, prefill, pop-ups
   * ------------------------------------------------------------------ */
  function initClicks() {
    document.addEventListener('click', function (e) {
      var t = e.target;
      var closer = t.closest('[data-close]');
      var openSvc = t.closest('[data-open-svc]');
      var openModal = t.closest('[data-open-modal]');
      var openCfg = t.closest('[data-open-config]');
      var anchor = t.closest('a[href^="#"]');

      if (openSvc) { e.preventDefault(); e.stopPropagation(); openService(openSvc.getAttribute('data-open-svc')); return; }
      if (openCfg) { e.preventDefault(); Modal.open('modal-config'); return; }
      if (openModal) { e.preventDefault(); Modal.open(openModal.getAttribute('data-open-modal')); return; }
      if (closer) {
        var m = closer.closest('.modal');
        if (m) Modal.close(m);
        if (!anchor) return;
      }
      if (anchor) {
        var href = anchor.getAttribute('href');
        if (href.length < 2) return;
        var target = document.querySelector(href); if (!target) return;
        e.preventDefault();
        if (window.AIRWISE_MENU) window.AIRWISE_MENU.close();
        var pre = anchor.getAttribute('data-prefill');
        if (pre && Quote.prefill) Quote.prefill(pre);
        setTimeout(function () { scrollToTarget(target); }, closer ? 350 : 0);
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * 18. Exit-intent pop-up (once per session, polite)
   * ------------------------------------------------------------------ */
  function initExitIntent() {
    if (store.get('aw-exit')) return;
    var armed = false; setTimeout(function () { armed = true; }, 12000);
    var engaged = false; // never interrupt someone who has started the quote form
    var wiz = $('#wizard');
    if (wiz) { wiz.addEventListener('change', function () { engaged = true; }); wiz.addEventListener('focusin', function () { engaged = true; }); }
    function show() {
      if (!armed || engaged || quoteSent || menuOpen || store.get('aw-exit') || Modal.stack.length) return;
      store.set('aw-exit', '1'); Modal.open('modal-exit');
    }
    if (mqFine.matches) {
      document.addEventListener('mouseout', function (e) { if (!e.relatedTarget && e.clientY <= 0) show(); });
    } else {
      var lastY = window.scrollY, lastT = performance.now(), depth = 0;
      window.addEventListener('scroll', function () {
        var y = window.scrollY, t = performance.now(), max = document.documentElement.scrollHeight - window.innerHeight;
        depth = Math.max(depth, max > 0 ? y / max : 0);
        var v = (lastY - y) / Math.max(1, t - lastT);
        if (v > 2.4 && depth > 0.4) show();
        lastY = y; lastT = t;
      }, { passive: true });
    }
  }

  /* ------------------------------------------------------------------ *
   * Helpers
   * ------------------------------------------------------------------ */
  function onceVisible(el, cb, threshold) {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { cb(); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); cb(); } }); }, { threshold: threshold || 0.2 });
    io.observe(el);
  }
  function debounce(fn, ms) { var t; return function () { var a = arguments; clearTimeout(t); t = setTimeout(function () { fn.apply(null, a); }, ms); }; }
  function initRanges() {
    $$('input[type=range]').forEach(function (r) { updateRangeFill(r); r.addEventListener('input', function () { updateRangeFill(r); }); });
  }

  /* ------------------------------------------------------------------ *
   * Boot (ScrollTriggers created in page order)
   * ------------------------------------------------------------------ */
  function boot() {
    applyConfig();
    openStatus(); setInterval(openStatus, 60000);
    initLenis();
    initNav();
    initPointer();
    initModals();
    initClicks();
    initRanges();

    initHero();
    revealIn($('#cost')); initCost();
    revealIn($('#inside')); initInside();
    revealIn($('#services')); initServices();
    revealIn($('#process')); initProcess();
    revealIn($('#compare')); initCompare();
    initReviews(); revealIn($('#reviews'));
    revealIn($('#offer')); initCountdown();
    revealIn($('#quote')); initWizard();
    revealIn($('#contact'));
    initExitIntent();

    if (hasGSAP) {
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
      window.addEventListener('load', function () { ScrollTrigger.refresh(); });
    }
    preloader(function () { playHero(); measureHero(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
