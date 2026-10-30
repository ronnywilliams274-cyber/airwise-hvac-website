/* =====================================================================
   AIRWISE MEDIA LOADER (Pexels)
   Priority: 1) local files saved by DOWNLOAD-MEDIA.bat (media-local.js)
             2) live Pexels API using the key in config.js (cached 72h)
             3) graceful gradient fallbacks already in the CSS
   ===================================================================== */
(function () {
  'use strict';

  var C = window.AIRWISE_CONFIG || {};
  var SLOTS = window.AIRWISE_MEDIA_SLOTS || {};
  var LOCAL = window.AIRWISE_LOCAL_MEDIA || null;
  var KEY = C.pexelsApiKey || '';
  var API = 'https://api.pexels.com';
  var CACHE_PREFIX = 'airwise-pexels-v2:';
  var CACHE_MS = 72 * 3600 * 1000;
  var mqDesktop = window.matchMedia('(min-width: 1024px)');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var credits = {};
  var resolved = {};

  var LABELS = {
    heroDesktop: 'Hero video (desktop)', heroMobile: 'Hero video (mobile)', svcInstall: 'Installations',
    svcRetrofit: 'Retrofits', svcConstruction: 'New construction', svcPaint: 'Paint jobs',
    svcMaintenance: 'Maintenance', processVideo: 'How it works', comfortRoom: 'Before / after', offerVideo: 'Seasonal offer'
  };

  /* ---------- cache ---------- */
  function cacheGet(k) {
    try { var raw = window.localStorage.getItem(CACHE_PREFIX + k); if (!raw) return null; var o = JSON.parse(raw); return (Date.now() - o.t > CACHE_MS) ? null : o.v; }
    catch (e) { return null; }
  }
  function cacheSet(k, v) { try { window.localStorage.setItem(CACHE_PREFIX + k, JSON.stringify({ t: Date.now(), v: v })); } catch (e) { /* ignore */ } }

  /* ---------- Pexels API ---------- */
  function api(path) {
    return fetch(API + path, { headers: { Authorization: KEY } }).then(function (r) {
      if (!r.ok) throw new Error('Pexels HTTP ' + r.status);
      return r.json();
    });
  }
  function pickVideoFile(video, target) {
    var files = (video.video_files || []).filter(function (f) {
      return f && f.link && f.width && String(f.file_type || '').indexOf('mp4') > -1;
    });
    if (!files.length) return null;
    files.sort(function (a, b) { return a.width - b.width; });
    var good = files.filter(function (f) { return f.width >= target * 0.7; });
    return good.length ? good[0] : files[files.length - 1];
  }
  function normVideo(v, slot) {
    if (!v) return null;
    var f = pickVideoFile(v, slot.width || 1280); if (!f) return null;
    return { type: 'video', src: f.link, poster: v.image || '', alt: '', credit: { kind: 'Video', name: (v.user && v.user.name) || 'Pexels', url: (v.user && v.user.url) || v.url, page: v.url } };
  }
  function normPhoto(p, slot) {
    if (!p) return null;
    var src = p.src || {};
    var w = mqDesktop.matches ? (slot.orientation === 'portrait' ? 1000 : 1900) : 900;
    var url = src.original ? src.original + '?auto=compress&cs=tinysrgb&w=' + w : (src.large2x || src.large || src.medium);
    return { type: 'photo', src: url, alt: p.alt || '', credit: { kind: 'Photo', name: p.photographer || 'Pexels', url: p.photographer_url || p.url, page: p.url } };
  }
  function fetchSlot(name, slot) {
    var ck = [name, slot.id || '', slot.query || '', slot.pick || 0, slot.orientation || '', mqDesktop.matches ? 'd' : 'm'].join('|');
    var cached = cacheGet(ck);
    if (cached) return Promise.resolve(cached);
    if (!KEY) return Promise.reject(new Error('no Pexels API key in config.js'));
    var isVideo = slot.type === 'video';
    var byId = slot.id
      ? api(isVideo ? '/videos/videos/' + slot.id : '/v1/photos/' + slot.id).then(function (d) { return isVideo ? normVideo(d, slot) : normPhoto(d, slot); })
      : Promise.reject(new Error('no id'));
    return byId.then(function (v) { if (!v) throw new Error('empty'); return v; }).catch(function () {
      if (!slot.query) throw new Error('no query');
      var q = '?query=' + encodeURIComponent(slot.query) + '&per_page=15' + (slot.orientation ? '&orientation=' + slot.orientation : '');
      return api((isVideo ? '/videos/search' : '/v1/search') + q).then(function (d) {
        var arr = (isVideo ? d.videos : d.photos) || [];
        if (isVideo) {
          var short = arr.filter(function (v) { return v.duration >= 5 && v.duration <= 60; });
          if (short.length) arr = short;
        }
        var item = arr[Math.min(slot.pick || 0, arr.length - 1)];
        if (!item) throw new Error('no results for "' + slot.query + '"');
        return isVideo ? normVideo(item, slot) : normPhoto(item, slot);
      });
    }).then(function (v) { if (!v) throw new Error('empty'); cacheSet(ck, v); return v; });
  }

  /* ---------- resolve + apply ---------- */
  function get(name) {
    if (resolved[name]) return resolved[name];
    var slot = SLOTS[name];
    var p;
    if (LOCAL && LOCAL[name]) p = Promise.resolve(LOCAL[name]);
    else if (!slot) p = Promise.reject(new Error('unknown media slot ' + name));
    else p = fetchSlot(name, slot);
    resolved[name] = p;
    p.then(function (v) { if (v && v.credit) { credits[name] = v.credit; renderCredits(); } },
      function (e) { console.info('[Airwise media] ' + name + ': ' + (e && e.message)); });
    return p;
  }

  var videoIO = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () { /* autoplay blocked: poster stays */ }); }
      else v.pause();
    });
  }, { threshold: 0.12 }) : null;

  function apply(el, v, force) {
    if (!el || !v) return;
    var tag = el.tagName;
    if (tag === 'VIDEO') {
      if (v.type !== 'video') { if (v.src) el.poster = v.src; el.classList.add('is-ready'); return; }
      if (v.poster) { el.poster = v.poster; el.classList.add('is-ready'); }
      if ((saveData || reduced) && !force) return; // poster only
      el.muted = true; el.defaultMuted = true; el.setAttribute('muted', ''); el.setAttribute('playsinline', ''); el.playsInline = true; el.loop = true;
      el.preload = 'auto';
      el.addEventListener('loadeddata', function () { el.classList.add('is-ready'); }, { once: true });
      el.src = v.src;
      if (videoIO) videoIO.observe(el); else { var pr = el.play(); if (pr && pr.catch) pr.catch(function () {}); }
    } else if (tag === 'IMG') {
      el.addEventListener('load', function () { el.classList.add('is-ready'); }, { once: true });
      el.src = v.type === 'video' ? v.poster : v.src;
      if (!el.getAttribute('alt') && v.alt) el.setAttribute('alt', v.alt);
    } else {
      el.style.backgroundImage = 'url("' + (v.type === 'video' ? v.poster : v.src) + '")';
      el.classList.add('is-ready');
    }
  }

  function matchesWhen(el) {
    var w = el.getAttribute('data-when');
    if (!w) return true;
    return w === 'desktop' ? mqDesktop.matches : !mqDesktop.matches;
  }
  function load(el) {
    if (el.getAttribute('data-media-done') || !matchesWhen(el)) return;
    el.setAttribute('data-media-done', '1');
    get(el.getAttribute('data-media')).then(function (v) { apply(el, v); }, function () { /* CSS fallback */ });
  }

  /* ---------- credits list ---------- */
  function renderCredits() {
    var ul = document.getElementById('credits-list'); if (!ul) return;
    var keys = Object.keys(credits);
    if (!keys.length) return;
    ul.innerHTML = keys.map(function (k) {
      var c = credits[k];
      return '<li><strong>' + (LABELS[k] || k) + '</strong>: ' + c.kind + ' by <a href="' + c.url + '" target="_blank" rel="noopener">' + escapeHtml(c.name) + '</a> on <a href="' + (c.page || 'https://www.pexels.com') + '" target="_blank" rel="noopener">Pexels</a></li>';
    }).join('');
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- boot ---------- */
  function boot() {
    var els = Array.prototype.slice.call(document.querySelectorAll('[data-media]'));
    var eager = els.filter(function (el) { return el.closest('.hero'); });
    var lazy = els.filter(function (el) { return !el.closest('.hero'); });
    eager.forEach(load);
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); load(e.target); } });
      }, { rootMargin: '120% 120% 120% 120%' });
      lazy.forEach(function (el) { io.observe(el); });
    } else lazy.forEach(load);
    var onChange = function () { eager.forEach(load); };
    if (mqDesktop.addEventListener) mqDesktop.addEventListener('change', onChange); else if (mqDesktop.addListener) mqDesktop.addListener(onChange);
    if (!LOCAL && KEY) console.info('[Airwise media] Loading media live from Pexels. Run DOWNLOAD-MEDIA.bat to store it locally before launch.');
  }

  window.AirwiseMedia = { get: get, apply: apply, credits: credits };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
