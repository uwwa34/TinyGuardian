// ═══════════════════════════════════════════════════
//  js/enemy.js  —  Tiny Guardian
//  Enemy AI (Bubble Bobble style), wave management
// ═══════════════════════════════════════════════════

class EnemyUnit {
  constructor(type, x, y, world) {
    const def = ENEMY[type];
    this.type = type;
    this.def = def;
    this.x = x;
    this.y = y;
    this.w = def.w;
    this.h = def.h;
    this.hp = 1;
    this.speed = def.speed;
    this.points = def.points;
    this.facing = Math.random() < 0.5 ? 1 : -1;
    this.vy = 0;
    this.grounded = false;
    this.alive = true;
    this.dying = false;
    this.dieTimer = 0;

    // AI
    this.aiType = def.type; // 'ground' | 'fly' | 'bounce'
    this.shootsProj = def.shoots || false;
    this.shootTimer = 3000 + Math.random() * 2000;

    // Angry mode
    this.aliveTime = 0;
    this.angry = false;

    // Fly AI
    this.baseY = y;
    this.flyAngle = Math.random() * Math.PI * 2;
    this.flyAmpY = 30 + Math.random() * 40;
    this.flyAmpX = 20 + Math.random() * 30;

    // Bounce AI
    this.bounceTimer = 0;

    this.world = world;
  }

  update(dt, world, game) {
    if (this.dying) {
      this.dieTimer -= dt;
      if (this.dieTimer <= 0) this.alive = false;
      return;
    }

    this.aliveTime += dt * 1000;
    if (!this.angry && this.aliveTime > ANGRY_TIME_MS) {
      this.angry = true;
      this.speed = this.def.speed * ANGRY_SPEED_MULT;
    }

    if (this.aiType === 'ground') {
      this._aiGround(dt, world);
    } else if (this.aiType === 'fly') {
      this._aiFly(dt);
    } else if (this.aiType === 'bounce') {
      this._aiBounce(dt, world);
    }

    // Shoot projectile
    if (this.shootsProj && game) {
      this.shootTimer -= dt * 1000;
      if (this.shootTimer <= 0) {
        this.shootTimer = 3000 + Math.random() * 2000;
        const px = this.x + this.w / 2;
        const py = this.y + this.h / 2;
        game.projManager.addEnemyBullet(px, py, this.facing * 120, 0, 'normal');
      }
    }
  }

  _aiGround(dt, world) {
    // Gravity
    if (!this.grounded) {
      this.vy += GRAVITY * dt;
    }

    // Move horizontally
    this.x += this.speed * this.facing * dt;
    this.y += this.vy * dt;

    // Platform collision
    this.grounded = false;
    if (this.vy >= 0) {
      const surfaces = world.getAllSurfaces();
      for (const p of surfaces) {
        const feetY = this.y + this.h;
        if (feetY >= p.y && feetY <= p.y + 16 &&
            this.x + this.w - 2 > p.x && this.x + 2 < p.x + p.w) {
          this.y = p.y - this.h;
          this.vy = 0;
          this.grounded = true;

          // Check if about to walk off edge of THIS platform
          const leftEdge = this.x < p.x + 2;
          const rightEdge = this.x + this.w > p.x + p.w - 2;
          if ((leftEdge && this.facing === -1) || (rightEdge && this.facing === 1)) {
            if (Math.random() < 0.6) {
              this.facing *= -1; // Turn around
            }
            // else keep walking and fall off naturally
          }
          break;
        }
      }
    }

    // Random jump up (30% per second normally, 50% angry)
    if (this.grounded && Math.random() < (this.angry ? 0.50 : 0.30) * dt) {
      this.vy = -520 - (this.angry ? 120 : 0);
      this.grounded = false;
    }

    // Ground wrap: fell below screen → teleport to top platform
    if (this.y > PLAY_BOTTOM + 20) {
      const plats = world.platforms;
      if (plats.length > 0) {
        const highest = plats.reduce((a, b) => a.y < b.y ? a : b);
        this.x = highest.x + Math.random() * Math.max(0, highest.w - this.w);
        this.y = highest.y - this.h - 10;
        this.vy = 0;
      }
    }

    // Wall bounce
    if (this.x < 0) { this.x = 0; this.facing = 1; }
    if (this.x + this.w > WIDTH) { this.x = WIDTH - this.w; this.facing = -1; }
  }

  _aiFly(dt) {
    this.flyAngle += dt * (this.angry ? 2.5 : 1.5);
    this.x += this.speed * this.facing * dt;
    this.y = this.baseY + Math.sin(this.flyAngle) * this.flyAmpY;

    // Wall bounce
    if (this.x < 0) { this.x = 0; this.facing = 1; }
    if (this.x + this.w > WIDTH) { this.x = WIDTH - this.w; this.facing = -1; }

    // Clamp Y
    if (this.y < PLAY_TOP) this.y = PLAY_TOP;
    if (this.y + this.h > GROUND_Y) this.y = GROUND_Y - this.h;
  }

