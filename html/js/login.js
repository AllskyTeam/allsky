"use strict";

/**
 * ASLOGIN
 * Starfield + meteors + plane light trails rendered across 4 stacked canvases.
 * Theme colors are read from CSS variables so UI theme switches re-skin effects.
 */
class ASLOGIN {
  static get defaults() {
    return {
      bgCanvas: '#bgCanvas',
      tailCanvas: '#tailCanvas',
      planeFxCanvas: '#planeCanvas',
      fxCanvas: '#fxCanvas',

      // Starfield
      starCount: 800,
      starSpeedMin: 0.00025,
      starSpeedMax: 0.00045,
      starSizeMin: 0.4,
      starSizeMax: 2.0,
      trailFade: 0.03,
      starColors: [
        [255, 255, 255],
        [240, 215, 180],
        [200, 220, 255],
        [240, 180, 180],
        [170, 240, 240],
        [240, 240, 200]
      ],

      // Meteors
      meteorIntervalMin: 2000,
      meteorIntervalMax: 5000,
      meteorSpeedMin: 28,
      meteorSpeedMax: 58,
      meteorLenMin: 80,
      meteorLenMax: 160,
      meteorColors: ['#fff', '#a9bfff', '#ffe3a9', '#f6b3b3'],
      meteorYMaxFactor: 0.4,
      meteorDirYMin: 0.25,
      meteorDirYMax: 0.60,
      meteorLineWidth: 2,

      // Planes
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
      planeBandYMinFactor: 0.25,
      planeBandYMaxFactor: 0.65,

      // Plane heading change and edge fade timing
      planeTurnRateMin: 0.056,
      planeTurnRateMax: 0.120,
      planeEdgeHoldMs: 2000
    };
  }

  constructor(options = {}) {
    this.cfg = jQuery.extend(true, {}, ASLOGIN.defaults, options);

    // Canvas handles and 2D contexts
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

    // Pull initial theme values
    this.applyTheme();

    // Size, seed, and start
    jQuery(window).on('resize', () => this.resize());
    this.resize();
    this.initStars();
    this.loop();
  }

  /**
   * Read current CSS custom properties for effect tinting.
   */
  applyTheme() {
    const cs = getComputedStyle(document.documentElement);
    this.fadeRGB = (cs.getPropertyValue('--fade-rgb') || '0,0,0').trim();
    this.bgRGB = (cs.getPropertyValue('--canvas-bg-rgb') || '0,0,0').trim();
  }

  /**
   * Resize canvases for DPR and repaint static background.
   */
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

  /**
   * Create star particles distributed in polar space.
   */
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

  /**
   * Fade the sky slightly and draw star dots along orbital paths.
   */
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

  /**
   * Create a new meteor with randomized entry and trajectory.
   */
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

  /**
   * Advance and render meteor streaks; drop when offscreen or faded.
   */
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

  /**
   * Create a plane with constant-speed motion and gentle turn rate.
   */
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

  /**
   * Multiplicative fade chunk for trail layers.
   */
  _fadeCanvas(ctx, fraction) {
    if (fraction <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = `rgba(0,0,0,${Math.min(1, fraction)})`;
    ctx.fillRect(0, 0, this.W, this.H);
    ctx.restore();
  }

  /**
   * Draw continuous white tail line; persists on its own canvas.
   */
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

  /**
   * Flash red/green wing lights on a timer; trails on planeFx layer.
   */
  drawPlanesWingFlashes(now) {
    this.planeFxCtx.lineCap = 'round';
    this.planeFxCtx.lineWidth = this.cfg.planeWingLineWidth;

    for (const p of this.planes) {
      if (p.stopped) continue;

      const px = -p.uy, py = p.ux;
      const leftX  = p.x - px * this.cfg.planeWingOffset;
      const leftY  = p.y - py * this.cfg.planeWingOffset;
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

  /**
   * Move planes, clamp at edges, then fade out trails while parked.
   */
  advancePlanes(now) {
    const r = Math.max(this.cfg.planeWingOffset, this.cfg.planeTailOffset);
    let removedAny = false;

    for (let i = this.planes.length - 1; i >= 0; i--) {
      const p = this.planes[i];

      if (p.stopped) {
        const hold = this.cfg.planeEdgeHoldMs;
        const target = Math.min(1, (now - p.edgeHitAt) / hold);
        const last = p.lastFadeProgress ?? 0;

        const remainingLast = Math.max(1e-6, 1 - last);
        const remainingNow  = Math.max(0, 1 - target);
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

      const dt = Math.max(0, (now - (p.lastT || now)) / 1000);
      p.lastT = now;

      p.heading += p.turnRate * dt;
      p.ux = Math.cos(p.heading);
      p.uy = Math.sin(p.heading);

      let nx = p.x + p.ux * p.speed;
      let ny = p.y + p.uy * p.speed;

      if (!p.entered && nx >= r && nx <= this.W - r && ny >= r && ny <= this.H - r) {
        p.entered = true;
      }

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

  /**
   * Inclusive random float between min and max.
   */
  rand(min, max) {
    return min + Math.random() * (max - min);
  }

  /**
   * Main frame: stars → planes → meteors. Schedules next frame.
   */
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

/**
 * Boot: apply saved theme, start ASLOGIN, and inject a simple theme toggle.
 */
jQuery(function () {
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

  window.asLogin = new ASLOGIN();

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
});