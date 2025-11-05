"use strict";

/*
 * ASLOGIN
 * Renders a starfield background, meteor streaks, and airplane light trails across
 * four stacked canvases. Colors are sourced from CSS variables so themes can switch.
 */
class ASLOGIN {
  static get defaults() {
    return {
      // Canvas selectors
      bgCanvas: '#bgCanvas',
      tailCanvas: '#tailCanvas',
      planeFxCanvas: '#planeCanvas',
      fxCanvas: '#fxCanvas',

      // Starfield settings
      starCount: 800,
      starSpeedMin: 0.00025,
      starSpeedMax: 0.00045,
      starSizeMin: 0.4,
      starSizeMax: 2.0,
      trailFade: 0.03, // per-frame alpha fill over bg to create motion trails
      starColors: [
        [255, 255, 255],
        [240, 215, 180],
        [200, 220, 255],
        [240, 180, 180],
        [170, 240, 240],
        [240, 240, 200]
      ],

      // Meteor settings
      meteorIntervalMin: 2000,
      meteorIntervalMax: 5000,
      meteorSpeedMin: 28,
      meteorSpeedMax: 58,
      meteorLenMin: 80,
      meteorLenMax: 160,
      meteorColors: ['#fff', '#a9bfff', '#ffe3a9', '#f6b3b3'],
      meteorYMaxFactor: 0.4,  // spawn across top N% of screen height
      meteorDirYMin: 0.25,
      meteorDirYMax: 0.60,
      meteorLineWidth: 2,

      // Plane settings (persistent white tail + flashing wing lights)
      planeEnabled: true,
      planeIntervalMin: 8000,
      planeIntervalMax: 12000,
      planeSpeedMin: 3.5,
      planeSpeedMax: 6.0,
      planeWingOffset: 12,
      planeTailOffset: 28,
      planeTailColor: [180, 180, 180],
      planeTailAlpha: 0.4,
      planeTailLineWidth: 1.4,
      planeWingRed: [180, 60, 60],
      planeWingGreen: [60, 170, 120],
      planeWingAlpha: 0.35,
      planeWingLineWidth: 1.8,
      planeFlashPeriodMs: 900,
      planeFlashDuty: 0.28,
      planeBandYMinFactor: 0.25, // spawn band (top)
      planeBandYMaxFactor: 0.65, // spawn band (bottom)

      // Plane motion/cleanup
      planeTurnRateMin: 0.056, // rad/s
      planeTurnRateMax: 0.120, // rad/s
      planeEdgeHoldMs: 2000     // hold on edge then fade trail
    };
  }

  constructor(options = {}) {
    this.cfg = jQuery.extend(true, {}, ASLOGIN.defaults, options);

    // Canvas elements and 2D contexts
    this.bg = jQuery(this.cfg.bgCanvas).get(0);
    this.tail = jQuery(this.cfg.tailCanvas).get(0);
    this.planeFx = jQuery(this.cfg.planeFxCanvas).get(0);
    this.fx = jQuery(this.cfg.fxCanvas).get(0);
    this.bgctx = this.bg.getContext('2d');
    this.tailCtx = this.tail.getContext('2d');
    this.planeFxCtx = this.planeFx.getContext('2d');
    this.fxctx = this.fx.getContext('2d');

    // Simulation state
    this.W = this.H = 0;
    this.stars = [];
    this.meteors = [];
    this.planes = [];
    this.nextMeteor = performance.now() + this.rand(this.cfg.meteorIntervalMin, this.cfg.meteorIntervalMax);
    this.nextPlane = performance.now() + this.rand(this.cfg.planeIntervalMin, this.cfg.planeIntervalMax);

    // Read theme CSS variables once on boot and when theme toggles
    this.applyTheme();

    // Size canvases, seed stars, and start the render loop
    jQuery(window).on('resize', () => this.resize());
    this.resize();
    this.initStars();
    this.loop();
  }

  // Pull CSS custom properties that drive colors/fades
  applyTheme() {
    const cs = getComputedStyle(document.documentElement);
    this.fadeRGB = (cs.getPropertyValue('--fade-rgb') || '0,0,0').trim();
    this.bgRGB = (cs.getPropertyValue('--canvas-bg-rgb') || '0,0,0').trim();
  }

  // Resize all canvases with device pixel ratio and reset background
  resize() {
    const DPR = window.devicePixelRatio || 1;
    this.W = window.innerWidth;
    this.H = window.innerHeight;

    [this.bg, this.tail, this.planeFx, this.fx].forEach(c => {
      c.width = this.W * DPR;
      c.height = this.H * DPR;
      c.style.width = this.W + 'px';
      c.style.height = this.H + 'px';
      c.getContext('2d').setTransform(DPR, 0, 0, DPR, 0, 0);
    });

    this.bgctx.save();
    this.bgctx.fillStyle = `rgb(${this.bgRGB})`;
    this.bgctx.fillRect(0, 0, this.W, this.H);
    this.bgctx.restore();

    this.tailCtx.clearRect(0, 0, this.W, this.H);
    this.planeFxCtx.clearRect(0, 0, this.W, this.H);
  }

