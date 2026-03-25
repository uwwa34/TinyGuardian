// ═══════════════════════════════════════════════════
//  js/boss.js  —  Tiny Guardian
//  Mini Boss (stage 3) + Final Boss (stage 4, Diet Go Go)
// ═══════════════════════════════════════════════════

class BossUnit {
  constructor(config, x, y, isFinal) {
    this.cfg = config;
    this.x = x;
    this.y = y;
    this.w = config.w;
    this.h = config.h;
    this.hp = config.hp;
    this.maxHp = config.hp;
    this.speed = config.speed;
    this.points = config.points;
    this.facing = -1;
    this.vy = 0;
    this.grounded = false;
    this.alive = true;
    this.dying = false;
    this.dieTimer = 0;
    this.isFinal = isFinal;

    // State machine
    this.state = 'idle';       // idle, move, attack, jump
    this.stateTimer = 1500;    // ms before first action
    this.attackTimer = 0;
    this.spawnTimer = this.isFinal ? BOSS.p1SpawnInterval : 99999;

    // Phase (final boss only)
    this.phase = 1;

    // Shake effect
    this.shakeTimer = 0;

    // Flash on hit
    this.flashTimer = 0;
  }

  get isAngry() {
    if (this.isFinal) return this.phase >= 3;
    return this.hp <= this.cfg.angryHp;
  }

  get currentSpeed() {
    if (this.isFinal) {
      if (this.phase === 3) return BOSS.p3Speed;
      if (this.phase === 2) return BOSS.p2Speed;
      return this.cfg.speed;
    }
    return this.isAngry ? this.cfg.angrySpeed : this.cfg.speed;
  }

  update(dt, world, player, game) {
    if (this.dying) {
      this.dieTimer -= dt;
      if (this.dieTimer <= 0) this.alive = false;
      return;
    }

    // Flash
    if (this.flashTimer > 0) this.flashTimer -= dt * 1000;

    // Phase check (final boss)
    if (this.isFinal) {
      if (this.hp <= BOSS.phase3hp) this.phase = 3;
      else if (this.hp <= BOSS.phase2hp) this.phase = 2;
      else this.phase = 1;
    }

    // Gravity
    if (!this.grounded) {
      this.vy += GRAVITY * dt;
    }

    // State machine
    this.stateTimer -= dt * 1000;
    if (this.stateTimer <= 0) {
      this._nextAction(player, game, world);
    }

    // Execute current state
    if (this.state === 'move') {
      this.x += this.currentSpeed * this.facing * dt;
    } else if (this.state === 'jump') {
      // Already applied velocity in _nextAction
    }

    // Apply gravity
    this.y += this.vy * dt;

    // Platform collision
    this._resolvePlatforms(world);

    // Wall clamp
    if (this.x < 0) { this.x = 0; this.facing = 1; }
    if (this.x + this.w > WIDTH) { this.x = WIDTH - this.w; this.facing = -1; }

    // Spawn minions (both mini boss and final boss)
    if (game) {
      this.spawnTimer -= dt * 1000;
      let interval, count;
      if (this.isFinal) {
        interval = this.phase === 3 ? BOSS.p3SpawnInterval :
                   this.phase === 2 ? BOSS.p2SpawnInterval : BOSS.p1SpawnInterval;
        count = this.phase >= 2 ? BOSS.p2SpawnCount : BOSS.p1SpawnCount;
      } else {
        // Mini boss spawns 1 enemy every 10s (angry: 7s)
        interval = this.isAngry ? 7000 : 10000;
        count = 1;
      }
      if (this.spawnTimer <= 0) {
        this.spawnTimer = interval;
        const types = this.isFinal ? ['ERASER','CLOWN','CANDY'] : ['ERASER','CANDY'];
        for (let i = 0; i < count; i++) {
          const sx = Math.random() * (WIDTH - 40);
          const et = types[Math.floor(Math.random() * types.length)];
          game.enemyManager.spawnSingle(et, sx, PLAY_TOP + 10, world);
        }
      }

      // Drop health food occasionally (final boss phase 2+)
      if (this.isFinal && this.phase >= 2 && Math.random() < 0.01 * dt) {
        game.itemManager.spawnItem('FOOD', this.x + this.w / 2, this.y + this.h);
      }
    }

    // Shake
    if (this.shakeTimer > 0) this.shakeTimer -= dt * 1000;
  }

