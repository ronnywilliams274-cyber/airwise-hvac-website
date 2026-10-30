/* =====================================================================
   AIRWISE 3D STUDIO: Babylon.js configurator
   Babylon.js (~ several MB) is loaded ONLY when the visitor opens the
   "Design your unit" pop-up, so it never slows down the main page.
   ===================================================================== */
(function () {
  'use strict';

  var BABYLON_URL = 'https://cdn.babylonjs.com/babylon.js';
  var ENV_URL = 'https://assets.babylonjs.com/environments/environmentSpecular.env';
  var state = { size: 3, color: '#E8EDF2', colorName: 'Arctic White', pad: 'concrete' };
  var PAD_NAMES = { concrete: 'Concrete pad', composite: 'Composite pad', wall: 'Wall bracket' };
  var engine = null, scene = null, loading = null, running = false;
  var paint = null, louverMat = null, unitRoot = null, blades = null, pads = {};
  var targetScale = 1, targetY = 0.16, targetColor = null, groundMat = null, rimLight = null;

  /* follow the site's color theme (ground + rim light) */
  function applyTheme() {
    if (!scene || !groundMat || !window.BABYLON) return;
    var T = window.AIRWISE_THEMES || {}, k = document.documentElement.getAttribute('data-theme');
    var p = (T[k] && T[k].scene) || null; if (!p) return;
    groundMat.diffuseColor = window.BABYLON.Color3.FromHexString(p.ground);
    rimLight.diffuse = window.BABYLON.Color3.FromHexString(p.accent);
  }
  document.addEventListener('airwise:theme', applyTheme);

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (window.BABYLON) { resolve(); return; }
      var s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = function () { window.BABYLON ? resolve() : reject(new Error('BABYLON missing')); };
      s.onerror = function () { reject(new Error('Failed to load ' + src)); };
      document.head.appendChild(s);
    });
  }

  /* ---------------- UI (works even if Babylon fails) ---------------- */
  function summary() {
    return state.size.toFixed(1) + ' ton · ' + state.colorName + ' · ' + PAD_NAMES[state.pad];
  }
  function refreshUI() {
    var out = $('#cfg-size-out'); if (out) out.textContent = state.size.toFixed(1) + ' ton';
    var hint = $('#cfg-size-hint'); if (hint) hint.textContent = 'Typical for ~' + (state.size * 500).toLocaleString('en-US') + '–' + (state.size * 600).toLocaleString('en-US') + ' sq ft';
    var sum = $('#cfg-summary'); if (sum) sum.textContent = summary();
  }
  function initUI() {
    var size = $('#cfg-size'); if (!size) return;
    size.addEventListener('input', function () { state.size = +size.value; refreshUI(); apply(); });
    $$('#cfg-swatches .swatch[data-color]').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('#cfg-swatches .swatch').forEach(function (x) { x.classList.remove('is-active'); x.setAttribute('aria-checked', 'false'); });
        b.classList.add('is-active'); b.setAttribute('aria-checked', 'true');
        state.color = b.getAttribute('data-color'); state.colorName = b.getAttribute('data-name');
        refreshUI(); apply();
      });
    });
    var custom = $('#cfg-custom');
    if (custom) custom.addEventListener('input', function () {
      $$('#cfg-swatches .swatch').forEach(function (x) { x.classList.remove('is-active'); x.setAttribute('aria-checked', 'false'); });
      custom.parentNode.classList.add('is-active');
      state.color = custom.value; state.colorName = 'Custom ' + custom.value.toUpperCase();
      refreshUI(); apply();
    });
    $$('#cfg-pad button').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('#cfg-pad button').forEach(function (x) { x.classList.remove('is-active'); });
        b.classList.add('is-active'); state.pad = b.getAttribute('data-pad');
        refreshUI(); apply();
      });
    });
    var send = $('#cfg-send');
    if (send) send.addEventListener('click', function () {
      var m = document.getElementById('modal-config');
      if (window.AirwiseModal) window.AirwiseModal.close(m);
      if (window.AirwiseQuote && window.AirwiseQuote.prefill) window.AirwiseQuote.prefill('Installation', summary());
      setTimeout(function () {
        var q = document.getElementById('quote');
        if (window.AIRWISE_LENIS) window.AIRWISE_LENIS.scrollTo(q, { duration: 1.4 }); else if (q) q.scrollIntoView({ behavior: 'smooth' });
      }, 380);
    });
    refreshUI();
  }

  /* ---------------- Babylon scene ---------------- */
  function pbr(name, hex, metallic, roughness) {
    var m = new BABYLON.PBRMaterial(name, scene);
    m.albedoColor = BABYLON.Color3.FromHexString(hex);
    m.metallic = metallic; m.roughness = roughness;
    return m;
  }
  function build() {
    var B = window.BABYLON;
    var canvas = document.getElementById('cfg-canvas');
    engine = new B.Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true, antialias: true }, true);
    engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 2));
    scene = new B.Scene(engine);
    scene.clearColor = new B.Color4(0, 0, 0, 0);

    var cam = new B.ArcRotateCamera('cam', -Math.PI / 3.2, Math.PI / 2.75, 8.2, new B.Vector3(0, 1.1, 0), scene);
    cam.attachControl(canvas, true);
    cam.lowerRadiusLimit = 4.5; cam.upperRadiusLimit = 13;
    cam.wheelDeltaPercentage = 0.01; cam.pinchDeltaPercentage = 0.01;
    cam.panningSensibility = 0; cam.lowerBetaLimit = 0.35; cam.upperBetaLimit = Math.PI / 2.05;
    cam.useAutoRotationBehavior = true;
    if (cam.autoRotationBehavior) { cam.autoRotationBehavior.idleRotationSpeed = 0.3; cam.autoRotationBehavior.idleRotationWaitTime = 2500; }

    var hemi = new B.HemisphericLight('hemi', new B.Vector3(0.3, 1, 0.2), scene);
    hemi.intensity = 0.7; hemi.groundColor = new B.Color3(0.05, 0.08, 0.15);
    var sun = new B.DirectionalLight('sun', new B.Vector3(-0.6, -1, -0.45), scene);
    sun.position = new B.Vector3(6, 10, 6); sun.intensity = 2.4;
    var rim = new B.PointLight('rim', new B.Vector3(-4, 3, 4), scene);
    rim.diffuse = B.Color3.FromHexString('#5CE1FF'); rim.intensity = 0.9;
    try { scene.environmentTexture = B.CubeTexture.CreateFromPrefilteredData(ENV_URL, scene); scene.environmentIntensity = 0.85; } catch (e) { /* lights only */ }

    var sg = new B.ShadowGenerator(1024, sun);
    sg.useBlurExponentialShadowMap = true; sg.blurKernel = 24; sg.darkness = 0.4;

    var ground = B.MeshBuilder.CreateDisc('ground', { radius: 7, tessellation: 72 }, scene);
    ground.rotation.x = Math.PI / 2;
    var gm = new B.StandardMaterial('gm', scene);
    gm.diffuseColor = B.Color3.FromHexString('#0E1C34'); gm.specularColor = new B.Color3(0, 0, 0);
    ground.material = gm; ground.receiveShadows = true;
    groundMat = gm; rimLight = rim;

    paint = pbr('paint', state.color, 0.35, 0.38);
    paint.clearCoat.isEnabled = true; paint.clearCoat.intensity = 0.6;
    louverMat = pbr('louver', state.color, 0.4, 0.45);
    var dark = pbr('dark', '#141a24', 0.5, 0.45);
    var copper = pbr('copper', '#c87a42', 1, 0.3);
    var concrete = new B.StandardMaterial('concrete', scene); concrete.diffuseColor = B.Color3.FromHexString('#8C939E'); concrete.specularColor = new B.Color3(0.05, 0.05, 0.05);
    var composite = new B.StandardMaterial('composite', scene); composite.diffuseColor = B.Color3.FromHexString('#2B3039'); composite.specularColor = new B.Color3(0.1, 0.1, 0.1);
    var wallMat = new B.StandardMaterial('wallm', scene); wallMat.diffuseColor = B.Color3.FromHexString('#C9C2B6'); wallMat.specularColor = new B.Color3(0.02, 0.02, 0.02);

    unitRoot = new B.TransformNode('unit', scene);
    var W = 2.0, H = 1.6;
    var casters = [];
    function add(mesh, mat, parent) { mesh.material = mat; mesh.parent = parent || unitRoot; casters.push(mesh); return mesh; }

    add(B.MeshBuilder.CreateBox('pan', { width: W + 0.08, height: 0.08, depth: W + 0.08 }, scene), dark).position.y = 0.04;
    add(B.MeshBuilder.CreateBox('core', { width: W - 0.12, height: H - 0.1, depth: W - 0.12 }, scene), dark).position.y = 0.08 + H / 2;
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (s, i) {
      var p = add(B.MeshBuilder.CreateBox('post' + i, { width: 0.12, height: H, depth: 0.12 }, scene), paint);
      p.position.set(s[0] * (W / 2 - 0.02), 0.08 + H / 2, s[1] * (W / 2 - 0.02));
    });
    // louvers on 4 sides
    var slatSrc = B.MeshBuilder.CreateBox('slat', { width: W - 0.14, height: 0.045, depth: 0.06 }, scene);
    slatSrc.material = louverMat; slatSrc.setEnabled(false);
    for (var k = 0; k < 4; k++) {
      var side = new B.TransformNode('side' + k, scene); side.parent = unitRoot;
      side.rotation.y = k * Math.PI / 2;
      for (var j = 0; j < 14; j++) {
        var sl = slatSrc.clone('sl' + k + '_' + j); sl.setEnabled(true); sl.parent = side;
        sl.position.set(0, 0.22 + j * ((H - 0.26) / 13), W / 2);
        sl.rotation.x = -0.6; casters.push(sl);
      }
    }
    // top cap + grille + fan
    add(B.MeshBuilder.CreateBox('cap', { width: W + 0.06, height: 0.08, depth: W + 0.06 }, scene), paint).position.y = 0.08 + H + 0.04;
    for (var r = 0; r < 6; r++) {
      var tor = add(B.MeshBuilder.CreateTorus('ring' + r, { diameter: 0.44 + r * 0.26, thickness: 0.022, tessellation: 64 }, scene), dark);
      tor.position.y = 0.08 + H + 0.1;
    }
    blades = new B.TransformNode('blades', scene); blades.parent = unitRoot; blades.position.y = 0.08 + H - 0.02;
    for (var b = 0; b < 4; b++) {
      var bl = add(B.MeshBuilder.CreateBox('blade' + b, { width: 0.72, height: 0.02, depth: 0.24 }, scene), dark, blades);
      var piv = new B.TransformNode('piv' + b, scene); piv.parent = blades; piv.rotation.y = b * Math.PI / 2;
      bl.parent = piv; bl.position.x = 0.42; bl.rotation.x = 0.35;
    }
    // service valves
    for (var v = 0; v < 2; v++) {
      var valve = add(B.MeshBuilder.CreateCylinder('valve' + v, { diameter: 0.09, height: 0.18 }, scene), copper);
      valve.rotation.z = Math.PI / 2; valve.position.set(W / 2 + 0.06, 0.45 + v * 0.16, W / 2 - 0.25);
    }
    // label
    try {
      var dt = new B.DynamicTexture('lbl', { width: 512, height: 128 }, scene, true);
      var c = dt.getContext();
      c.fillStyle = '#0b1424'; c.fillRect(0, 0, 512, 128);
      c.fillStyle = '#ffffff'; c.font = 'bold 66px Arial'; c.textAlign = 'center'; c.fillText('AIRWISE', 256, 84);
      dt.update();
      var lm = new B.StandardMaterial('lm', scene); lm.diffuseTexture = dt; lm.emissiveColor = new B.Color3(0.85, 0.9, 1); lm.disableLighting = true;
      var label = B.MeshBuilder.CreatePlane('label', { width: 0.7, height: 0.175 }, scene);
      label.material = lm; label.parent = unitRoot; label.position.set(0, 0.08 + H * 0.84, -(W / 2 + 0.05));
    } catch (e) { /* label optional */ }

    // pads / mounting
    var padC = B.MeshBuilder.CreateBox('padConcrete', { width: 2.7, height: 0.16, depth: 2.7 }, scene); padC.material = concrete; padC.position.y = 0.08; padC.receiveShadows = true;
    var padP = B.MeshBuilder.CreateBox('padComposite', { width: 2.5, height: 0.1, depth: 2.5 }, scene); padP.material = composite; padP.position.y = 0.05; padP.receiveShadows = true;
    var wallNode = new B.TransformNode('wallNode', scene);
    var wall = B.MeshBuilder.CreateBox('wall', { width: 5, height: 3.6, depth: 0.12 }, scene); wall.material = wallMat; wall.parent = wallNode; wall.position.set(0, 1.8, 1.55); wall.receiveShadows = true;
    for (var a = 0; a < 2; a++) {
      var arm = B.MeshBuilder.CreateBox('arm' + a, { width: 0.1, height: 0.1, depth: 2.4 }, scene); arm.material = dark; arm.parent = wallNode; arm.position.set(a ? 0.8 : -0.8, 0.86, 0.35);
      var brace = B.MeshBuilder.CreateBox('brace' + a, { width: 0.08, height: 0.08, depth: 1.5 }, scene); brace.material = dark; brace.parent = wallNode; brace.position.set(a ? 0.8 : -0.8, 0.45, 1.0); brace.rotation.x = -0.6;
      casters.push(arm, brace);
    }
    pads = { concrete: [padC], composite: [padP], wall: [wallNode] };

    casters.forEach(function (m) { sg.addShadowCaster(m, false); });

    targetColor = B.Color3.FromHexString(state.color);
    scene.onBeforeRenderObservable.add(function () {
      var dtm = Math.min(engine.getDeltaTime() / 1000, 0.05);
      blades.rotation.y += dtm * 8;
      var s = unitRoot.scaling.x + (targetScale - unitRoot.scaling.x) * Math.min(1, dtm * 7);
      unitRoot.scaling.set(s, s, s);
      unitRoot.position.y += (targetY - unitRoot.position.y) * Math.min(1, dtm * 7);
      var cur = paint.albedoColor;
      paint.albedoColor = B.Color3.Lerp(cur, targetColor, Math.min(1, dtm * 6));
      louverMat.albedoColor = paint.albedoColor.scale(0.62);
    });
    window.addEventListener('resize', function () { if (running) engine.resize(); });
    apply(true);
    applyTheme();
  }
  function apply(instant) {
    if (!scene || !window.BABYLON) return;
    targetScale = 0.75 + (state.size - 1.5) * 0.12;
    targetY = state.pad === 'wall' ? 0.92 : state.pad === 'composite' ? 0.1 : 0.16;
    targetColor = window.BABYLON.Color3.FromHexString(state.color);
    Object.keys(pads).forEach(function (k) { pads[k].forEach(function (n) { n.setEnabled(k === state.pad); }); });
    if (instant) {
      unitRoot.scaling.set(targetScale, targetScale, targetScale);
      unitRoot.position.y = targetY;
      paint.albedoColor = targetColor.clone();
      louverMat.albedoColor = targetColor.scale(0.62);
    }
  }

  function start() {
    if (running || !engine) return;
    running = true;
    engine.resize();
    engine.runRenderLoop(function () { scene.render(); });
    setTimeout(function () { if (running) engine.resize(); }, 650);
  }
  function stop() { if (!running || !engine) return; running = false; engine.stopRenderLoop(); }
  function open() {
    var loadEl = $('#cfg-loading');
    if (!loading) loading = loadScript(BABYLON_URL).then(build);
    loading.then(function () { if (loadEl) loadEl.classList.add('is-hidden'); start(); })
      .catch(function (e) {
        console.warn('[Airwise 3D studio]', e);
        loading = null;
        if (loadEl) loadEl.innerHTML = '<span>3D preview unavailable right now (offline?).<br>You can still pick your options and request a quote.</span>';
      });
  }

  document.addEventListener('airwise:modal-open', function (e) { if (e.detail && e.detail.id === 'modal-config') open(); });
  document.addEventListener('airwise:modal-close', function (e) { if (e.detail && e.detail.id === 'modal-config') stop(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initUI); else initUI();
  window.AirwiseConfigurator = { open: open, stop: stop, state: state };
})();