  // Build initial star set distributed in a radial field
  initStars() {
    const W = Math.max(this.W, this.H);
    this.stars = Array.from({ length: this.cfg.starCount }, () => ({
      dist: Math.random() * W,
      angle: Math.random() * Math.PI * 2,
      speed: this.rand(this.cfg.starSpeedMin, this.cfg.starSpeedMax),
      size: this.rand(this.cfg.starSizeMin, this.cfg.starSizeMax),
      color: this.cfg.starColors[(Math.random() * this.cfg.starColors.length) | 0]
    }));
  }

  // Starfield renderer: fade the bg then draw orbiting points around center
  drawStarTrails() {
    this.bgctx.fillStyle = `rgba(${this.fadeRGB}, ${this.cfg.trailFade})`;
    this.bgctx.fillRect(0, 0, this.W, this.H);

    this.bgctx.save();
    this.bgctx.translate(this.W / 2, this.H / 2);
    const t = Date.now() * 0.002;
    for (const s of this.stars) {
      s.angle += s.speed;
      const x = Math.cos(s.angle) * s.dist;
      const y = Math.sin(s.angle) * s.dist;
      const a = 0.7 + 0.3 * Math.sin(t + s.dist);
      const [r, g, b] = s.color;
      this.bgctx.fillStyle = `rgba(${r},${g},${b},${a})`;
      this.bgctx.beginPath();
      this.bgctx.arc(x, y, s.size, 0, 2 * Math.PI);
      this.bgctx.fill();
    }
    this.bgctx.restore();
  }

  // Create a new meteor entering near the top, angled downward
  spawnMeteor() {
    const fromLeft = Math.random() < 0.5;
    const x = fromLeft ? -100 : this.W + 100;
    const y = Math.random() * this.H * this.cfg.meteorYMaxFactor;
    const speed = this.rand(this.cfg.meteorSpeedMin, this.cfg.meteorSpeedMax);
    const dirX = fromLeft ? 1 : -1;
    const dirY = this.rand(this.cfg.meteorDirYMin, this.cfg.meteorDirYMax);
    const vx = dirX * speed;
    const vy = dirY * speed * 0.6;
    const len = this.rand(this.cfg.meteorLenMin, this.cfg.meteorLenMax);
    const color = this.cfg.meteorColors[(Math.random() * this.cfg.meteorColors.length) | 0];

    this.meteors.push({ x, y, vx, vy, len, color, life: 1 });
  }

