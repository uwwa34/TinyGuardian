// ═══════════════════════════════════════════════════
//  js/hud.js  —  Tiny Guardian (Yellow Pastel HUD)
// ═══════════════════════════════════════════════════

class HUD {
  constructor() {
    this.comboPopups = [];
    this.notifications = [];
  }
  addComboPopup(text, x, y, color) {
    this.comboPopups.push({ text, x, y, timer:1.0, color:color||COL.GOLD });
  }
  addNotification(text) {
    this.notifications.push({ text, timer:2.0 });
  }
  update(dt) {
    for (const p of this.comboPopups) { p.timer -= dt; p.y -= 40*dt; }
    this.comboPopups = this.comboPopups.filter(p => p.timer > 0);
    for (const n of this.notifications) n.timer -= dt;
    this.notifications = this.notifications.filter(n => n.timer > 0);
  }

  draw(ctx, player, stageNum, timeLeft) {
    // ── HUD background — Yellow Pastel ──
    const hGrad = ctx.createLinearGradient(0, 0, 0, HUD_H);
    hGrad.addColorStop(0, 'rgba(255,236,179,0.95)');
    hGrad.addColorStop(1, 'rgba(255,224,130,0.90)');
    ctx.fillStyle = hGrad;
    ctx.fillRect(0, 0, WIDTH, HUD_H);
    // Bottom edge line
    ctx.fillStyle = COL.PRIMARY;
    ctx.fillRect(0, HUD_H - 2, WIDTH, 2);

    const y1 = 20;

    // Hearts — draw as shapes for reliable rendering
    for (let i = 0; i < player.maxHp; i++) {
      const hx = 10 + i * 21;
      const hy = y1;
      if (i < player.hp) {
        // Full heart — red
        ctx.fillStyle = COL.HEART_ON;
        this._drawHeart(ctx, hx, hy, 8);
        ctx.fill();
      } else {
        // Empty heart — outline only
        ctx.fillStyle = '#FFE0B2';
        this._drawHeart(ctx, hx, hy, 8);
        ctx.fill();
        ctx.strokeStyle = '#FFCC80';
        ctx.lineWidth = 1;
        this._drawHeart(ctx, hx, hy, 8);
        ctx.stroke();
      }
    }

    // Stage
    ctx.font = '12px ' + FONT.MAIN;
    ctx.fillStyle = COL.HUD_TEXT;
    ctx.textAlign = 'center';
    ctx.fillText('STAGE ' + stageNum, WIDTH / 2, y1 + 2);

    // Score
    ctx.font = '12px ' + FONT.MAIN;
    ctx.fillStyle = COL.PRIMARY_D;
    ctx.textAlign = 'right';
    ctx.fillText('★ ' + player.score, WIDTH - 8, y1 + 2);

    // Row 2
    const y2 = 44;

    // Timer
    ctx.font = '11px ' + FONT.BODY;
    ctx.fillStyle = timeLeft <= 15 ? COL.HEART_ON : COL.HUD_TEXT;
    ctx.textAlign = 'left';
    const mins = Math.floor(timeLeft / 60);
    const secs = Math.floor(timeLeft % 60);
    ctx.fillText('⏱ ' + mins + ':' + (secs < 10 ? '0' : '') + secs, 8, y2);

    // Charge bar
    const barX = 80, barW = 115, barH = 9, barY = y2 - 7;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    this._roundRect(ctx, barX, barY, barW, barH, 4);
    ctx.fill();

    const chargePct = player.charging ? Math.min(player.chargeTime / WEAPON_CHARGE_MS, 1) : 0;
    if (chargePct > 0) {
      const g = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      g.addColorStop(0, COL.PRIMARY);
      g.addColorStop(1, player.chargeFull ? COL.WARM_ORANGE : COL.PRIMARY_D);
      ctx.fillStyle = g;
      this._roundRect(ctx, barX, barY, barW * chargePct, barH, 4);
      ctx.fill();
    }
    if (player.chargeFull && Math.floor(Date.now() / 150) % 2 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      this._roundRect(ctx, barX, barY, barW, barH, 4);
      ctx.fill();
    }
    ctx.strokeStyle = COL.PRIMARY_D;
    ctx.lineWidth = 1;
    this._roundRect(ctx, barX, barY, barW, barH, 4);
    ctx.stroke();

    ctx.font = '8px ' + FONT.BODY;
    ctx.fillStyle = COL.HUD_TEXT;
    ctx.textAlign = 'left';
    ctx.fillText('CHARGE', barX + barW + 4, y2 - 1);

    // Combo
    if (player.combo >= 2) {
      ctx.font = '11px ' + FONT.MAIN;
      ctx.fillStyle = COL.GOLD;
      ctx.textAlign = 'right';
      ctx.fillText('×' + player.combo + ' COMBO!', WIDTH - 8, y2);
    }

    // ── Popups ──
    for (const p of this.comboPopups) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.timer * 2);
      ctx.font = '18px ' + FONT.MAIN;
      ctx.fillStyle = p.color;
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#FFF';
      ctx.lineWidth = 3;
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillText(p.text, p.x, p.y);
      ctx.restore();
    }

    // ── Notifications ──
    for (let i = 0; i < this.notifications.length; i++) {
      const n = this.notifications[i];
      ctx.save();
      ctx.globalAlpha = Math.min(1, n.timer * 2);
      ctx.font = '16px ' + FONT.MAIN;
      ctx.textAlign = 'center';
      const ny = HEIGHT / 2 - 80 + i * 28;
      // Soft background pill
      ctx.fillStyle = 'rgba(255,248,225,0.85)';
      const tw = ctx.measureText(n.text).width + 24;
      this._roundRect(ctx, WIDTH/2 - tw/2, ny - 14, tw, 24, 12);
      ctx.fill();
      ctx.fillStyle = COL.HUD_TEXT;
      ctx.fillText(n.text, WIDTH / 2, ny + 2);
      ctx.restore();
    }
    ctx.textAlign = 'left';
  }

  _drawHeart(ctx, cx, cy, r) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + r * 0.4);
    ctx.bezierCurveTo(cx, cy - r * 0.5, cx - r, cy - r * 0.5, cx - r, cy + r * 0.1);
    ctx.bezierCurveTo(cx - r, cy + r * 0.6, cx, cy + r, cx, cy + r * 1.2);
    ctx.bezierCurveTo(cx, cy + r, cx + r, cy + r * 0.6, cx + r, cy + r * 0.1);
    ctx.bezierCurveTo(cx + r, cy - r * 0.5, cx, cy - r * 0.5, cx, cy + r * 0.4);
    ctx.closePath();
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.lineTo(x+w-r, y);
    ctx.quadraticCurveTo(x+w, y, x+w, y+r);
    ctx.lineTo(x+w, y+h-r);
    ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
    ctx.lineTo(x+r, y+h);
    ctx.quadraticCurveTo(x, y+h, x, y+h-r);
    ctx.lineTo(x, y+r);
    ctx.quadraticCurveTo(x, y, x+r, y);
    ctx.closePath();
  }
}
