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
          if (feetY >= p.y && feetY <= p.y+30 && this.x+this.w > p.x && this.x < p.x+p.w) {
            this.y = p.y - this.h; this.vy = 0; this.grounded = true; break;
          }
        }
      }
      // Safety clamp — never fall below ground
      if (this.y + this.h > GROUND_Y) {
        this.y = GROUND_Y - this.h; this.vy = 0; this.grounded = true;
      }
    }
    if (player.powerups && player.powerups.magnet) {
      const dx = (player.x+player.w/2)-(this.x+this.w/2);
      const dy = (player.y+player.h/2)-(this.y+this.h/2);
      const dist = Math.sqrt(dx*dx+dy*dy);
      if (dist < 150 && dist > 0) { const pull=300*dt; this.x+=(dx/dist)*pull; this.y+=(dy/dist)*pull; }
    }
    // Only remove if off screen horizontally
    if (this.x < -100 || this.x > WIDTH+100) this.alive = false;
  }

  draw(ctx, images) {
    if (!this.alive) return;
    const bobY = Math.sin(this.bobAngle)*3;
    const dy = this.y + bobY;
    const cx = this.x + this.w/2, cy = dy + this.h/2;

    // Try image first
    if (images && this.imgKey && images[this.imgKey]) {
      const img = images[this.imgKey];
      ctx.drawImage(img, 0, 0, img.width, img.height, this.x, dy, this.w, this.h);
    } else {
      // Fallback: draw colored shapes (reliable on all platforms)
      ctx.save();
      if (this.type === 'COIN' || this.type === 'SPECIAL') {
        // Star/coin shape
        const col = this.type === 'SPECIAL' ? '#FFD700' : '#FFE082';
        ctx.fillStyle = col;
        ctx.strokeStyle = '#F9A825';
        ctx.lineWidth = 1.5;
        this._drawStar(ctx, cx, cy, this.w/2 - 2, 5);
        ctx.fill(); ctx.stroke();
        // Label
        ctx.fillStyle = '#5D4037';
        ctx.font = 'bold '+(this.w*0.45)+'px '+FONT.BODY;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(this.type === 'SPECIAL' ? 'S' : '★', cx, cy + 1);
      } else if (this.type === 'HEART') {
        // Heart shape
        ctx.fillStyle = '#EF5350';
        const r = this.w/2 - 2;
        ctx.beginPath(); ctx.moveTo(cx, cy+r*0.3);
        ctx.bezierCurveTo(cx,cy-r*0.5,cx-r,cy-r*0.5,cx-r,cy+r*0.1);
        ctx.bezierCurveTo(cx-r,cy+r*0.5,cx,cy+r*0.8,cx,cy+r);
        ctx.bezierCurveTo(cx,cy+r*0.8,cx+r,cy+r*0.5,cx+r,cy+r*0.1);
        ctx.bezierCurveTo(cx+r,cy-r*0.5,cx,cy-r*0.5,cx,cy+r*0.3);
        ctx.closePath(); ctx.fill();
      } else if (this.type === 'FOOD') {
        // Apple shape
        ctx.fillStyle = '#66BB6A';
        ctx.beginPath(); ctx.arc(cx, cy, this.w/2-2, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#388E3C';
        ctx.fillRect(cx-1, cy-this.h/2, 2, 5);
      } else {
        // Generic circle with emoji
        ctx.fillStyle = 'rgba(255,236,179,0.8)';
        ctx.beginPath(); ctx.arc(cx, cy, this.w/2, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#FFD54F'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.font = (this.w*0.6)+'px '+FONT.BODY;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#5D4037';
        ctx.fillText(this.emoji, cx, cy);
      }
      ctx.restore();
    }
  }

  _drawStar(ctx, cx, cy, r, points) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI / points) - Math.PI / 2;
      const rad = i % 2 === 0 ? r : r * 0.45;
      const x = cx + Math.cos(angle) * rad;
      const y = cy + Math.sin(angle) * rad;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
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