  // Update/draw all meteors and remove expired ones
  drawMeteors() {
    this.fxctx.clearRect(0, 0, this.W, this.H);
    this.fxctx.lineCap = 'round';

    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.x += m.vx;
      m.y += m.vy;
      m.life = Math.max(0, m.life - 0.015);

      this.fxctx.strokeStyle = m.color;
      this.fxctx.globalAlpha = m.life;
      this.fxctx.lineWidth = this.cfg.meteorLineWidth;
      this.fxctx.beginPath();
      this.fxctx.moveTo(m.x, m.y);
      this.fxctx.lineTo(m.x - m.vx * (m.len / 100), m.y - m.vy * (m.len / 100));
      this.fxctx.stroke();
      this.fxctx.globalAlpha = 1;

      if (m.x < -120 || m.x > this.W + 120 || m.y > this.H + 120 || m.life <= 0) {
        this.meteors.splice(i, 1);
      }
    }
  }

  // Create a plane with initial heading, turn rate, and bookkeeping for trails
  spawnPlane() {
    const fromLeft = Math.random() < 0.5;
    const r = Math.max(this.cfg.planeWingOffset, this.cfg.planeTailOffset);
    const y = this.H * (this.cfg.planeBandYMinFactor + Math.random() * (this.cfg.planeBandYMaxFactor - this.cfg.planeBandYMinFactor));
    const x = fromLeft ? -(r + 5) : (this.W + r + 5);
    const speed = this.rand(this.cfg.planeSpeedMin, this.cfg.planeSpeedMax);
    const dirX = fromLeft ? 1 : -1;
    const dirY = (Math.random() - 0.5) * 0.1;
    const mag = Math.sqrt(dirX * dirX + dirY * dirY);
    const heading = Math.atan2(dirY, dirX);
    const turnRate = (Math.random() < 0.5 ? -1 : 1) * this.rand(this.cfg.planeTurnRateMin, this.cfg.planeTurnRateMax);

    this.planes.push({
      x, y,
      ux: dirX / mag,
      uy: dirY / mag,
      heading,
      speed,
      turnRate,
      lastT: performance.now(),
      startedAt: performance.now(),
      prevTailX: null,
      prevTailY: null,
      prevWingLeftX: null,
      prevWingLeftY: null,
      prevWingRightX: null,
      prevWingRightY: null,
      entered: false,
      stopped: false,
      edgeHitAt: null,
      lastFadeProgress: 0
    });
  }

  // Apply a uniform alpha fade to an entire trail canvas
  _fadeCanvas(ctx, fraction) {
    if (fraction <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = `rgba(0,0,0,${Math.min(1, fraction)})`;
    ctx.fillRect(0, 0, this.W, this.H);
    ctx.restore();
  }

  // Draw the persistent white tail (lines between successive tail points)
  drawPlanesTailPersistent() {
    this.tailCtx.lineCap = 'round';
    this.tailCtx.lineWidth = this.cfg.planeTailLineWidth;

    for (const p of this.planes) {
      const tailX = p.x - p.ux * this.cfg.planeTailOffset;
      const tailY = p.y - p.uy * this.cfg.planeTailOffset;

      if (p.prevTailX == null) {
        p.prevTailX = tailX;
        p.prevTailY = tailY;
        continue;
      }
      if (p.stopped) continue;

      const [r, g, b] = this.cfg.planeTailColor;
      this.tailCtx.strokeStyle = `rgba(${r},${g},${b},${this.cfg.planeTailAlpha})`;
      this.tailCtx.beginPath();
      this.tailCtx.moveTo(p.prevTailX, p.prevTailY);
      this.tailCtx.lineTo(tailX, tailY);
      this.tailCtx.stroke();

      p.prevTailX = tailX;
      p.prevTailY = tailY;
    }
  }

  // Draw flashing wing tip trails (colored bursts when flash window is on)
  drawPlanesWingFlashes(now) {
    this.planeFxCtx.lineCap = 'round';
    this.planeFxCtx.lineWidth = this.cfg.planeWingLineWidth;

    for (const p of this.planes) {
      if (p.stopped) continue;

      const px = -p.uy, py = p.ux;
      const leftX = p.x - px * this.cfg.planeWingOffset;
      const leftY = p.y - py * this.cfg.planeWingOffset;
      const rightX = p.x + px * this.cfg.planeWingOffset;
      const rightY = p.y + py * this.cfg.planeWingOffset;

      const flashOn = ((now - p.startedAt) % this.cfg.planeFlashPeriodMs) / this.cfg.planeFlashPeriodMs < this.cfg.planeFlashDuty;
      if (flashOn) {
        this.planeFxCtx.strokeStyle = `rgba(${this.cfg.planeWingRed.join(',')},${this.cfg.planeWingAlpha})`;
        this.planeFxCtx.beginPath();
        this.planeFxCtx.moveTo(p.prevWingLeftX || leftX, p.prevWingLeftY || leftY);
        this.planeFxCtx.lineTo(leftX, leftY);
        this.planeFxCtx.stroke();

        this.planeFxCtx.strokeStyle = `rgba(${this.cfg.planeWingGreen.join(',')},${this.cfg.planeWingAlpha})`;
        this.planeFxCtx.beginPath();
        this.planeFxCtx.moveTo(p.prevWingRightX || rightX, p.prevWingRightY || rightY);
        this.planeFxCtx.lineTo(rightX, rightY);
        this.planeFxCtx.stroke();
      }

      p.prevWingLeftX = leftX;
      p.prevWingLeftY = leftY;
      p.prevWingRightX = rightX;
      p.prevWingRightY = rightY;
    }
  }

  // Advance plane positions/heading, handle edge hold+fade, and cull
  advancePlanes(now) {
    const r = Math.max(this.cfg.planeWingOffset, this.cfg.planeTailOffset);
    let removedAny = false;

    for (let i = this.planes.length - 1; i >= 0; i--) {
      const p = this.planes[i];

      // If stopped at an edge, gradually fade trail canvases then remove
      if (p.stopped) {
        const hold = this.cfg.planeEdgeHoldMs;
        const target = Math.min(1, (now - p.edgeHitAt) / hold);
        const last = p.lastFadeProgress ?? 0;

        const remainingLast = Math.max(1e-6, 1 - last);
        const remainingNow = Math.max(0, 1 - target);
        let alpha = 1 - (remainingNow / remainingLast);
        alpha = Math.min(1, Math.max(0, alpha));

        this._fadeCanvas(this.tailCtx, alpha);
        this._fadeCanvas(this.planeFxCtx, alpha);

        p.lastFadeProgress = target;

        if (target >= 1) {
          this.tailCtx.clearRect(0, 0, this.W, this.H);
          this.planeFxCtx.clearRect(0, 0, this.W, this.H);
          this.planes.splice(i, 1);
          removedAny = true;
        }
        continue;
      }

      // Integrate heading & position
      const dt = Math.max(0, (now - (p.lastT || now)) / 1000);
      p.lastT = now;

      p.heading += p.turnRate * dt;
      p.ux = Math.cos(p.heading);
      p.uy = Math.sin(p.heading);

      let nx = p.x + p.ux * p.speed;
      let ny = p.y + p.uy * p.speed;

      // Mark when plane fully enters the screen so exit detection is robust
      if (!p.entered && nx >= r && nx <= this.W - r && ny >= r && ny <= this.H - r) {
        p.entered = true;
      }

      // If inside at least once, clamp to edge, stop, and start edge fade timer
      const hit = p.entered && (nx <= r || nx >= this.W - r || ny <= r || ny >= this.H - r);
      if (hit) {
        nx = Math.min(Math.max(nx, r), this.W - r);
        ny = Math.min(Math.max(ny, r), this.H - r);
        p.x = nx;
        p.y = ny;
        p.stopped = true;
        p.edgeHitAt = now;
        p.lastFadeProgress = 0;
        continue;
      }

      p.x = nx;
      p.y = ny;
    }

    return removedAny;
  }

  // Random float in [min,max)
  rand(min, max) { return min + Math.random() * (max - min); }

  // Main render/update loop
  loop(now = performance.now()) {
    this.drawStarTrails();

    if (this.cfg.planeEnabled) {
      if (this.planes.length === 0 && now >= this.nextPlane) {
        this.spawnPlane();
        this.nextPlane = now + this.rand(this.cfg.planeIntervalMin, this.cfg.planeIntervalMax);
      }
      const removed = this.advancePlanes(now);
      if (removed) {
        this.tailCtx.clearRect(0, 0, this.W, this.H);
        this.planeFxCtx.clearRect(0, 0, this.W, this.H);
      }
      this.drawPlanesTailPersistent();
      this.drawPlanesWingFlashes(now);
    }

    if (now >= this.nextMeteor) {
      this.spawnMeteor();
      this.nextMeteor = now + this.rand(this.cfg.meteorIntervalMin, this.cfg.meteorIntervalMax);
    }

    this.drawMeteors();
    requestAnimationFrame(t => this.loop(t));
  }
}

