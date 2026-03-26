// ═══════════════════════════════════════════════════
//  js/items.js — Tiny Guardian — Items + image support
// ═══════════════════════════════════════════════════

class ItemUnit {
  constructor(type, x, y, stageNum) {
    this.type = type;
    this.x = x; this.y = y;
    this.alive = true;

    if (ITEM[type]) {
      const def = ITEM[type];
      this.w = def.w; this.h = def.h;
      this.points = def.points;
      this.emoji = stageNum ? (STAGE_ITEMS[stageNum] && STAGE_ITEMS[stageNum][type.toLowerCase()]) || def.emoji : def.emoji;
      this.isPowerup = false;
      this.healsFat = def.heals_fat || false;
      this.healsHp = def.heals_hp || false;
      this.imgKey = def.imgKey || null;
    } else if (POWERUP_TYPES[type]) {
      const def = POWERUP_TYPES[type];
      this.w = 32; this.h = 32;
      this.points = 0;
      this.emoji = def.emoji;
      this.isPowerup = true;
      this.powerupKey = type;
      this.healsFat = false;
      this.healsHp = false;
      this.imgKey = def.imgKey || null;
    }

    this.bobAngle = Math.random() * Math.PI * 2;
    this.vy = 0;
    this.grounded = false;
  }

  update(dt, world, player) {
    this.bobAngle += dt * 3;
    if (!this.grounded) {
      this.vy += 600 * dt;
      this.y += this.vy * dt;
      const surfaces = world.getAllSurfaces();
      for (const p of surfaces) {
        if (this.vy >= 0) {
          const feetY = this.y + this.h;
          if (feetY >= p.y && feetY <= p.y+12 && this.x+this.w > p.x && this.x < p.x+p.w) {
            this.y = p.y - this.h; this.vy = 0; this.grounded = true; break;
          }
        }
      }
    }
    if (player.powerups.magnet) {
      const dx = (player.x+player.w/2)-(this.x+this.w/2);
      const dy = (player.y+player.h/2)-(this.y+this.h/2);
      const dist = Math.sqrt(dx*dx+dy*dy);
      if (dist < 150 && dist > 0) { const pull=300*dt; this.x+=(dx/dist)*pull; this.y+=(dy/dist)*pull; }
    }
    if (this.y > PLAY_BOTTOM+50) this.alive = false;
  }

  draw(ctx, images) {
    if (!this.alive) return;
    const bobY = Math.sin(this.bobAngle)*3;
    const dy = this.y + bobY;

    if (this.isPowerup) {
      ctx.save();
      ctx.fillStyle='rgba(255,213,79,0.25)';
      ctx.beginPath();ctx.arc(this.x+this.w/2, dy+this.h/2, this.w/2+8+Math.sin(this.bobAngle*2)*3, 0, Math.PI*2);ctx.fill();
      ctx.restore();
    }

    // Try image
    if (images && this.imgKey && images[this.imgKey]) {
      ctx.drawImage(images[this.imgKey], this.x, dy, this.w, this.h);
    } else {
      ctx.font = this.w+'px '+FONT.BODY;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(this.emoji, this.x+this.w/2, dy+this.h/2);
    }
  }

  getHitbox() { return {x:this.x, y:this.y, w:this.w, h:this.h}; }
}

class ItemManager {
  constructor() { this.items=[]; }
  reset() { this.items=[]; }
  spawnItem(type, x, y, stageNum) { this.items.push(new ItemUnit(type, x, y, stageNum)); }
  spawnRandomPowerup(x, y) {
    const keys=Object.keys(POWERUP_TYPES);
    this.items.push(new ItemUnit(keys[Math.floor(Math.random()*keys.length)], x, y));
  }
  dropFromEnemy(ex, ey, stageNum) {
    if (Math.random() < 0.4) this.spawnItem('COIN', ex, ey, stageNum);
    if (Math.random() < 0.1) this.spawnItem('SPECIAL', ex, ey, stageNum);
    if (Math.random() < 0.08) this.spawnItem('HEART', ex+10, ey, stageNum);
  }
  update(dt, world, player) {
    for(const item of this.items) item.update(dt, world, player);
    this.items = this.items.filter(i=>i.alive);
  }
  draw(ctx, images) { for(const item of this.items) item.draw(ctx, images); }
}
