// ═══════════════════════════════════════════════════
//  js/world.js  —  Tiny Guardian
//  Platform layout, background rendering per stage
// ═══════════════════════════════════════════════════

class Platform {
  constructor(x, y, w, moving, moveRange, moveSpeed) {
    this.x = x; this.y = y; this.w = w; this.h = 14;
    this.moving = !!moving;
    this.baseX = x;
    this.moveRange = moveRange || 0;
    this.moveSpeed = moveSpeed || 0;
    this.moveDir = 1;
  }
  update(dt) {
    if (!this.moving) return;
    this.x += this.moveSpeed * this.moveDir * dt;
    if (this.x > this.baseX + this.moveRange) this.moveDir = -1;
    if (this.x < this.baseX) this.moveDir = 1;
  }
  draw(ctx, col) {
    const r = 7;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(this.x + r, this.y);
    ctx.lineTo(this.x + this.w - r, this.y);
    ctx.quadraticCurveTo(this.x + this.w, this.y, this.x + this.w, this.y + r);
    ctx.lineTo(this.x + this.w, this.y + this.h);
    ctx.lineTo(this.x, this.y + this.h);
    ctx.lineTo(this.x, this.y + r);
    ctx.quadraticCurveTo(this.x, this.y, this.x + r, this.y);
    ctx.closePath();
    ctx.fill();
    // highlight top
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(this.x + 4, this.y + 1, this.w - 8, 3);
  }
}

class World {
  constructor() {
    this.platforms = [];
    this.stage = 1;
    this.cloudOffsets = [];
    for (let i = 0; i < 5; i++) {
      this.cloudOffsets.push({ x: Math.random() * WIDTH, y: PLAY_TOP + 10 + Math.random() * 80, s: 0.5 + Math.random() * 0.6, spd: 8 + Math.random() * 12 });
    }
  }

  loadStage(stageNum) {
    this.stage = stageNum;
    this.platforms = [];
    const presets = PLAT_PRESETS[stageNum] || PLAT_PRESETS[1];
    for (const p of presets) {
      this.platforms.push(new Platform(p.x, p.y, p.w, p.moving, p.moveRange, p.moveSpeed));
    }
  }

  update(dt) {
    for (const p of this.platforms) p.update(dt);
    // clouds drift
    for (const c of this.cloudOffsets) {
      c.x += c.spd * dt;
      if (c.x > WIDTH + 60) c.x = -60;
    }
  }

  drawBackground(ctx, images) {
    const sc = STAGE_COL[this.stage];
    const playH = GROUND_Y - PLAY_TOP;

    // Try background image: per-stage first, then shared
    const bgKey = 'bg_stage' + this.stage;
    const bgImg = images && (images[bgKey] || images.background);
    if (bgImg) {
      // Draw image dimmed so characters stand out
      ctx.globalAlpha = 0.55;
      ctx.drawImage(bgImg, 0, PLAY_TOP, WIDTH, playH);
      ctx.globalAlpha = 1;
      // Tinted overlay matching stage color
      ctx.fillStyle = sc.bg;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(0, PLAY_TOP, WIDTH, playH);
      ctx.globalAlpha = 1;
    } else {
      // Fallback: gradient sky
      const grad = ctx.createLinearGradient(0, PLAY_TOP, 0, GROUND_Y);
      grad.addColorStop(0, sc.bg);
      grad.addColorStop(1, sc.bg2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, PLAY_TOP, WIDTH, playH);

      // clouds
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      for (const c of this.cloudOffsets) {
        this._drawCloud(ctx, c.x, c.y, 28 * c.s);
      }

      // stage-specific decorations
      this._drawStageDecor(ctx);
    }

    // ground
    ctx.fillStyle = sc.ground;
    ctx.fillRect(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);  // fill all the way down
    // ground highlight
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(0, GROUND_Y, WIDTH, 4);
    // ground grass dots
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    for (let gx = 10; gx < WIDTH; gx += 30) {
      ctx.beginPath();
      ctx.arc(gx, GROUND_Y + 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawCloud(ctx, cx, cy, r) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.arc(cx - r * 0.7, cy + r * 0.2, r * 0.7, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.7, cy + r * 0.2, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawStageDecor(ctx) {
    const s = this.stage;
    ctx.save();
    if (s === 1) {
      // school — small windows
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(40 + i * 90, GROUND_Y - 60, 30, 40);
      }
    } else if (s === 2) {
      // carnival — colorful flags
      ctx.strokeStyle = '#FFB74D';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(20, PLAY_TOP + 40);
      ctx.lineTo(WIDTH - 20, PLAY_TOP + 40);
      ctx.stroke();
      const flagCols = ['#EF5350', '#FFD54F', '#66BB6A', '#42A5F5', '#AB47BC'];
      for (let i = 0; i < 12; i++) {
        const fx = 30 + i * 30;
        ctx.fillStyle = flagCols[i % flagCols.length];
        ctx.beginPath();
        ctx.moveTo(fx, PLAY_TOP + 40);
        ctx.lineTo(fx + 12, PLAY_TOP + 40);
        ctx.lineTo(fx + 6, PLAY_TOP + 58);
        ctx.closePath();
        ctx.fill();
      }
    } else if (s === 3) {
      // candy — lollipops
      const lollies = [[60, GROUND_Y - 10], [180, GROUND_Y - 10], [310, GROUND_Y - 10]];
      for (const [lx, ly] of lollies) {
        ctx.fillStyle = 'rgba(206,147,216,0.3)';
        ctx.fillRect(lx - 2, ly - 50, 4, 50);
        ctx.beginPath();
        ctx.arc(lx, ly - 55, 16, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(248,187,208,0.4)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(lx, ly - 55, 16, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(165,214,167,0.3)';
        ctx.fill();
      }
    } else if (s === 4) {
      // castle — moon + stars
      ctx.fillStyle = 'rgba(255,215,0,0.25)';
      ctx.beginPath();
      ctx.arc(WIDTH - 60, PLAY_TOP + 45, 22, 0, Math.PI * 2);
      ctx.fill();
      // stars
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      const stars = [[40,PLAY_TOP+20],[120,PLAY_TOP+35],[200,PLAY_TOP+15],[280,PLAY_TOP+30],[340,PLAY_TOP+25]];
      for (const [sx, sy] of stars) {
        ctx.beginPath();
        ctx.arc(sx, sy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  drawPlatforms(ctx) {
    const sc = STAGE_COL[this.stage];
    for (const p of this.platforms) {
      p.draw(ctx, sc.platform);
    }
  }

  // Get all platforms including ground as a "platform"
  getAllSurfaces() {
    return [...this.platforms, { x: 0, y: GROUND_Y, w: WIDTH, h: GROUND_H, moving: false }];
  }
}