/*
 * AsteroidsEgg
 * Fullscreen overlay mini-game triggered by double-clicking .login-avatar.
 * Esc exits. HUD shows score/lives/level. Vector-style classic gameplay.
 * Responsive scaling for low-resolution screens.
 */
class AsteroidsEgg {
  constructor() {
    // Overlay root
    this.overlay = document.createElement('div');
    Object.assign(this.overlay.style, {
      position: 'fixed',
      inset: '0',
      background: '#000',
      zIndex: '9999',
      display: 'grid',
      placeItems: 'stretch',
      cursor: 'none'
    });

    // Game canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';

    // HUD (score/lives/level)
    this.hud = document.createElement('div');
    this.hud.style.cssText = 'position:absolute;left:0;right:0;top:0;padding:10px;color:#9be0ff;display:flex;gap:16px;justify-content:space-between;pointer-events:none;text-shadow:0 0 8px rgba(155,224,255,.7);font:14px system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,Arial,sans-serif';
    this.hud.innerHTML = `<div>Score: <span id="eggScore">0</span></div><div>Lives: <span id="eggLives">3</span></div><div>Level: <span id="eggLevel">1</span></div>`;

    // Top Esc banner
    this.escTop = document.createElement('div');
    this.escTop.style.cssText =
      'position:absolute;left:0;right:0;top:8px;display:flex;justify-content:center;pointer-events:none;color:#9be0ff;text-shadow:0 0 8px rgba(155,224,255,.7);font:12px system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,Arial,sans-serif';
    this.escTop.innerHTML =
      'Press <kbd style="border:1px solid #3a4a55;padding:1px 4px;border-radius:3px;background:#111">Esc</kbd> to exit';

    // Center status (e.g., Game Over)
    this.center = document.createElement('div');
    this.center.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#9be0ff;text-shadow:0 0 10px rgba(155,224,255,.6);font:14px system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,Arial,sans-serif;pointer-events:none';

    // Compose overlay
    this.overlay.appendChild(this.canvas);
    this.overlay.appendChild(this.hud);
    this.overlay.appendChild(this.escTop);
    this.overlay.appendChild(this.center);

    // Runtime state
    this.ctx = this.canvas.getContext('2d');
    this.keys = Object.create(null);
    this.running = false;
    this.paused = false;
    this.raf = 0;

    // Game state containers
    this.state = { bullets: [], asts: [], parts: [], ship: null, W: 0, H: 0, level: 1 };

    // Base (unscaled) config
    this.BASE = {
      ship: { r: 14, thrust: 0.08, maxSpeed: 6, rotSpeed: 0.004, friction: 0.995, fireDelay: 180, blink: 120, invTime: 1800 },
      bullet: { speed: 9, life: 2000, radius: 2 },
      asteroid: { countsBase: 3, r: { L: 50, M: 30, S: 16 }, speed: 1.4, jag: 0.35, verts: [9, 12] },
      particle: { life: [300, 900] },
      hyperSpace: { cooldown: 1500 },
    };
    // Working copy (scaled per screen size)
    this.CFG = JSON.parse(JSON.stringify(this.BASE));
    this.S = 1; // scale factor

    // Bind event handlers
    this._onKeyDown = (e) => {
      this.keys[e.code] = true;
      if (["ArrowUp", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
      if (e.code === 'Escape') this.stop();
    };
    this._onKeyUp = (e) => { this.keys[e.code] = false; };
    this._onResize = () => this._resize();
  }

  // Enter game: mount overlay, wire keyboard/resize, boot state
  start() {
    if (this.running) return this;
    document.body.appendChild(this.overlay);
    window.addEventListener('keydown', this._onKeyDown, { passive: false });
    window.addEventListener('keyup', this._onKeyUp, { passive: true });
    window.addEventListener('resize', this._onResize, { passive: true });
    this._resize();
    this._bootGame();
    this.running = true;
    this._tick(performance.now());
    return this;
  }

  // Exit game: stop loop, unbind events, remove overlay
  stop() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('resize', this._onResize);
    this.overlay.remove();
    this.running = false;
  }

  // Match canvas to CSS size and apply DPR transform + scaling
  _resize() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const { clientWidth: w, clientHeight: h } = this.canvas;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._applyScale(); // recompute sizes/speeds for this viewport
  }

