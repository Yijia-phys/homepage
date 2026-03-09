/**
 * shared.js — yijialog.org
 * Common UI: wallpaper system · wave canvas · display sliders · settings panel
 *
 * Usage on each page:
 *   SharedUI.initWallpaper();
 *   SharedUI.initDisplay(['blur', 'bright', 'overlay', 'card']);
 *   SharedUI.initWaves();
 *   var toggleSettings = SharedUI.initSettings('settings', '.settings-btn');
 */
(function (global) {
  'use strict';

  // ── Storage helpers ────────────────────────────────────────────────
  function save(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  }
  function load(k, def) {
    try { var v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; }
  }

  // ── Wallpaper system ───────────────────────────────────────────────
  var PRESETS = [
    { type: 'gradient', cls: 'wp-gradient-1', label: 'Nebula'   },
    { type: 'gradient', cls: 'wp-gradient-2', label: 'Ocean'    },
    { type: 'gradient', cls: 'wp-gradient-3', label: 'Midnight' },
    { type: 'gradient', cls: 'wp-gradient-4', label: 'Ember'    },
    { type: 'gradient', cls: 'wp-gradient-5', label: 'Void'     },
  ];

  var _bg, _bgNext, _userWps, _currentWp;

  function _allWps() {
    return PRESETS.map(function (p, i) { return Object.assign({}, p, { id: 'preset-' + i }); })
      .concat(_userWps.map(function (u) { return { id: u.id, type: 'image', src: u.dataUrl }; }));
  }

  function _applyWpToEl(el, wp) {
    el.className = '';
    el.style.backgroundImage = '';
    if (wp.type === 'gradient') {
      el.classList.add(wp.cls);
    } else {
      el.style.backgroundImage = 'url(' + wp.src + ')';
      el.style.backgroundSize  = 'cover';
    }
  }

  function _switchWallpaper(id) {
    if (id === _currentWp) return;
    var wp = _allWps().find(function (w) { return w.id === id; });
    if (!wp) return;
    _applyWpToEl(_bgNext, wp);
    _bgNext.style.opacity = '1';
    setTimeout(function () {
      _applyWpToEl(_bg, wp);
      _bgNext.style.opacity = '0';
      _currentWp = id;
      save('current-wp', id);
      _refreshThumbs();
    }, 820);
  }

  function _deleteUserWp(id, e) {
    e.stopPropagation();
    _userWps = _userWps.filter(function (u) { return u.id !== id; });
    save('user-wps', _userWps);
    if (_currentWp === id) _switchWallpaper('preset-3');
    _refreshThumbs();
  }

  function _refreshThumbs() {
    var grid = document.getElementById('wp-grid');
    if (!grid) return;
    grid.innerHTML = '';
    _allWps().forEach(function (wp) {
      var t = document.createElement('div');
      t.className = 'wp-thumb' + (wp.id === _currentWp ? ' active' : '');
      if (wp.type === 'gradient') { t.classList.add(wp.cls); t.title = wp.label || ''; }
      else { t.style.backgroundImage = 'url(' + wp.src + ')'; }
      t.onclick = function () { _switchWallpaper(wp.id); };
      if (wp.type === 'image') {
        var del = document.createElement('div');
        del.className   = 'wp-thumb-del';
        del.textContent = 'x';
        del.onclick = function (e) { _deleteUserWp(wp.id, e); };
        t.appendChild(del);
      }
      grid.appendChild(t);
    });
  }

  /**
   * initWallpaper()
   * Requires: #bg  #bg-next  #wp-grid  #file-input
   */
  function initWallpaper() {
    _bg        = document.getElementById('bg');
    _bgNext    = document.getElementById('bg-next');
    _userWps   = load('user-wps', []);
    _currentWp = load('current-wp', 'preset-3');

    var fi = document.getElementById('file-input');
    if (fi) {
      fi.addEventListener('change', function (e) {
        var file = e.target.files[0]; if (!file) return;
        var reader = new FileReader();
        reader.onload = function (ev) {
          var id = 'user-' + Date.now();
          _userWps.push({ id: id, dataUrl: ev.target.result });
          if (_userWps.length > 5) _userWps = _userWps.slice(-5);
          // Quota-safe save: if storage is full, drop oldest until it fits
          var saved = false;
          while (_userWps.length > 0 && !saved) {
            try {
              localStorage.setItem('user-wps', JSON.stringify(_userWps));
              saved = true;
            } catch (e) {
              _userWps.shift(); // drop oldest and retry
            }
          }
          _refreshThumbs();
          _switchWallpaper(id);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
      });
    }

    var wp = _allWps().find(function (w) { return w.id === _currentWp; }) || _allWps()[3];
    _applyWpToEl(_bg, wp);
    _currentWp = wp.id;
    _refreshThumbs();
  }

  // ── Display sliders ────────────────────────────────────────────────
  // Keys:
  //   blur    -> background blur (px)
  //   bright  -> background brightness (%)
  //   overlay -> dark overlay opacity (%)
  //   card    -> --glass CSS variable (%)
  //   ui      -> --ui-opacity CSS variable (%)
  //
  // index.html : ['blur', 'bright', 'overlay', 'card']
  // clock.html : ['blur', 'bright', 'overlay', 'ui']
  // map.html   : ['blur', 'bright', 'overlay']

  function _applyBgFilter(cfg) {
    var f = 'blur(' + cfg.blur + 'px) brightness(' + (cfg.bright / 100) + ')';
    if (_bg)     _bg.style.filter     = f;
    if (_bgNext) _bgNext.style.filter = f;
  }

  var _SLIDER_META = {
    blur:    { slId: 'sl-blur',    lblId: 'lbl-blur',    suffix: 'px', def: 8   },
    bright:  { slId: 'sl-bright',  lblId: 'lbl-bright',  suffix: '%',  def: 85  },
    overlay: { slId: 'sl-overlay', lblId: 'lbl-overlay', suffix: '%',  def: 55  },
    card:    { slId: 'sl-card',    lblId: 'lbl-card',    suffix: '%',  def: 30, min: 3  },
    ui:      { slId: 'sl-ui',      lblId: 'lbl-ui',      suffix: '%',  def: 100 },
  };

  function _applySliderEffect(key, val, cfg) {
    switch (key) {
      case 'blur':
      case 'bright':  _applyBgFilter(cfg); break;
      case 'overlay':
        var ov = document.getElementById('overlay');
        if (ov) ov.style.opacity = val / 100;
        break;
      case 'card':
        document.documentElement.style.setProperty('--glass', 'rgba(10,8,6,' + (val / 100) + ')');
        break;
      case 'ui':
        document.documentElement.style.setProperty('--ui-opacity', val / 100);
        break;
    }
  }

  function initDisplay(which) {
    var defaults = { blur: 8, bright: 85, overlay: 55, card: 30, ui: 100 };
    var cfg = load('display', defaults);
    which.forEach(function (k) { if (cfg[k] === undefined) cfg[k] = defaults[k]; });

    which.forEach(function (key) {
      var m = _SLIDER_META[key]; if (!m) return;
      var sl  = document.getElementById(m.slId);
      var lbl = document.getElementById(m.lblId);
      if (!sl) return;
      sl.value = cfg[key];
      if (lbl) lbl.textContent = cfg[key] + m.suffix;
      _applySliderEffect(key, cfg[key], cfg);
      sl.oninput = function () {
        cfg[key] = +this.value;
        if (lbl) lbl.textContent = this.value + m.suffix;
        _applySliderEffect(key, +this.value, cfg);
        save('display', cfg);
      };
    });

    _applyBgFilter(cfg);
  }

  // ── Settings panel ─────────────────────────────────────────────────
  /**
   * initSettings(panelId, gearSelector)
   * Returns the toggle function; assign to a global if used in onclick attrs.
   *
   * e.g.  var toggleSettings = SharedUI.initSettings('settings', '.settings-btn');
   */
  function initSettings(panelId, gearSelector) {
    function toggle() {
      var p = document.getElementById(panelId);
      if (p) p.classList.toggle('open');
    }
    document.addEventListener('click', function (e) {
      var p = document.getElementById(panelId);
      if (!p || !p.classList.contains('open')) return;
      if (!p.contains(e.target) && !e.target.closest(gearSelector)) {
        p.classList.remove('open');
      }
    });
    return toggle;
  }

  // ── Wave canvas ────────────────────────────────────────────────────
  var _WAVES = [
    { A: 55, k: 0.010, omega: 0.55, phi: 0.0, r: 212, g: 114, b: 79  },
    { A: 32, k: 0.018, omega: 0.85, phi: 1.8, r: 100, g: 160, b: 200 },
    { A: 20, k: 0.030, omega: 1.20, phi: 3.5, r: 180, g: 140, b: 210 },
  ];

  /** initAnimation()  Requires: <canvas id="wave-canvas"> */
  function initAnimation() {
    var wc = document.getElementById('wave-canvas');
    if (!wc) return;
    var ctx = wc.getContext('2d'), W, H;

    function resize() { W = wc.width = window.innerWidth; H = wc.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);

    var _paused = false;
    var _mode   = load('anim-mode', 'waves'); // 'waves' | 'lorenz' | 'particles'
    document.addEventListener('visibilitychange', function() { _paused = document.hidden; });

    // ── WAVES ───────────────────────────────────────────────────────
    function drawWaves(t) {
      ctx.clearRect(0, 0, W, H);
      var cy = H * 0.72, halfW = W * 0.5, envW = W * 0.42;
      for (var i = 0; i < _WAVES.length; i++) {
        var w = _WAVES[i];
        ctx.beginPath();
        for (var x = 0; x <= W; x += 2) {
          var dx  = (x - halfW) / envW, env = Math.exp(-(dx * dx));
          var y   = cy + w.A * env * Math.sin(w.k * (x - halfW) + w.omega * t + w.phi);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(' + w.r + ',' + w.g + ',' + w.b + ',0.45)';
        ctx.lineWidth = 1.5; ctx.stroke();
        ctx.beginPath();
        for (var x2 = 0; x2 <= W; x2 += 2) {
          var dx2  = (x2 - halfW) / envW, env2 = Math.exp(-(dx2 * dx2));
          var y2   = cy + w.A * env2 * Math.sin(w.k * (x2 - halfW) + w.omega * t + w.phi);
          x2 === 0 ? ctx.moveTo(x2, y2) : ctx.lineTo(x2, y2);
        }
        ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
        var grad = ctx.createLinearGradient(0, cy - 60, 0, cy + 100);
        grad.addColorStop(0, 'rgba(' + w.r + ',' + w.g + ',' + w.b + ',0.04)');
        grad.addColorStop(1, 'rgba(' + w.r + ',' + w.g + ',' + w.b + ',0.00)');
        ctx.fillStyle = grad; ctx.fill();
      }
    }

    // ── LORENZ ──────────────────────────────────────────────────────
    var _lx = 0.1, _ly = 0, _lz = 0;
    var _lTrail = [];          // {sx,sy} projected screen coords
    var _lMaxTrail = 1800;     // ~30s of history at 60fps
    var _lFade = 0;            // used to fade old canvas content

    function stepLorenz(steps) {
      // Lorenz params: σ=10, ρ=28, β=8/3 — classic chaos
      var sigma = 10, rho = 28, beta = 8/3, dt = 0.008;
      for (var i = 0; i < steps; i++) {
        var dx = sigma * (_ly - _lx);
        var dy = _lx * (rho - _lz) - _ly;
        var dz = _lx * _ly - beta * _lz;
        _lx += dx * dt; _ly += dy * dt; _lz += dz * dt;
      }
    }

    function lorenzToScreen() {
      // Scale so attractor spans ~75% of the shorter screen dimension
      // Lorenz x range ≈ [-20,20], z range ≈ [0,50] → use z-span=50 as reference
      var scale = Math.min(W, H) * 0.75 / 50;
      var sx = W * 0.5  + _lx * scale;
      var sy = H * 0.48 - (_lz - 25) * scale;
      return { sx: sx, sy: sy };
    }

    function drawLorenz() {
      ctx.fillStyle = 'rgba(0,0,0,0.018)';
      ctx.fillRect(0, 0, W, H);

      stepLorenz(3);
      var pt = lorenzToScreen();
      _lTrail.push(pt);
      if (_lTrail.length > _lMaxTrail) _lTrail.shift();
      if (_lTrail.length < 2) return;

      var n = _lTrail.length;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Two passes: wide soft glow first, then crisp core on top
      for (var pass = 0; pass < 2; pass++) {
        var isGlow = pass === 0;
        ctx.lineWidth  = isGlow ? 3.5 : 0.9;
        var alphaScale = isGlow ? 0.12 : 0.55;

        for (var i = 1; i < n; i++) {
          var a = i / n;
          var r = Math.round(180 * a + 30  * (1 - a));
          var g = Math.round(100 * a + 80  * (1 - a));
          var b = Math.round(60  * a + 160 * (1 - a));
          ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + (a * alphaScale) + ')';
          ctx.beginPath();
          ctx.moveTo(_lTrail[i-1].sx, _lTrail[i-1].sy);
          ctx.lineTo(_lTrail[i].sx,   _lTrail[i].sy);
          ctx.stroke();
        }
      }
    }

    function resetLorenz() {
      _lx = 0.1 + Math.random() * 0.2;
      _ly = 0;  _lz = 0;
      _lTrail = [];
      ctx.clearRect(0, 0, W, H);
    }

    // ── PARTICLES (cloud chamber style) ─────────────────────────────
    var _particles = [];
    var _pCount = 110;

    var _TRAIL_LEN = 28;  // trail points per particle

    function _randParticle() {
      var x, y;
      // 40% spawn at edges, 60% spawn anywhere on screen
      if (Math.random() < 0.4) {
        var edge = Math.floor(Math.random() * 4);
        if      (edge === 0) { x = Math.random() * W; y = -2; }
        else if (edge === 1) { x = Math.random() * W; y = H + 2; }
        else if (edge === 2) { x = -2;    y = Math.random() * H; }
        else                 { x = W + 2; y = Math.random() * H; }
      } else {
        x = Math.random() * W;
        y = Math.random() * H;
      }
      return {
        x: x, y: y,
        vx: (Math.random() - 0.5) * 4.5,
        vy: (Math.random() - 0.5) * 4.5,
        life:  140 + Math.random() * 280,
        age:   Math.floor(Math.random() * 200),
        hue:   Math.random(),
        size:  0.6 + Math.random() * 1.0,
        curve: (Math.random() < 0.5 ? 1 : -1) * (0.015 + Math.random() * 0.04),
        ax:    (Math.random() - 0.5) * 0.06,
        ay:    (Math.random() - 0.5) * 0.06,
        trail: [],   // [{x,y}] capped at _TRAIL_LEN
      };
    }

    function initParticles() {
      _particles = [];
      for (var i = 0; i < _pCount; i++) {
        var p = _randParticle();
        p.x = Math.random() * W;
        p.y = Math.random() * H;
        _particles.push(p);
      }
    }

    function drawParticles() {
      // Clear canvas each frame — trails live entirely in particle.trail arrays
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'round';

      for (var i = 0; i < _particles.length; i++) {
        var p = _particles[i];
        p.age++;

        if (p.age > p.life) { _particles[i] = _randParticle(); continue; }

        // Physics
        p.vx += p.curve * p.vy + p.ax;
        p.vy -= p.curve * p.vx + p.ay;
        p.vx *= 0.992; p.vy *= 0.992;
        p.x  += p.vx;  p.y  += p.vy;

        if (p.x < -20 || p.x > W+20 || p.y < -20 || p.y > H+20) {
          _particles[i] = _randParticle(); continue;
        }

        // Append to trail, cap length
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > _TRAIL_LEN) p.trail.shift();

        if (p.trail.length < 2) continue;

        // Overall particle alpha: fade in/out over lifetime
        var lifeFrac  = p.age / p.life;
        var lifeAlpha = Math.sin(lifeFrac * Math.PI);  // 0 → 1 → 0

        // Color
        var cr = Math.round(212 * p.hue + 80  * (1 - p.hue));
        var cg = Math.round(114 * p.hue + 160 * (1 - p.hue));
        var cb = Math.round(79  * p.hue + 240 * (1 - p.hue));

        // Draw trail in 4 opacity bands (batched) — ~10x fewer stroke calls
        var tl = p.trail.length;
        ctx.lineWidth = p.size * 0.9;
        var BANDS = 4;
        for (var b = 0; b < BANDS; b++) {
          var bandStart = Math.floor(tl * b / BANDS);
          var bandEnd   = Math.floor(tl * (b + 1) / BANDS);
          if (bandEnd <= bandStart + 1) continue;
          var midFrac = ((bandStart + bandEnd) * 0.5) / tl;
          var alpha   = midFrac * midFrac * lifeAlpha * 0.75;
          ctx.strokeStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + alpha + ')';
          ctx.beginPath();
          ctx.moveTo(p.trail[bandStart].x, p.trail[bandStart].y);
          for (var j = bandStart + 1; j < bandEnd; j++) {
            ctx.lineTo(p.trail[j].x, p.trail[j].y);
          }
          ctx.stroke();
        }

        // Bright head dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + (lifeAlpha * 0.9) + ')';
        ctx.fill();
      }
    }

    // ── Main loop ────────────────────────────────────────────────────
    var _prevMode = null;
    (function loop(ts) {
      if (!_paused) {
        var t = (ts || 0) * 0.001;
        if (_mode !== _prevMode) {
          if (_mode === 'lorenz')    { resetLorenz(); }
          if (_mode === 'particles') { initParticles(); ctx.clearRect(0, 0, W, H); }
          if (_mode === 'waves')     { ctx.clearRect(0, 0, W, H); }
          if (_mode === 'off')       { ctx.clearRect(0, 0, W, H); }
          _prevMode = _mode;
        }
        if      (_mode === 'waves')     drawWaves(t);
        else if (_mode === 'lorenz')    drawLorenz();
        else if (_mode === 'particles') drawParticles();
        // 'off' → do nothing, canvas stays clear
      }
      requestAnimationFrame(loop);
    }());

    // Expose control to pages
    wc._setMode = function(m) {
      _mode = m;
      save('anim-mode', m);
    };
    wc._getMode = function() { return _mode; };
  }

  // keep initWaves as alias for backwards compatibility
  function initWaves() { initAnimation(); }

  // ── Shared CSS injection ───────────────────────────────────────────
  /**
   * injectStyles()
   * Injects all shared visual CSS once into <head>.
   * Each page still defines its own layout & positioning overrides.
   * Call before any other SharedUI init so the styles exist when elements render.
   */
  function injectStyles() {
    // Inject shared.css via <link> for proper DevTools source mapping
    if (document.querySelector('link[data-shared-css]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'shared.css';
    link.setAttribute('data-shared-css', '1');
    document.head.appendChild(link);
  }

  // ── Public API ─────────────────────────────────────────────────────
  global.SharedUI = {
    save:          save,
    load:          load,
    injectStyles:  injectStyles,
    initWallpaper: initWallpaper,
    initDisplay:   initDisplay,
    initSettings:  initSettings,
    initWaves:        initWaves,
    initAnimation:    initAnimation,
    setAnimationMode: function(mode) {
      var wc = document.getElementById('wave-canvas');
      if (wc && wc._setMode) wc._setMode(mode);
    },
    getAnimationMode: function() {
      var wc = document.getElementById('wave-canvas');
      return (wc && wc._getMode) ? wc._getMode() : load('anim-mode', 'waves');
    },
    // legacy
    setWavesVisible: function(v) {
      var wc = document.getElementById('wave-canvas');
      if (wc && wc._setMode) wc._setMode(v ? load('anim-mode','waves') : 'off');
    },
  };

}(window));
