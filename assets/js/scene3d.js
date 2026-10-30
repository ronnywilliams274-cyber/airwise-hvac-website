/* =====================================================================
   AIRWISE 3D: Three.js + React Three Fiber
   - Hero: airflow particles + glass "comfort orb" thermostat dial
   - Inside: procedural AC condenser that explodes with scroll
   Libraries come from the import map in index.html (jsDelivr / esm.sh).
   If React Three Fiber can't load, the same scenes run on plain Three.js.
   If WebGL or Three.js is unavailable, CSS fallbacks are shown.
   ===================================================================== */
(function () {
  'use strict';

  var S = (window.AIRWISE_STATE = window.AIRWISE_STATE || { temp: 84, explode: 0, pointer: { x: 0, y: 0 } });
  if (!S.pointer) S.pointer = { x: 0, y: 0 };
  var root = document.documentElement;
  var mqDesktop = window.matchMedia('(min-width: 1024px)');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var heroHost = document.getElementById('hero-canvas');
  var unitHost = document.getElementById('unit-canvas');
  if (!heroHost && !unitHost) return;

  function webglOK() {
    try { var c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
    catch (e) { return false; }
  }
  if (!webglOK()) { root.classList.add('no-webgl'); return; }

  function fail(e) { console.warn('[Airwise 3D] 3D unavailable, showing fallback:', e); root.classList.add('three-failed'); }

  /* visibility: only render what's on screen (battery + perf) */
  var vis = { hero: true, unit: false };
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { vis[e.target === heroHost ? 'hero' : 'unit'] = e.isIntersecting; });
    }, { rootMargin: '120px' });
    if (heroHost) io.observe(heroHost);
    if (unitHost) io.observe(unitHost);
  } else { vis.unit = true; }

  var heatOf = function (t) { return Math.min(1, Math.max(0, (t - 70) / 14)); };
  var clamp01 = function (x) { return Math.min(1, Math.max(0, x)); };
  var smooth = function (x) { x = clamp01(x); return x * x * (3 - 2 * x); };
  var bump = function (x, c, w) { return Math.max(0, 1 - Math.abs(x - c) / w); };

  /* =================================================================
     BUILDERS (pure three.js, shared by the R3F and vanilla renderers)
     ================================================================= */
  var FALLBACK_PAL = {
    light: false, cold: ['#5ce1ff', '#2f7bff', '#d8f7ff'], hot: ['#ff7a45', '#ffb547', '#ff4d6d'], accent: '#5ce1ff', warm: '#ff7a45',
    off: '#22324d', housing: '#d3dbe4', louver: '#4a5668', pad: '#323a48', label: { bg: '#0b1424', accent: '#5ce1ff', text: '#ffffff' }
  };

  function makeBuilders(THREE, RoomEnvironment) {
    /* ---- color themes: every object registers a hook that re-colors it ---- */
    function palette() {
      var T = window.AIRWISE_THEMES || {}, k = root.getAttribute('data-theme');
      return (T[k] && T[k].scene) || (T.night && T.night.scene) || FALLBACK_PAL;
    }
    var themed = [];
    function onTheme(fn) { themed.push(fn); try { fn(palette()); } catch (e) { /* noop */ } }
    document.addEventListener('airwise:theme', function () {
      var p = palette();
      themed.forEach(function (fn) { try { fn(p); } catch (e) { console.warn('[Airwise 3D] theme hook', e); } });
    });

    var _dot = null;
    function dotTexture() {
      if (_dot) return _dot;
      var c = document.createElement('canvas'); c.width = c.height = 64;
      var g = c.getContext('2d'), grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.25, 'rgba(255,255,255,0.85)');
      grd.addColorStop(0.6, 'rgba(255,255,255,0.18)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
      _dot = new THREE.CanvasTexture(c); _dot.colorSpace = THREE.SRGBColorSpace;
      return _dot;
    }
    function shadowTexture() {
      var c = document.createElement('canvas'); c.width = c.height = 128;
      var g = c.getContext('2d'), grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grd.addColorStop(0, 'rgba(0,0,0,0.75)'); grd.addColorStop(0.45, 'rgba(0,0,0,0.45)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    }
    function labelTexture() {
      var c = document.createElement('canvas'); c.width = 512; c.height = 144;
      var g = c.getContext('2d');
      var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
      onTheme(function (p) {
        var L = p.label || FALLBACK_PAL.label;
        g.clearRect(0, 0, 512, 144);
        g.fillStyle = L.bg;
        if (g.roundRect) { g.beginPath(); g.roundRect(4, 4, 504, 136, 26); g.fill(); } else g.fillRect(4, 4, 504, 136);
        g.strokeStyle = L.accent; g.lineWidth = 4; g.globalAlpha = 0.6;
        if (g.roundRect) { g.beginPath(); g.roundRect(6, 6, 500, 132, 24); g.stroke(); }
        g.globalAlpha = 1; g.fillStyle = L.text;
        g.font = '800 70px Sora, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('AIRWISE', 256, 66);
        g.fillStyle = L.accent; g.font = '600 22px Inter, Arial, sans-serif'; g.fillText('H V A C   S O L U T I O N S', 256, 114);
        t.needsUpdate = true;
      });
      return t;
    }
    function makeEnv(renderer) {
      if (!RoomEnvironment) return null;
      try {
        var pm = new THREE.PMREMGenerator(renderer);
        var envScene = new RoomEnvironment();
        var tex = pm.fromScene(envScene, 0.04).texture;
        pm.dispose(); if (envScene.dispose) envScene.dispose();
        return tex;
      } catch (e) { console.warn('[Airwise 3D] environment skipped', e); return null; }
    }
    function disposeTree(obj) {
      obj.traverse(function (o) {
        if (o.geometry) o.geometry.dispose();
        if (o.material) [].concat(o.material).forEach(function (m) { if (m.map) m.map.dispose(); m.dispose(); });
      });
    }

    /* ---------------- Airflow particles ---------------- */
    function createAirflow() {
      var count = mqDesktop.matches ? 2600 : 1100;
      var geo = new THREE.BufferGeometry();
      var pos = new Float32Array(count * 3), col = new Float32Array(count * 3), seed = new Float32Array(count * 4);
      for (var i = 0; i < count; i++) {
        seed[i * 4] = Math.random() * 2 - 1;          // lane
        seed[i * 4 + 1] = -3 + Math.random() * 4.2;   // depth
        seed[i * 4 + 2] = 0.4 + Math.random() * 0.9;  // speed
        seed[i * 4 + 3] = Math.random() * Math.PI * 2; // phase
        pos[i * 3] = (Math.random() * 2 - 1) * 8;
        pos[i * 3 + 2] = seed[i * 4 + 1];
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      var mat = new THREE.PointsMaterial({
        size: mqDesktop.matches ? 0.06 : 0.075, map: dotTexture(), transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, vertexColors: true, sizeAttenuation: true, opacity: mqDesktop.matches ? 0.85 : 0.7
      });
      var points = new THREE.Points(geo, mat);
      points.frustumCulled = false;
      var cold = [new THREE.Color('#5ce1ff'), new THREE.Color('#2f7bff'), new THREE.Color('#d8f7ff')];
      var hot = [new THREE.Color('#ff7a45'), new THREE.Color('#ffb547'), new THREE.Color('#ff4d6d')];
      var tmp = new THREE.Color(), heat = heatOf(S.temp), lastHeat = -1;
      onTheme(function (p) {
        for (var k = 0; k < 3; k++) { cold[k].set(p.cold[k]); hot[k].set(p.hot[k]); }
        // additive glow on dark themes, normal blending so particles stay visible on the bright theme
        mat.blending = p.light ? THREE.NormalBlending : THREE.AdditiveBlending;
        mat.opacity = p.light ? 0.9 : (mqDesktop.matches ? 0.85 : 0.7);
        mat.needsUpdate = true;
        lastHeat = -1;
      });
      function recolor(h) {
        for (var i = 0; i < count; i++) {
          tmp.copy(cold[i % 3]).lerp(hot[i % 3], h);
          var dim = 0.5 + 0.5 * (((i * 7919) % 100) / 100);
          col[i * 3] = tmp.r * dim; col[i * 3 + 1] = tmp.g * dim; col[i * 3 + 2] = tmp.b * dim;
        }
        geo.attributes.color.needsUpdate = true;
      }
      recolor(heat);
      return {
        object: points,
        update: function (dt, t, ctx) {
          var vp = ctx.viewport; if (!vp || !vp.width) return;
          var halfW = vp.width / 2 + 1.2, halfH = vp.height / 2;
          heat += (heatOf(S.temp) - heat) * Math.min(1, dt * 2.5);
          if (Math.abs(heat - lastHeat) > 0.003) { recolor(heat); lastHeat = heat; }
          var speed = (reduced ? 0.25 : 1) * (0.55 + heat * 1.3), amp = 0.12 + heat * 0.55;
          var px = S.pointer.x * vp.width / 2, py = S.pointer.y * vp.height / 2;
          for (var i = 0; i < count; i++) {
            var i3 = i * 3, i4 = i * 4;
            var x = pos[i3] + seed[i4 + 2] * dt * speed * 1.4;
            if (x > halfW) x = -halfW - Math.random() * 0.6;
            var ph = seed[i4 + 3];
            var y = seed[i4] * halfH * 0.95 + Math.sin(x * 0.55 + t * 0.7 + ph) * amp + Math.sin(x * 1.9 + t * 1.6 + ph * 2) * amp * 0.35 * heat;
            var dx = x - px, dy = y - py, d2 = dx * dx + dy * dy;
            if (d2 < 1.6) y += (dy >= 0 ? 1 : -1) * (1.6 - d2) * 0.45;
            pos[i3] = x; pos[i3 + 1] = y;
          }
          geo.attributes.position.needsUpdate = true;
        },
        dispose: function () { geo.dispose(); mat.dispose(); }
      };
    }

    /* ---------------- Comfort orb / thermostat dial ---------------- */
    function createOrb() {
      var desktop = mqDesktop.matches;
      var group = new THREE.Group();
      group.scale.setScalar(0.001);
      var coreMat = new THREE.MeshStandardMaterial({ color: 0x0b1a33, emissive: new THREE.Color('#ff7a45'), emissiveIntensity: 1.6, roughness: 0.35, metalness: 0.1 });
      var core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 5), coreMat);
      var shellMat = desktop
        ? new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.06, transmission: 1, thickness: 0.8, ior: 1.32, clearcoat: 1, clearcoatRoughness: 0.1, attenuationColor: new THREE.Color('#bfefff'), attenuationDistance: 3 })
        : new THREE.MeshPhysicalMaterial({ color: 0xbfefff, metalness: 0.2, roughness: 0.15, transparent: true, opacity: 0.22, clearcoat: 1, depthWrite: false });
      var shell = new THREE.Mesh(new THREE.SphereGeometry(0.95, desktop ? 64 : 40, desktop ? 48 : 28), shellMat);
      var wireMat = new THREE.LineBasicMaterial({ color: 0x5ce1ff, transparent: true, opacity: 0.3 });
      var wire = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.12, 1)), wireMat);

      var N = 54, R = 1.5;
      var ticks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.035, 0.16, 0.035), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), N);
      var dummy = new THREE.Object3D(), off = new THREE.Color('#22324d'), cold = new THREE.Color('#5ce1ff'), hot = new THREE.Color('#ff7a45'), tc = new THREE.Color(), c = new THREE.Color();
      for (var i = 0; i < N; i++) {
        var a = 5 * Math.PI / 4 - (i / (N - 1)) * 1.5 * Math.PI;
        dummy.position.set(Math.cos(a) * R, Math.sin(a) * R, 0);
        dummy.rotation.set(0, 0, a - Math.PI / 2);
        dummy.updateMatrix();
        ticks.setMatrixAt(i, dummy.matrix);
        ticks.setColorAt(i, off);
      }
      ticks.instanceMatrix.needsUpdate = true;
      if (ticks.instanceColor) ticks.instanceColor.needsUpdate = true;
      var knob = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
      var ringMat = new THREE.MeshBasicMaterial({ color: 0x5ce1ff, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false });
      var ring = new THREE.Mesh(new THREE.RingGeometry(1.31, 1.35, 128, 1, -Math.PI / 4, 1.5 * Math.PI), ringMat);
      var spin = new THREE.Group();
      spin.add(core, shell, wire);
      group.add(spin, ticks, knob, ring);

      var heat = heatOf(S.temp), lastFrac = -1, sc = 0.001, rx = 0, ry = 0;
      onTheme(function (p) { off.set(p.off); cold.set(p.cold[0]); hot.set(p.hot[0]); lastFrac = -1; });
      return {
        object: group,
        update: function (dt, t, ctx) {
          var vp = ctx.viewport, size = ctx.size, d = S.dial;
          if (d && size && size.height && vp && vp.height) {
            var upp = vp.height / size.height;
            group.position.x = (d.cx - size.width / 2) * upp;
            group.position.y = (size.height / 2 - d.cy) * upp;
            var target = Math.max(0.001, (d.d * 0.44 * upp) / R);
            sc += (target - sc) * Math.min(1, dt * 3.5);
            group.scale.setScalar(sc);
          }
          heat += (heatOf(S.temp) - heat) * Math.min(1, dt * 3);
          c.copy(cold).lerp(hot, heat);
          coreMat.emissive.copy(c);
          coreMat.emissiveIntensity = 1.2 + Math.sin(t * 2) * 0.25 + heat * 0.6;
          wireMat.color.copy(c); ringMat.color.copy(c);
          var frac = clamp01((S.temp - 64) / 22);
          if (Math.abs(frac - lastFrac) > 0.002) {
            lastFrac = frac;
            var lit = Math.round(frac * (N - 1));
            for (var i = 0; i < N; i++) ticks.setColorAt(i, i <= lit ? tc.copy(cold).lerp(hot, i / (N - 1)) : off);
            ticks.instanceColor.needsUpdate = true;
            var a = 5 * Math.PI / 4 - frac * 1.5 * Math.PI;
            knob.position.set(Math.cos(a) * (R + 0.17), Math.sin(a) * (R + 0.17), 0);
          }
          var rs = reduced ? 0.2 : 1;
          core.rotation.y += dt * 0.4 * rs;
          wire.rotation.y -= dt * (0.15 + heat * 0.5) * rs;
          wire.rotation.x += dt * 0.08 * rs;
          spin.position.y = Math.sin(t * 1.1) * 0.05 * rs;
          rx += (-S.pointer.y * 0.14 - rx) * Math.min(1, dt * 4);
          ry += (S.pointer.x * 0.2 - ry) * Math.min(1, dt * 4);
          group.rotation.set(rx, ry, 0);
        },
        dispose: function () { disposeTree(group); }
      };
    }

    /* ---------------- Procedural AC condenser ---------------- */
    function createCondenser() {
      var unit = new THREE.Group();
      var W = 2.0, H = 1.6, baseY = 0.16, top = baseY + 0.08 + H;
      var cyan = new THREE.Color('#5ce1ff');
      var M = {
        housing: new THREE.MeshStandardMaterial({ color: 0xd3dbe4, metalness: 0.7, roughness: 0.33 }),
        louver: new THREE.MeshStandardMaterial({ color: 0x4a5668, metalness: 0.65, roughness: 0.42, emissive: cyan.clone(), emissiveIntensity: 0 }),
        dark: new THREE.MeshStandardMaterial({ color: 0x151b25, metalness: 0.55, roughness: 0.45 }),
        pad: new THREE.MeshStandardMaterial({ color: 0x323a48, metalness: 0.05, roughness: 0.92 }),
        fan: new THREE.MeshStandardMaterial({ color: 0x232b38, metalness: 0.5, roughness: 0.35, emissive: cyan.clone(), emissiveIntensity: 0, side: THREE.DoubleSide }),
        fin: new THREE.MeshStandardMaterial({ color: 0xb4c0cd, metalness: 0.9, roughness: 0.25, emissive: cyan.clone(), emissiveIntensity: 0 }),
        copper: new THREE.MeshStandardMaterial({ color: 0xc87a42, metalness: 1, roughness: 0.28, emissive: new THREE.Color('#ff7a45'), emissiveIntensity: 0 }),
        comp: new THREE.MeshStandardMaterial({ color: 0x0d1118, metalness: 0.6, roughness: 0.2, emissive: cyan.clone(), emissiveIntensity: 0 }),
        glowSolid: new THREE.MeshBasicMaterial({ color: 0x5ce1ff, toneMapped: false }),
        glow: new THREE.MeshBasicMaterial({ color: 0x5ce1ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false })
      };
      function box(w, h, d, m) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); }
      function cyl(rt, rb, h, seg, m) { return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 24), m); }
      function tube(points, r) {
        var curve = new THREE.CatmullRomCurve3(points.map(function (p) { return new THREE.Vector3(p[0], p[1], p[2]); }));
        return new THREE.Mesh(new THREE.TubeGeometry(curve, 48, r || 0.028, 10, false), M.copper);
      }
      var dummy = new THREE.Object3D(), j, k;

      // ground shadow + pad + base
      var shadow = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 4.8), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
      shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.002; unit.add(shadow);
      var pad = box(2.6, 0.12, 2.6, M.pad); pad.position.y = 0.06; unit.add(pad);
      var pan = box(W + 0.08, 0.08, W + 0.08, M.dark); pan.position.y = baseY + 0.04; unit.add(pan);
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (s) {
        var p = box(0.1, H, 0.1, M.housing); p.position.set(s[0] * (W / 2 - 0.02), baseY + 0.08 + H / 2, s[1] * (W / 2 - 0.02)); unit.add(p);
      });

      // louvered side panels (move outward)
      var sides = [], NS = 15, slatGeo = new THREE.BoxGeometry(W - 0.16, 0.04, 0.05);
      for (k = 0; k < 4; k++) {
        var ang = k * Math.PI / 2, g = new THREE.Group();
        var inst = new THREE.InstancedMesh(slatGeo, M.louver, NS);
        for (j = 0; j < NS; j++) {
          dummy.position.set(0, baseY + 0.18 + j * ((H - 0.24) / (NS - 1)), 0);
          dummy.rotation.set(-0.6, 0, 0); dummy.updateMatrix(); inst.setMatrixAt(j, dummy.matrix);
        }
        inst.instanceMatrix.needsUpdate = true;
        var railTop = box(W - 0.1, 0.06, 0.06, M.housing); railTop.position.y = baseY + 0.08 + H - 0.03;
        var railBot = box(W - 0.1, 0.06, 0.06, M.housing); railBot.position.y = baseY + 0.11;
        g.add(inst, railTop, railBot);
        if (k === 0) {
          var lab = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.2), new THREE.MeshBasicMaterial({ map: labelTexture(), transparent: true, toneMapped: false }));
          lab.position.set(0, baseY + H * 0.86, 0.06); g.add(lab);
        }
        var n = new THREE.Vector3(Math.sin(ang), 0, Math.cos(ang));
        g.rotation.y = ang; g.position.copy(n).multiplyScalar(W / 2);
        g.userData.base = g.position.clone(); g.userData.n = n;
        unit.add(g); sides.push(g);
      }

      // condenser coil: fins + copper tubes on 4 walls
      var coilWalls = [], NF = mqDesktop.matches ? 46 : 30;
      var finGeo = new THREE.BoxGeometry(0.012, H - 0.42, 0.08);
      var tubeGeo = new THREE.CylinderGeometry(0.022, 0.022, W - 0.42, 10); tubeGeo.rotateZ(Math.PI / 2);
      for (k = 0; k < 4; k++) {
        var ang2 = k * Math.PI / 2, wall = new THREE.Group();
        var fins = new THREE.InstancedMesh(finGeo, M.fin, NF);
        for (j = 0; j < NF; j++) {
          dummy.position.set(-(W / 2 - 0.25) + j * ((W - 0.5) / (NF - 1)), baseY + 0.18 + (H - 0.42) / 2, 0);
          dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); fins.setMatrixAt(j, dummy.matrix);
        }
        fins.instanceMatrix.needsUpdate = true;
        var tubes = new THREE.InstancedMesh(tubeGeo, M.copper, 6);
        for (j = 0; j < 6; j++) {
          dummy.position.set(0, baseY + 0.3 + j * ((H - 0.6) / 5), 0.045);
          dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); tubes.setMatrixAt(j, dummy.matrix);
        }
        tubes.instanceMatrix.needsUpdate = true;
        wall.add(fins, tubes);
        var n2 = new THREE.Vector3(Math.sin(ang2), 0, Math.cos(ang2));
        wall.rotation.y = ang2; wall.position.copy(n2).multiplyScalar(W / 2 - 0.2);
        wall.userData.base = wall.position.clone(); wall.userData.n = n2;
        unit.add(wall); coilWalls.push(wall);
      }

      // compressor + lines
      var comp = new THREE.Group();
      var plate = cyl(0.36, 0.36, 0.04, 32, M.dark); plate.position.y = baseY + 0.1;
      var shellC = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.42, 8, 24), M.comp); shellC.position.y = baseY + 0.08 + 0.27 + 0.21;
      var accum = cyl(0.085, 0.085, 0.46, 20, M.dark); accum.position.set(0.46, baseY + 0.08 + 0.23, -0.18);
      comp.add(plate, shellC, accum);
      comp.add(tube([[0, 1.16, 0], [0.08, 1.32, 0.12], [0.38, 1.38, 0.38], [0.62, 1.2, 0.62]]));
      comp.add(tube([[0.46, 0.7, -0.18], [0.48, 0.86, -0.1], [0.62, 0.9, 0.3], [0.8, 0.5, 0.8]], 0.034));
      comp.add(tube([[0.25, 0.62, 0.05], [0.42, 0.5, 0.3], [0.62, 0.42, 0.62]], 0.022));
      var v1 = cyl(0.05, 0.05, 0.14, 16, M.copper); v1.rotation.z = Math.PI / 2; v1.position.set(0.86, 0.5, 0.86); comp.add(v1);
      unit.add(comp);

      // top cap with circular opening + grille
      var topG = new THREE.Group(); topG.position.y = top;
      var capShape = new THREE.Shape();
      capShape.moveTo(-W / 2, -W / 2); capShape.lineTo(W / 2, -W / 2); capShape.lineTo(W / 2, W / 2); capShape.lineTo(-W / 2, W / 2); capShape.lineTo(-W / 2, -W / 2);
      var hole = new THREE.Path(); hole.absarc(0, 0, 0.86, 0, Math.PI * 2, true); capShape.holes.push(hole);
      var cap = new THREE.Mesh(new THREE.ExtrudeGeometry(capShape, { depth: 0.05, bevelEnabled: false, curveSegments: 48 }), M.housing);
      cap.rotation.x = -Math.PI / 2; topG.add(cap);
      var grille = new THREE.Group(); grille.position.y = 0.04;
      for (j = 0; j < 6; j++) {
        var tor = new THREE.Mesh(new THREE.TorusGeometry(0.22 + j * 0.128, 0.011, 6, 72), M.dark);
        tor.rotation.x = Math.PI / 2; grille.add(tor);
      }
      for (j = 0; j < 4; j++) { var spk = box(1.72, 0.022, 0.022, M.dark); spk.rotation.y = j * Math.PI / 4; grille.add(spk); }
      var hubCap = cyl(0.13, 0.13, 0.05, 32, M.dark); hubCap.position.y = 0.01; grille.add(hubCap);
      var logoRing = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 8, 40), M.glowSolid); logoRing.rotation.x = Math.PI / 2; logoRing.position.y = 0.04; grille.add(logoRing);
      topG.add(grille);
      unit.add(topG);

      // fan + motor
      var fan = new THREE.Group(); fan.position.y = top - 0.16;
      var hub = cyl(0.1, 0.12, 0.1, 24, M.dark); fan.add(hub);
      var motor = cyl(0.19, 0.19, 0.32, 28, M.dark); motor.position.y = -0.24; fan.add(motor);
      var bladeShape = new THREE.Shape();
      bladeShape.moveTo(0.08, -0.05);
      bladeShape.quadraticCurveTo(0.42, -0.2, 0.78, -0.12);
      bladeShape.quadraticCurveTo(0.86, 0.0, 0.76, 0.13);
      bladeShape.quadraticCurveTo(0.42, 0.16, 0.08, 0.05);
      bladeShape.lineTo(0.08, -0.05);
      var bladeGeo = new THREE.ExtrudeGeometry(bladeShape, { depth: 0.016, bevelEnabled: false, curveSegments: 16 });
      bladeGeo.rotateX(-Math.PI / 2);
      var blades = new THREE.Group();
      for (j = 0; j < 4; j++) {
        var pivot = new THREE.Group(); pivot.rotation.y = j * Math.PI / 2;
        var bl = new THREE.Mesh(bladeGeo, M.fan); bl.rotation.x = 0.32; pivot.add(bl); blades.add(pivot);
      }
      fan.add(blades);
      unit.add(fan);

      // "sealed & commissioned" rings
      var seal = new THREE.Mesh(new THREE.RingGeometry(1.45, 1.53, 96), M.glow); seal.rotation.x = -Math.PI / 2; seal.position.y = 0.13; unit.add(seal);
      var sealMat2 = M.glow.clone();
      var seal2 = new THREE.Mesh(new THREE.RingGeometry(1.45, 1.5, 96), sealMat2); seal2.rotation.x = -Math.PI / 2; seal2.position.y = 0.13; unit.add(seal2);

      // cool air rising from the fan
      var RN = mqDesktop.matches ? 180 : 110, rpos = new Float32Array(RN * 3), rgeo = new THREE.BufferGeometry();
      for (j = 0; j < RN; j++) {
        var rr = Math.sqrt(Math.random()) * 0.75, ra = Math.random() * Math.PI * 2;
        rpos[j * 3] = Math.cos(ra) * rr; rpos[j * 3 + 1] = top + Math.random() * 1.8; rpos[j * 3 + 2] = Math.sin(ra) * rr;
      }
      rgeo.setAttribute('position', new THREE.BufferAttribute(rpos, 3));
      var rmat = new THREE.PointsMaterial({ size: 0.055, map: dotTexture(), color: 0x5ce1ff, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
      var rise = new THREE.Points(rgeo, rmat); rise.frustumCulled = false; unit.add(rise);

      onTheme(function (p) {
        [M.louver, M.fan, M.fin, M.comp].forEach(function (m) { m.emissive.set(p.accent); });
        M.copper.emissive.set(p.warm);
        M.glowSolid.color.set(p.accent); M.glow.color.set(p.accent); sealMat2.color.set(p.accent); rmat.color.set(p.accent);
        M.housing.color.set(p.housing); M.louver.color.set(p.louver); M.pad.color.set(p.pad);
        var blend = p.light ? THREE.NormalBlending : THREE.AdditiveBlending;
        [rmat, M.glow, sealMat2].forEach(function (m) { m.blending = blend; m.needsUpdate = true; });
      });

      var sp = 0, camTarget = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(0.56, 0.36, 0.75).normalize();
      return {
        object: unit,
        update: function (dt, t, ctx) {
          var p = S.explodeAuto ? (0.5 - 0.5 * Math.cos(t * 0.3)) : (S.explode || 0);
          sp += (p - sp) * Math.min(1, dt * 5);
          var s = sp * 4;
          var e1 = smooth(s), e2 = smooth(s - 1), e3 = smooth(s - 2), e4 = smooth((s - 3) / 0.8);
          var kk = 1 - e4;
          topG.position.y = top + 1.25 * e1 * kk;
          fan.position.y = top - 0.16 + 0.72 * e1 * kk;
          sides.forEach(function (g) { g.position.copy(g.userData.base).addScaledVector(g.userData.n, (1.0 * e2 + 0.4 * e3) * kk); });
          coilWalls.forEach(function (w) { w.position.copy(w.userData.base).addScaledVector(w.userData.n, 0.5 * e3 * kk); });
          comp.position.y = 0.12 * e3 * kk;

          var pulse = 0.75 + 0.25 * Math.sin(t * 4);
          var hf = bump(s, 0.75, 0.9), hc = bump(s, 1.75, 0.9), hp = bump(s, 2.75, 0.9), hs = smooth((s - 3.2) / 0.6);
          M.fan.emissiveIntensity = hf * 0.9 * pulse;
          M.fin.emissiveIntensity = hc * 0.35 * pulse;
          M.copper.emissiveIntensity = Math.max(hc, hp) * 0.5 * pulse;
          M.comp.emissiveIntensity = hp * 0.8 * pulse;
          M.louver.emissiveIntensity = hs * 0.25;
          M.glow.opacity = hs * (0.55 + 0.25 * Math.sin(t * 3));
          var ph = (t * 0.6) % 1;
          seal2.scale.setScalar(1 + ph * 0.35); sealMat2.opacity = hs * (1 - ph) * 0.5;

          blades.rotation.y += dt * (reduced ? 1.5 : 10) * (0.35 + 0.65 * kk);
          unit.rotation.y = -0.5 + sp * Math.PI * 1.1 + (reduced ? 0 : Math.sin(t * 0.25) * 0.08);

          // rising air (visible when assembled)
          rmat.opacity = 0.6 * (1 - e1 * kk);
          var arr = rgeo.attributes.position.array;
          for (var i = 0; i < RN; i++) {
            var y = arr[i * 3 + 1] + dt * (0.8 + (i % 7) * 0.12);
            if (y > top + 1.9) y = top + 0.05;
            arr[i * 3 + 1] = y;
          }
          rgeo.attributes.position.needsUpdate = true;
          rise.rotation.y += dt * 1.2;

          // camera framing (pulls back while exploded, adapts to narrow screens)
          var cam = ctx.camera, size = ctx.size;
          if (cam && size) {
            var aspect = size.width / Math.max(1, size.height);
            var dist = 7.6 * Math.max(1, 1.2 / aspect) * (1 + 0.22 * e2 * kk) * (1 - 0.05 * e4);
            cam.position.set(dir.x * dist + S.pointer.x * 0.35, dir.y * dist + S.pointer.y * 0.2 + 0.3 * e1 * kk, dir.z * dist);
            camTarget.y = 0.95 + 0.45 * e1 * kk;
            cam.lookAt(camTarget);
          }
        },
        dispose: function () { disposeTree(unit); }
      };
    }

    return { makeEnv: makeEnv, createAirflow: createAirflow, createOrb: createOrb, createCondenser: createCondenser };
  }

  /* lights are identical for both renderers */
  var LIGHTS = {
    hero: [
      ['ambient', { intensity: 0.35 }],
      ['directional', { position: [3, 4, 5], intensity: 1.4 }],
      ['point', { position: [3, 1.5, 3], intensity: 18, color: '#5ce1ff' }],
      ['point', { position: [-3, -1, 2.5], intensity: 14, color: '#ff7a45' }]
    ],
    unit: [
      ['hemisphere', { args: ['#cfe8ff', '#0a1224', 0.9] }],
      ['directional', { position: [4, 7, 5], intensity: 2.4 }],
      ['directional', { position: [-5, 3, -4], intensity: 0.8, color: '#9ec9ff' }],
      ['point', { position: [-3.5, 1.5, 2.5], intensity: 16, color: '#ff7a45' }],
      ['point', { position: [3.5, 1.2, -2.5], intensity: 20, color: '#5ce1ff' }]
    ]
  };
  var CAMERAS = {
    hero: { position: [0, 0, 6], fov: 50, near: 0.1, far: 60 },
    unit: { position: [4.2, 2.9, 5.6], fov: 32, near: 0.1, far: 80 }
  };

  /* =================================================================
     RENDERER A: React Three Fiber
     ================================================================= */
  function mountR3F(ReactNS, DomNS, R3F, THREE, B) {
    var React = ReactNS && ReactNS.createElement ? ReactNS : ReactNS.default;
    var createRoot = DomNS.createRoot || (DomNS.default && DomNS.default.createRoot);
    var Canvas = R3F.Canvas, useFrame = R3F.useFrame, useThree = R3F.useThree;
    if (!React || !createRoot || !Canvas || !useFrame || !useThree) throw new Error('R3F exports missing');
    var h = React.createElement;

    class Boundary extends React.Component {
      constructor(props) { super(props); this.state = { failed: false }; }
      static getDerivedStateFromError() { return { failed: true }; }
      componentDidCatch(err) { if (this.props.onFail) this.props.onFail(err); }
      render() { return this.state.failed ? null : this.props.children; }
    }

    function Lights(props) {
      return h(React.Fragment, null, LIGHTS[props.name].map(function (l, i) {
        var type = l[0], p = Object.assign({ key: i }, l[1]);
        return h(type === 'ambient' ? 'ambientLight' : type === 'directional' ? 'directionalLight' : type === 'point' ? 'pointLight' : 'hemisphereLight', p);
      }));
    }
    function useEnvironment(intensity) {
      var gl = useThree(function (s) { return s.gl; }), scene = useThree(function (s) { return s.scene; });
      React.useEffect(function () {
        var env = B.makeEnv(gl); if (!env) return undefined;
        scene.environment = env; if ('environmentIntensity' in scene) scene.environmentIntensity = intensity;
        return function () { scene.environment = null; env.dispose(); };
      }, [gl, scene]);
    }
    /* render on demand, only while visible */
    function Driver(props) {
      var invalidate = useThree(function (s) { return s.invalidate; });
      React.useEffect(function () {
        var raf;
        var loop = function () { if (vis[props.name] && !document.hidden) invalidate(); raf = requestAnimationFrame(loop); };
        raf = requestAnimationFrame(loop);
        return function () { cancelAnimationFrame(raf); };
      }, [invalidate]);
      return null;
    }
    function HeroScene() {
      var parts = React.useMemo(function () { return { flow: B.createAirflow(), orb: B.createOrb() }; }, []);
      useEnvironment(0.9);
      React.useEffect(function () { return function () { parts.flow.dispose(); parts.orb.dispose(); }; }, [parts]);
      useFrame(function (state, delta) {
        var dt = Math.min(delta, 0.05), t = state.clock.elapsedTime;
        parts.flow.update(dt, t, state); parts.orb.update(dt, t, state);
      });
      return h(React.Fragment, null, h(Lights, { name: 'hero' }), h('primitive', { object: parts.flow.object }), h('primitive', { object: parts.orb.object }));
    }
    function UnitScene() {
      var unit = React.useMemo(function () { return B.createCondenser(); }, []);
      useEnvironment(0.75);
      React.useEffect(function () { return function () { unit.dispose(); }; }, [unit]);
      useFrame(function (state, delta) { unit.update(Math.min(delta, 0.05), state.clock.elapsedTime, state); });
      return h(React.Fragment, null, h(Lights, { name: 'unit' }), h('primitive', { object: unit.object }));
    }
    function mount(host, name, Scene) {
      var r = createRoot(host), fellBack = false;
      var onFail = function (err) {
        if (fellBack) return; fellBack = true;
        console.warn('[Airwise 3D] R3F error in "' + name + '", switching to plain three.js', err);
        setTimeout(function () { try { r.unmount(); } catch (e) { /* noop */ } host.innerHTML = ''; mountVanilla(THREE, B, host, name); }, 0);
      };
      r.render(h(Boundary, { onFail: onFail },
        h(Canvas, {
          frameloop: 'demand',
          dpr: [1, mqDesktop.matches ? 1.75 : 1.5],
          gl: { antialias: true, alpha: true, powerPreference: 'high-performance' },
          camera: CAMERAS[name],
          style: { width: '100%', height: '100%' },
          onCreated: function (st) { st.gl.setClearColor(0x000000, 0); }
        }, h(Driver, { name: name }), h(Scene))));
    }
    if (heroHost) mount(heroHost, 'hero', HeroScene);
    if (unitHost) mount(unitHost, 'unit', UnitScene);
  }

  /* =================================================================
     RENDERER B: plain three.js (fallback, same scenes)
     ================================================================= */
  function mountVanilla(THREE, B, host, name) {
    var renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); }
    catch (e) { fail(e); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mqDesktop.matches ? 1.75 : 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%'; renderer.domElement.style.display = 'block';
    host.appendChild(renderer.domElement);

    var cfg = CAMERAS[name];
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(cfg.fov, 1, cfg.near, cfg.far);
    camera.position.set(cfg.position[0], cfg.position[1], cfg.position[2]);
    var env = B.makeEnv(renderer);
    if (env) { scene.environment = env; scene.environmentIntensity = name === 'hero' ? 0.9 : 0.75; }

    LIGHTS[name].forEach(function (l) {
      var o = l[1], light;
      if (l[0] === 'ambient') light = new THREE.AmbientLight(0xffffff, o.intensity);
      else if (l[0] === 'directional') light = new THREE.DirectionalLight(o.color || 0xffffff, o.intensity);
      else if (l[0] === 'point') light = new THREE.PointLight(o.color || 0xffffff, o.intensity);
      else light = new THREE.HemisphereLight(o.args[0], o.args[1], o.args[2]);
      if (o.position) light.position.set(o.position[0], o.position[1], o.position[2]);
      scene.add(light);
    });
    var parts = name === 'hero' ? [B.createAirflow(), B.createOrb()] : [B.createCondenser()];
    parts.forEach(function (p) { scene.add(p.object); });

    var ctx = { camera: camera, size: { width: 1, height: 1 }, viewport: { width: 1, height: 1 } };
    function resize() {
      var w = host.clientWidth || 1, hh = host.clientHeight || 1;
      ctx.size.width = w; ctx.size.height = hh;
      renderer.setSize(w, hh, false);
      camera.aspect = w / hh; camera.updateProjectionMatrix();
      var dist = name === 'hero' ? camera.position.length() : 6;
      ctx.viewport.height = 2 * Math.tan(camera.fov * Math.PI / 360) * dist;
      ctx.viewport.width = ctx.viewport.height * camera.aspect;
    }
    resize();
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(host); else window.addEventListener('resize', resize);
    var clock = new THREE.Clock();
    (function loop() {
      requestAnimationFrame(loop);
      var dt = Math.min(clock.getDelta(), 0.05);
      if (!vis[name] || document.hidden) return;
      var t = clock.elapsedTime;
      for (var i = 0; i < parts.length; i++) parts[i].update(dt, t, ctx);
      renderer.render(scene, camera);
    })();
    root.classList.add('three-ready');
  }

  /* =================================================================
     BOOT: load libraries through the import map
     ================================================================= */
  function boot() {
    var imp;
    try { imp = new Function('s', 'return import(s)'); } catch (e) { fail(e); return; }
    var THREE, B;
    imp('three')
      .then(function (mod) {
        THREE = mod;
        return imp('three/addons/environments/RoomEnvironment.js').then(function (m) { return m.RoomEnvironment; }, function () { return null; });
      })
      .then(function (RoomEnvironment) {
        B = makeBuilders(THREE, RoomEnvironment);
        return Promise.all([imp('react'), imp('react-dom/client'), imp('@react-three/fiber')])
          .then(function (m) {
            mountR3F(m[0], m[1], m[2], THREE, B);
            root.classList.add('three-ready', 'r3f-ready');
          })
          .catch(function (e) {
            console.warn('[Airwise 3D] React Three Fiber unavailable, using plain three.js', e);
            if (heroHost) { heroHost.innerHTML = ''; mountVanilla(THREE, B, heroHost, 'hero'); }
            if (unitHost) { unitHost.innerHTML = ''; mountVanilla(THREE, B, unitHost, 'unit'); }
          });
      })
      .catch(fail);
  }

  // Start after window load (or 2.5 s at most) so the preloader stays smooth
  var started = false;
  function start() { if (started) return; started = true; boot(); }
  if (document.readyState === 'complete') setTimeout(start, 50);
  else { window.addEventListener('load', function () { setTimeout(start, 50); }); setTimeout(start, 2500); }
})();