  // Update the centered status text
  _setMsg(html) {
    this.center.innerHTML = `<div style="text-align:center"><h1 style="margin:0;letter-spacing:.04em">${html}</h1></div>`;
  }

  // Refresh HUD labels (score/lives/level)
  _hud() {
    document.getElementById('eggScore').textContent = this.state.ship?.score ?? 0;
    document.getElementById('eggLives').textContent = Math.max(0, this.state.ship?.lives ?? 0);
    document.getElementById('eggLevel').textContent = this.state.level;
  }

  // Initialize new game state
  _bootGame() {
    this.state.bullets.length = 0;
    this.state.asts.length = 0;
    this.state.parts.length = 0;
    this.state.level = 1;
    this.state.ship = new Ship(this, this.canvas.clientWidth, this.canvas.clientHeight);
    this._spawnWave();
    this._setMsg('');
    this._hud();
  }

  // Spawn a wave of large asteroids at safe distance from ship
  _spawnWave() {
    const count = this._waveCount(); // responsive count
    const W = this.canvas.clientWidth, H = this.canvas.clientHeight;
    for (let i = 0; i < count; i++) {
      let x, y; let tries = 60;
      // safe distance is ~28% of min dimension
      do { x = Math.random() * W; y = Math.random() * H; }
      while (tries-- && this._dist2(x, y, this.state.ship.x, this.state.ship.y) < (Math.min(W, H) * 0.28) ** 2);
      this.state.asts.push(new Asteroid(this, x, y, this.CFG.asteroid.r.L, this.state.level - 1));
    }
    this._hud();
  }

  // Break an asteroid into smaller pieces and award points
  _splitAsteroid(a) {
    const r = a.r;
    if (r > this.CFG.asteroid.r.M + 1) {
      this.state.asts.push(
        new Asteroid(this, a.x, a.y, this.CFG.asteroid.r.M, this.state.level - 1),
        new Asteroid(this, a.x, a.y, this.CFG.asteroid.r.M, this.state.level - 1)
      );
      this.state.ship.score += 20;
    } else if (r > this.CFG.asteroid.r.S + 1) {
      this.state.asts.push(
        new Asteroid(this, a.x, a.y, this.CFG.asteroid.r.S, this.state.level - 1),
        new Asteroid(this, a.x, a.y, this.CFG.asteroid.r.S, this.state.level - 1)
      );
      this.state.ship.score += 50;
    } else {
      this.state.ship.score += 100;
    }

    // Impact particles
    for (let i = 0; i < 18; i++) {
      const ang = Math.random() * Math.PI * 2; const sp = this._rand(2, 0.3);
      this.state.parts.push(new Particle(a.x, a.y, Math.cos(ang) * sp, Math.sin(ang) * sp, this._rand(...this.CFG.particle.life)));
    }

    this._hud();
  }