  _nextAction(player, game, world) {
    const actions = this.isFinal ? this._bossActions(player, game) : this._miniBossActions(player, game);
    const action = actions[Math.floor(Math.random() * actions.length)];

    if (action === 'move') {
      this.state = 'move';
      this.facing = player.x > this.x ? 1 : -1;
      this.stateTimer = 1500 + Math.random() * 1000;
    } else if (action === 'jump') {
      this.state = 'jump';
      this.vy = -600 - (this.isAngry ? 100 : 0);
      this.grounded = false;
      this.facing = player.x > this.x ? 1 : -1;
      this.x += this.facing * 40;
      this.stateTimer = 800;
    } else if (action === 'attack') {
      this.state = 'attack';
      this.shakeTimer = 400;
      this._doAttack(player, game);
      this.stateTimer = this.isAngry ? 1200 : 2000;
    } else {
      this.state = 'idle';
      this.stateTimer = 800;
    }
  }

  _miniBossActions(player, game) {
    if (this.isAngry) return ['jump', 'attack', 'move', 'attack'];
    return ['move', 'attack', 'jump', 'idle'];
  }

  _bossActions(player, game) {
    if (this.phase === 3) return ['jump', 'attack', 'attack', 'move', 'jump'];
    if (this.phase === 2) return ['move', 'jump', 'attack', 'move', 'attack'];
    return ['idle', 'attack', 'move', 'idle', 'attack'];
  }

