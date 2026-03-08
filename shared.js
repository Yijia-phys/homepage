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
          if (_userWps.length > 8) _userWps = _userWps.slice(-8);
          save('user-wps', _userWps);
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
    card:    { slId: 'sl-card',    lblId: 'lbl-card',    suffix: '%',  def: 30  },
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

  /** initWaves()  Requires: <canvas id="wave-canvas"> */
  function initWaves() {
    var wc = document.getElementById('wave-canvas');
    if (!wc) return;
    var ctx = wc.getContext('2d'), W, H;

    function resize() { W = wc.width = window.innerWidth; H = wc.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);

    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      var cy = H * 0.72, halfW = W * 0.5, envW = W * 0.42;
      for (var i = 0; i < _WAVES.length; i++) {
        var w = _WAVES[i];
        ctx.beginPath();
        for (var x = 0; x <= W; x += 2) {
          var dx  = (x - halfW) / envW;
          var env = Math.exp(-(dx * dx));
          var y   = cy + w.A * env * Math.sin(w.k * (x - halfW) + w.omega * t + w.phi);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(' + w.r + ',' + w.g + ',' + w.b + ',0.45)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        for (var x2 = 0; x2 <= W; x2 += 2) {
          var dx2  = (x2 - halfW) / envW;
          var env2 = Math.exp(-(dx2 * dx2));
          var y2   = cy + w.A * env2 * Math.sin(w.k * (x2 - halfW) + w.omega * t + w.phi);
          x2 === 0 ? ctx.moveTo(x2, y2) : ctx.lineTo(x2, y2);
        }
        ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
        var grad = ctx.createLinearGradient(0, cy - 60, 0, cy + 100);
        grad.addColorStop(0, 'rgba(' + w.r + ',' + w.g + ',' + w.b + ',0.04)');
        grad.addColorStop(1, 'rgba(' + w.r + ',' + w.g + ',' + w.b + ',0.00)');
        ctx.fillStyle = grad;
        ctx.fill();
      }
    }

    (function loop(ts) { draw((ts || 0) * 0.001); requestAnimationFrame(loop); }());
  }

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
    initWaves:     initWaves,
  };

}(window));