  // Main game tick: input, update, collisions, draw
  _tick(now) {
    const dt = Math.max(0, Math.min(3, (now - (this._last || now)) / 16.6667)); this._last = now;
    const W = this.canvas.clientWidth, H = this.canvas.clientHeight;

    // Input
    const input = { left: this.keys.ArrowLeft, right: this.keys.ArrowRight, up: this.keys.ArrowUp };
    if (this.keys.Space) this.state.ship.fire(this.state.bullets);
    if (this.keys.ShiftLeft || this.keys.ShiftRight) this.state.ship.hyperspace(W, H, this.state.asts);

    // Integrate entities
    this.state.ship.step(dt, W, H, input);
    for (const b of this.state.bullets) b.step(dt, W, H);
    for (const a of this.state.asts) a.step(dt, W, H);
    for (const p of this.state.parts) p.step(dt, W, H);

    // Cull expired bullets/particles
    this.state.bullets = this.state.bullets.filter(b => b.life > 0);
    this.state.parts = this.state.parts.filter(p => p.t > 0);

    // Bullet→asteroid collisions
    bulletLoop: for (let i = this.state.bullets.length - 1; i >= 0; i--) {
      const b = this.state.bullets[i];
      for (let j = this.state.asts.length - 1; j >= 0; j--) {
        const a = this.state.asts[j]; const r = a.r + this.CFG.bullet.radius;
        if (this._dist2(b.x, b.y, a.x, a.y) <= r * r) {
          this.state.bullets.splice(i, 1);
          const dead = this.state.asts.splice(j, 1)[0];
          this._splitAsteroid(dead);
          break bulletLoop;
        }
      }
    }

    // Ship→asteroid collisions (unless invulnerable)
    if (this.state.ship.inv <= 0) {
      for (let j = this.state.asts.length - 1; j >= 0; j--) {
        const a = this.state.asts[j]; const r = a.r + this.state.ship.r * 0.7;
        if (this._dist2(this.state.ship.x, this.state.ship.y, a.x, a.y) <= r * r) {
          for (let i = 0; i < 40; i++) {
            const ang = Math.random() * Math.PI * 2; const sp = this._rand(3, 0.6);
            this.state.parts.push(new Particle(this.state.ship.x, this.state.ship.y, Math.cos(ang) * sp, Math.sin(ang) * sp, this._rand(600, 1200)));
          }
          this.state.ship.kill(W, H);
          this._hud();
          if (this.state.ship.dead) { this._gameOver(); }
          break;
        }
      }
    }

    // New wave if all asteroids cleared
    if (this.state.asts.length === 0) { this.state.level++; this._spawnWave(); }

    // Render pass
    this.ctx.clearRect(0, 0, W, H);
    for (const p of this.state.parts) p.draw(this.ctx);
    for (const a of this.state.asts) a.draw(this.ctx);
    for (const b of this.state.bullets) b.draw(this.ctx);
    this.state.ship.draw(this.ctx);

    this.raf = requestAnimationFrame(t => this._tick(t));
  }

  // Game over screen and restart hook (press R)
  _gameOver() {
    this._setMsg('<span style="font-size:48px;">GAME OVER</span><br/><span style="font-size:12px;opacity:.75">Press R to restart</span>');
    const handler = (e) => {
      if (e.code === 'KeyR') {
        this._bootGame();
        window.removeEventListener('keydown', handler);
      }
    };
    window.addEventListener('keydown', handler);
  }

  // Responsive helpers
  _applyScale() {
    // Scale relative to a 900px reference viewport (clamped)
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    const s = Math.max(0.5, Math.min(1.25, Math.min(w, h) / 900));
    this.S = s;

    const b = this.BASE, c = this.CFG;
    // Sizes & speeds scale with screen size; rotation stays the same
    c.ship = {
      ...b.ship,
      r: Math.round(b.ship.r * s),
      thrust: b.ship.thrust * s,
      maxSpeed: b.ship.maxSpeed * s,
      rotSpeed: b.ship.rotSpeed,
      friction: b.ship.friction,
      fireDelay: b.ship.fireDelay,
      blink: b.ship.blink,
      invTime: b.ship.invTime
    };
    c.bullet = { ...b.bullet, speed: b.bullet.speed * s, life: Math.round(b.bullet.life * s) };
    c.asteroid = {
      ...b.asteroid,
      r: { L: Math.round(b.asteroid.r.L * s), M: Math.round(b.asteroid.r.M * s), S: Math.round(b.asteroid.r.S * s) },
      speed: b.asteroid.speed * s
    };
  }
  _waveCount() {
    // Fewer rocks on tiny screens, scale up modestly with level
    const base = Math.max(2, Math.round(this.BASE.asteroid.countsBase * (0.6 + 0.6 * this.S)));
    return base + Math.max(0, Math.round((this.state.level - 1) * (0.6 * this.S)));
  }

