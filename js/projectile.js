// ═══════════════════════════════════════════════════
//  js/projectile.js  —  Tiny Guardian
//  Player bullets (normal + charge) & enemy projectiles
// ═══════════════════════════════════════════════════

class Projectile {
  constructor(x, y, dir, charged, angleY, owner) {
    this.x = x;
    this.y = y;
    this.dir = dir;
    this.charged = charged;
    this.w = charged ? PROJ_CHARGE_W : PROJ_W;
    this.h = charged ? PROJ_CHARGE_H : PROJ_H;
    this.damage = charged ? PROJ_DMG_CHARGE : PROJ_DMG_NORMAL;
    this.speed = PROJ_SPEED;
    this.angleY = angleY || 0;
    this.pierce = charged ? 1 : 0;
    this.owner = owner || 'p1'; // 'p1' | 'p2'
    this.alive = true;
    this.trail = [];
  }

  update(dt) {
    this.x += this.speed * this.dir * dt;
    this.y += this.speed * this.angleY * dt;
    // trail
    this.trail.push({ x: this.x, y: this.y, t: 0.2 });
    if (this.trail.length > 6) this.trail.shift();
    for (const t of this.trail) t.t -= dt;
    this.trail = this.trail.filter(t => t.t > 0);
    // out of bounds
    if (this.x < -40 || this.x > WIDTH + 40 || this.y < PLAY_TOP - 40 || this.y > PLAY_BOTTOM + 40) {
      this.alive = false;
    }
  }

  draw(ctx) {
    // Trail
    for (const t of this.trail) {
      ctx.globalAlpha = t.t * 2;
      ctx.fillStyle = this.charged ? '#FFB74D' : '#FFD54F';
      ctx.beginPath();
      ctx.arc(t.x + this.w / 2, t.y + this.h / 2, this.w / 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Bullet
    if (this.charged) {
      // Big glowing star
      ctx.fillStyle = '#FFB74D';
      ctx.beginPath();
      ctx.arc(this.x + this.w / 2, this.y + this.h / 2, this.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFF8E1';
      ctx.beginPath();
      ctx.arc(this.x + this.w / 2, this.y + this.h / 2, this.w / 4, 0, Math.PI * 2);
      ctx.fill();
      // glow
      ctx.fillStyle = 'rgba(255,213,79,0.3)';
      ctx.beginPath();
      ctx.arc(this.x + this.w / 2, this.y + this.h / 2, this.w / 2 + 6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Small yellow dot
      ctx.fillStyle = '#FFD54F';
      ctx.beginPath();
      ctx.arc(this.x + this.w / 2, this.y + this.h / 2, this.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFDE7';
      ctx.beginPath();
      ctx.arc(this.x + this.w / 2, this.y + this.h / 2, this.w / 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  getHitbox() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }
}

// ── Enemy Projectile ─────────────────────────────────
class EnemyProjectile {
  constructor(x, y, vx, vy, type) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.w = 16;
    this.h = 16;
    this.type = type || 'normal'; // 'normal' | 'food'
    this.alive = true;
    this.emoji = type === 'food' ? BOSS_FOODS[Math.floor(Math.random() * BOSS_FOODS.length)].emoji : '💥';
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    // food falls with gravity
    if (this.type === 'food') {
      this.vy += 400 * dt;
    }
    // out of bounds
    if (this.x < -40 || this.x > WIDTH + 40 || this.y > PLAY_BOTTOM + 40 || this.y < PLAY_TOP - 40) {
      this.alive = false;
    }
  }

  draw(ctx) {
    ctx.font = '16px ' + FONT.BODY;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.emoji, this.x + this.w / 2, this.y + this.h / 2);
  }

  getHitbox() {
    return { x: this.x + 2, y: this.y + 2, w: this.w - 4, h: this.h - 4 };
  }
}

class ProjectileManager {
  constructor() {
    this.playerBullets = [];
    this.enemyBullets = [];
  }

  reset() {
    this.playerBullets = [];
    this.enemyBullets = [];
  }

  addPlayerBullet(x, y, dir, charged, angleY, owner) {
    this.playerBullets.push(new Projectile(x, y, dir, charged, angleY, owner));
  }

  addEnemyBullet(x, y, vx, vy, type) {
    this.enemyBullets.push(new EnemyProjectile(x, y, vx, vy, type));
  }

  update(dt) {
    for (const b of this.playerBullets) b.update(dt);
    for (const b of this.enemyBullets) b.update(dt);
    this.playerBullets = this.playerBullets.filter(b => b.alive);
    this.enemyBullets = this.enemyBullets.filter(b => b.alive);
  }

  draw(ctx) {
    for (const b of this.playerBullets) b.draw(ctx);
    for (const b of this.enemyBullets) b.draw(ctx);
  }
}