  _aiBounce(dt, world) {
    // Always bouncing
    this.vy += GRAVITY * dt;
    this.x += this.speed * this.facing * dt;
    this.y += this.vy * dt;

    // Platform collision → bounce up
    const surfaces = world.getAllSurfaces();
    for (const p of surfaces) {
      if (this.vy >= 0) {
        const feetY = this.y + this.h;
        if (feetY >= p.y && feetY <= p.y + 16 &&
            this.x + this.w > p.x + 2 && this.x < p.x + p.w - 2) {
          this.y = p.y - this.h;
          this.vy = -450 - (this.angry ? 80 : 0);
          break;
        }
      }
    }

    // Ground wrap
    if (this.y > PLAY_BOTTOM + 20) {
      const plats = world.platforms;
      if (plats.length > 0) {
        const highest = plats.reduce((a, b) => a.y < b.y ? a : b);
        this.x = highest.x + Math.random() * Math.max(0, highest.w - this.w);
        this.y = highest.y - this.h - 10;
        this.vy = 0;
      }
    }

    // Wall bounce
    if (this.x < 0) { this.x = 0; this.facing = 1; }
    if (this.x + this.w > WIDTH) { this.x = WIDTH - this.w; this.facing = -1; }
  }

  takeDamage(dmg) {
    this.hp -= dmg;
    if (this.hp <= 0) {
      this.dying = true;
      this.dieTimer = 0.3;
    }
  }

  draw(ctx, images) {
    if (!this.alive) return;
    ctx.save();

    if (this.dying) {
      ctx.globalAlpha = this.dieTimer / 0.3;
      const scale = 1 + (1 - this.dieTimer / 0.3) * 0.5;
      ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
      ctx.scale(scale, scale);
      ctx.translate(-this.w / 2, -this.h / 2);
    } else {
      ctx.translate(this.x, this.y);
    }

    // Draw body
    const col = this.angry ? '#EF5350' : this.def.color;
    ctx.fillStyle = col;
    const r = 8;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(this.w - r, 0);
    ctx.quadraticCurveTo(this.w, 0, this.w, r);
    ctx.lineTo(this.w, this.h - r);
    ctx.quadraticCurveTo(this.w, this.h, this.w - r, this.h);
    ctx.lineTo(r, this.h);
    ctx.quadraticCurveTo(0, this.h, 0, this.h - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(this.w * 0.35, this.h * 0.35, 6, 0, Math.PI * 2);
    ctx.arc(this.w * 0.65, this.h * 0.35, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COL.COCOA;
    ctx.beginPath();
    ctx.arc(this.w * 0.35 + this.facing * 2, this.h * 0.35, 3, 0, Math.PI * 2);
    ctx.arc(this.w * 0.65 + this.facing * 2, this.h * 0.35, 3, 0, Math.PI * 2);
    ctx.fill();

    // Angry eyebrows
    if (this.angry) {
      ctx.strokeStyle = COL.COCOA;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.w * 0.2, this.h * 0.2);
      ctx.lineTo(this.w * 0.4, this.h * 0.28);
      ctx.moveTo(this.w * 0.8, this.h * 0.2);
      ctx.lineTo(this.w * 0.6, this.h * 0.28);
      ctx.stroke();
    }

    // Mouth
    ctx.strokeStyle = COL.COCOA;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (this.angry) {
      ctx.moveTo(this.w * 0.3, this.h * 0.65);
      ctx.lineTo(this.w * 0.4, this.h * 0.6);
      ctx.lineTo(this.w * 0.6, this.h * 0.6);
      ctx.lineTo(this.w * 0.7, this.h * 0.65);
    } else {
      ctx.arc(this.w / 2, this.h * 0.55, 5, 0, Math.PI);
    }
    ctx.stroke();

    // Emoji on body
    ctx.font = (this.w * 0.4) + 'px ' + FONT.BODY;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.def.emoji, this.w / 2, this.h * 0.78);

    ctx.restore();
  }

  getHitbox() {
    return { x: this.x + 3, y: this.y + 3, w: this.w - 6, h: this.h - 6 };
  }
}

// ── Enemy Manager ────────────────────────────────────
class EnemyManager {
  constructor() {
    this.enemies = [];
  }

  reset() {
    this.enemies = [];
  }

  spawnWave(waveData, world) {
    for (const entry of waveData) {
      const def = ENEMY[entry.t];
      if (!def) continue;
      for (let i = 0; i < entry.n; i++) {
        const plats = world.platforms;
        if (plats.length === 0) continue;
        const plat = plats[Math.floor(Math.random() * plats.length)];
        const ex = plat.x + Math.random() * Math.max(0, plat.w - def.w);
        const ey = plat.y - def.h;
        this.enemies.push(new EnemyUnit(entry.t, ex, ey, world));
      }
    }
  }

  spawnSingle(type, x, y, world) {
    this.enemies.push(new EnemyUnit(type, x, y, world));
  }

  update(dt, world, game) {
    for (const e of this.enemies) e.update(dt, world, game);
    this.enemies = this.enemies.filter(e => e.alive);
  }

  draw(ctx, images) {
    for (const e of this.enemies) e.draw(ctx, images);
  }

  get aliveCount() {
    return this.enemies.filter(e => !e.dying).length;
  }
}