  // Helpers
  _rand(a = 1, b = 0) { return Math.random() * (a - b) + b; }
  _dist2(x1, y1, x2, y2) { const dx = x2 - x1, dy = y2 - y1; return dx * dx + dy * dy; }
}

/*
 * Game entity: Bullet
 * Small dots fired from the ship with limited lifetime and screen wrap.
 */
class Bullet {
  constructor(game, x, y, ang) { this.game = game; this.x = x; this.y = y; this.ang = ang; this.vx = Math.cos(ang) * game.CFG.bullet.speed; this.vy = Math.sin(ang) * game.CFG.bullet.speed; this.life = game.CFG.bullet.life; }
  step(dt, W, H) { this.x += this.vx * dt; this.y += this.vy * dt; this.life -= dt * 16; this.x = (this.x < 0 ? this.x + W : (this.x > W ? this.x - W : this.x)); this.y = (this.y < 0 ? this.y + H : (this.y > H ? this.y - H : this.y)); }
  draw(g) { g.beginPath(); g.arc(this.x, this.y, this.game.CFG.bullet.radius, 0, Math.PI * 2); g.fillStyle = '#9be0ff'; g.fill(); }
}

/*
 * Particle used for explosion effects with simple alpha decay and wrap.
 */
class Particle {
  constructor(x, y, vx, vy, life) { this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.t = life; this.T = life; }
  step(dt, W, H) { this.x += this.vx * dt; this.y += this.vy * dt; this.t -= dt * 16; this.x = (this.x < 0 ? this.x + W : (this.x > W ? this.x - W : this.x)); this.y = (this.y < 0 ? this.y + H : (this.y > H ? this.y - H : this.y)); }
  draw(g) { const a = Math.max(0, Math.min(1, this.t / this.T)); g.globalAlpha = a; g.fillStyle = '#9be0ff'; g.fillRect(this.x, this.y, 2, 2); g.globalAlpha = 1; }
}

/*
 * Asteroid polygon with random jagged shape, rotation, and screen wrap.
 */
class Asteroid {
  constructor(game, x, y, r, level = 0) {
    this.game = game; this.x = x; this.y = y; this.r = r; const spd = game.CFG.asteroid.speed * (0.9 + level * 0.1); const ang = Math.random() * Math.PI * 2;
    this.vx = Math.cos(ang) * spd * (0.6 + Math.random()); this.vy = Math.sin(ang) * spd * (0.6 + Math.random());
    this.rot = (Math.random() * 0.02 - 0.01); this.a = Math.random() * Math.PI * 2; this.verts = this._poly();
  }
  _poly() {
    const min = this.game.CFG.asteroid.verts[0], max = this.game.CFG.asteroid.verts[1];
    const verts = Math.floor(Math.random() * (max - min) + min); const out = [];
    for (let i = 0; i < verts; i++) { const a = i / verts * Math.PI * 2; const r = this.r * (1 + (Math.random() * 2 - 1) * this.game.CFG.asteroid.jag); out.push([Math.cos(a) * r, Math.sin(a) * r]); }
    return out;
  }
  step(dt, W, H) { this.x += this.vx * dt; this.y += this.vy * dt; this.a += this.rot * dt; this.x = (this.x < 0 ? this.x + W : (this.x > W ? this.x - W : this.x)); this.y = (this.y < 0 ? this.y + H : (this.y > H ? this.y - H : this.y)); }
  draw(g) { g.save(); g.translate(this.x, this.y); g.rotate(this.a); g.strokeStyle = '#9be0ff'; g.lineWidth = 2; g.beginPath(); const v = this.verts; g.moveTo(v[0][0], v[0][1]); for (let i = 1; i < v.length; i++) g.lineTo(v[i][0], v[i][1]); g.closePath(); g.stroke(); g.restore(); }
}

/*
 * Player ship with thrust/rotation, firing, hyperspace, invulnerability/blink.
 */