  _doAttack(player, game) {
    if (!game) return;
    let count;
    if (this.isFinal) {
      count = this.phase === 3 ? BOSS.p3FoodCount :
              this.phase === 2 ? BOSS.p2FoodCount : BOSS.p1FoodCount;
    } else {
      count = this.isAngry ? this.cfg.angryShootCount : this.cfg.shootCount;
    }

    const cx = this.x + this.w / 2;
    const cy = this.y + this.h * 0.3;
    const type = this.isFinal ? 'food' : 'normal';

    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) / 2) * 0.4;
      const spd = 120 + Math.random() * 80;
      const vx = spread * spd + (Math.random() - 0.5) * 60;
      // Food arcs up then falls; normal shoots sideways
      const vy = type === 'food' ? -(150 + Math.random() * 100) : (Math.random() - 0.5) * spd;
      game.projManager.addEnemyBullet(cx, cy, vx, vy, type);
    }
  }

  _resolvePlatforms(world) {
    const surfaces = world.getAllSurfaces();
    this.grounded = false;
    for (const p of surfaces) {
      if (this.vy >= 0) {
        const feetY = this.y + this.h;
        if (feetY >= p.y && feetY <= p.y + 20 &&
            this.x + this.w > p.x && this.x < p.x + p.w) {
          this.y = p.y - this.h;
          this.vy = 0;
          this.grounded = true;
          break;
        }
      }
    }
    // Don't fall below screen
    if (this.y + this.h > PLAY_BOTTOM) {
      this.y = GROUND_Y - this.h;
      this.vy = 0;
      this.grounded = true;
    }
  }

  takeDamage(dmg, game) {
    this.hp -= dmg;
    this.flashTimer = 150;
    if (game) game.playSfx('boss_hit');
    if (this.hp <= 0) {
      this.dying = true;
      this.dieTimer = 1.0;
    }
  }

  draw(ctx) {
    if (!this.alive) return;
    ctx.save();

    const shakeX = this.shakeTimer > 0 ? (Math.random() - 0.5) * 6 : 0;
    const shakeY = this.shakeTimer > 0 ? (Math.random() - 0.5) * 4 : 0;

    let dx = this.x + shakeX;
    let dy = this.y + shakeY;

    if (this.dying) {
      ctx.globalAlpha = this.dieTimer;
      const scale = 1 + (1 - this.dieTimer) * 0.8;
      ctx.translate(dx + this.w / 2, dy + this.h / 2);
      ctx.scale(scale, scale);
      ctx.translate(-this.w / 2, -this.h / 2);
      dx = 0; dy = 0;
    }

    // Body
    const col = this.flashTimer > 0 ? '#FFF' :
                this.isAngry ? (this.cfg.angryColor || '#EF5350') :
                (this.cfg.color || '#9575CD');
    ctx.fillStyle = col;
    const r = 12;
    ctx.beginPath();
    ctx.moveTo(dx + r, dy);
    ctx.lineTo(dx + this.w - r, dy);
    ctx.quadraticCurveTo(dx + this.w, dy, dx + this.w, dy + r);
    ctx.lineTo(dx + this.w, dy + this.h - r);
    ctx.quadraticCurveTo(dx + this.w, dy + this.h, dx + this.w - r, dy + this.h);
    ctx.lineTo(dx + r, dy + this.h);
    ctx.quadraticCurveTo(dx, dy + this.h, dx, dy + this.h - r);
    ctx.lineTo(dx, dy + r);
    ctx.quadraticCurveTo(dx, dy, dx + r, dy);
    ctx.fill();

    // Outline
    ctx.strokeStyle = COL.COCOA;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Eyes
    const eyeY = dy + this.h * 0.3;
    const eyeS = this.w * 0.12;
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(dx + this.w * 0.35, eyeY, eyeS + 2, 0, Math.PI * 2);
    ctx.arc(dx + this.w * 0.65, eyeY, eyeS + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.isAngry ? '#C62828' : COL.COCOA;
    ctx.beginPath();
    ctx.arc(dx + this.w * 0.35, eyeY, eyeS, 0, Math.PI * 2);
    ctx.arc(dx + this.w * 0.65, eyeY, eyeS, 0, Math.PI * 2);
    ctx.fill();

    // Angry eyebrows
    if (this.isAngry) {
      ctx.strokeStyle = COL.COCOA;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(dx + this.w * 0.2, eyeY - eyeS - 6);
      ctx.lineTo(dx + this.w * 0.42, eyeY - eyeS);
      ctx.moveTo(dx + this.w * 0.8, eyeY - eyeS - 6);
      ctx.lineTo(dx + this.w * 0.58, eyeY - eyeS);
      ctx.stroke();
    }

    // Crown (final boss)
    if (this.isFinal) {
      ctx.fillStyle = '#FFD700';
      const cw = this.w * 0.5;
      const ch = 14;
      const cx = dx + (this.w - cw) / 2;
      const cy2 = dy - ch + 4;
      ctx.beginPath();
      ctx.moveTo(cx, cy2 + ch);
      ctx.lineTo(cx, cy2 + 4);
      ctx.lineTo(cx + cw * 0.25, cy2 + ch * 0.5);
      ctx.lineTo(cx + cw * 0.5, cy2);
      ctx.lineTo(cx + cw * 0.75, cy2 + ch * 0.5);
      ctx.lineTo(cx + cw, cy2 + 4);
      ctx.lineTo(cx + cw, cy2 + ch);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#F9A825';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Emoji
    ctx.font = (this.w * 0.35) + 'px ' + FONT.BODY;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.cfg.emoji, dx + this.w / 2, dy + this.h * 0.65);

    // HP bar
    if (!this.dying) {
      const barW = this.w + 10;
      const barH = 6;
      const barX = dx + (this.w - barW) / 2;
      const barY = dy - 14;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(barX, barY, barW, barH);
      const pct = this.hp / this.maxHp;
      ctx.fillStyle = pct > 0.3 ? COL.BOSS_HP2 : COL.BOSS_HP1;
      ctx.fillRect(barX, barY, barW * pct, barH);
      ctx.strokeStyle = COL.COCOA;
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barW, barH);
    }

    ctx.restore();
  }

  getHitbox() {
    return { x: this.x + 5, y: this.y + 5, w: this.w - 10, h: this.h - 10 };
  }
}