class Ship {
  constructor(game, W, H) { this.g = game; this.reset(W, H); }
  reset(W, H) { this.x = W / 2; this.y = H / 2; this.r = this.g.CFG.ship.r; this.a = -Math.PI / 2; this.vx = 0; this.vy = 0; this.thrusting = false; this.cool = 0; this.lives = 3; this.inv = this.g.CFG.ship.invTime; this.blink = this.g.CFG.ship.blink; this.dead = false; this.hyperCD = 0; this.score = 0; }
  hyperspace(W, H, asts) { if (this.hyperCD > 0) return; let tries = 40; while (tries--) { const nx = Math.random() * W, ny = Math.random() * H; let ok = true; for (const a of asts) { const r = a.r + 50; const dx = nx - a.x, dy = ny - a.y; if (dx * dx + dy * dy < r * r) { ok = false; break; } } if (ok) { this.x = nx; this.y = ny; this.vx = this.vy = 0; this.inv = 600; this.blink = 100; this.hyperCD = this.g.CFG.hyperSpace.cooldown; return; } } }
  kill(W, H) { this.lives--; this.inv = this.g.CFG.ship.invTime; this.blink = this.g.CFG.ship.blink; this.x = W / 2; this.y = H / 2; this.vx = this.vy = 0; if (this.lives < 0) this.dead = true; }
  fire(bullets) { if (this.cool > 0) return; bullets.push(new Bullet(this.g, this.x + Math.cos(this.a) * this.r, this.y + Math.sin(this.a) * this.r, this.a)); this.cool = this.g.CFG.ship.fireDelay; }
  step(dt, W, H, input) {
    this.cool = Math.max(0, this.cool - dt * 16); this.hyperCD = Math.max(0, this.hyperCD - dt * 16); this.inv = Math.max(0, this.inv - dt * 16); this.blink = Math.max(0, this.blink - dt * 16);
    if (input.left) this.a -= this.g.CFG.ship.rotSpeed * dt * 16;
    if (input.right) this.a += this.g.CFG.ship.rotSpeed * dt * 16;
    if (input.up) { this.vx += Math.cos(this.a) * this.g.CFG.ship.thrust; this.vy += Math.sin(this.a) * this.g.CFG.ship.thrust; this.thrusting = true; } else this.thrusting = false;
    const sp = Math.hypot(this.vx, this.vy); if (sp > this.g.CFG.ship.maxSpeed) { const s = this.g.CFG.ship.maxSpeed / sp; this.vx *= s; this.vy *= s; }
    this.vx *= this.g.CFG.ship.friction; this.vy *= this.g.CFG.ship.friction; this.x += this.vx * dt; this.y += this.vy * dt;
    this.x = (this.x < 0 ? this.x + W : (this.x > W ? this.x - W : this.x)); this.y = (this.y < 0 ? this.y + H : (this.y > H ? this.y - H : this.y));
  }
  draw(g) {
    const blinkOn = (this.inv === 0) || Math.floor(this.blink / 60) % 2 === 0; if (!blinkOn) return; const r = this.r; g.save(); g.translate(this.x, this.y); g.rotate(this.a);
    g.beginPath(); g.moveTo(r, 0); g.lineTo(-r * 0.8, -r * 0.6); g.lineTo(-r * 0.4, 0); g.lineTo(-r * 0.8, r * 0.6); g.closePath(); g.strokeStyle = '#9be0ff'; g.lineWidth = 2; g.stroke();
    if (this.thrusting) { g.beginPath(); g.moveTo(-r * 0.7, 0); g.lineTo(-r - (Math.random() * 6 + 2), (Math.random() * 12 - 6)); g.lineTo(-r * 0.7, 0); g.stroke(); }
    g.restore();
  }
}

/*
 * Boot sequence: apply stored theme, start ASLOGIN background, add theme toggle,
 * and wire the easter egg (dblclick .login-avatar).
 */
jQuery(function () {
  // Apply stored theme or default to dark
  const savedTheme = (localStorage.getItem('theme') || '').toLowerCase();
  const root = document.documentElement;

  if (savedTheme === 'light' || savedTheme === 'dark') {
    root.classList.toggle('theme-light', savedTheme === 'light');
    root.classList.toggle('theme-dark', savedTheme === 'dark');
  } else {
    if (!root.classList.contains('theme-light') && !root.classList.contains('theme-dark')) {
      root.classList.add('theme-dark');
    }
  }

  // Start background effects
  window.asLogin = new ASLOGIN();

  // Optional theme toggle button if page provides none
  if (document.querySelector('.theme-toggle') == null) {
    const isLight = root.classList.contains('theme-light');
    const btn = jQuery('<button>', {
      class: 'theme-toggle',
      type: 'button',
      html: isLight ? '<i class="fa-solid fa-sun"></i> Light' : '<i class="fa-solid fa-moon"></i> Dark'
    });

    btn.on('click', function () {
      const currentlyLight = root.classList.contains('theme-light');
      const newLight = !currentlyLight;

      root.classList.toggle('theme-light', newLight);
      root.classList.toggle('theme-dark', !newLight);
      localStorage.setItem('theme', newLight ? 'light' : 'dark');

      if (window.asLogin) {
        window.asLogin.applyTheme();
        window.asLogin.resize();
      }

      jQuery(this).html(newLight ? '<i class="fa-solid fa-sun"></i> Light' : '<i class="fa-solid fa-moon"></i> Dark');
    });

    jQuery('body').append(btn);
  }

  // Easter egg: double-click avatar to launch game
  let egg = null;
  jQuery(document).on('dblclick', '.login-avatar', () => {
    if (egg && egg.running) return;
    egg = new AsteroidsEgg().start();
  });
});