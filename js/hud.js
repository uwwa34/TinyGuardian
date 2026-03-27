// ═══════════════════════════════════════════════════
//  js/hud.js — Tiny Guardian (charge bar above player)
// ═══════════════════════════════════════════════════
class HUD {
  constructor() { this.comboPopups=[]; this.notifications=[]; }
  addComboPopup(t,x,y,c) { this.comboPopups.push({text:t,x,y,timer:1.0,color:c||COL.GOLD}); }
  addNotification(t) { this.notifications.push({text:t,timer:2.0}); }
  update(dt) {
    for(const p of this.comboPopups){p.timer-=dt;p.y-=40*dt;}
    this.comboPopups=this.comboPopups.filter(p=>p.timer>0);
    for(const n of this.notifications) n.timer-=dt;
    this.notifications=this.notifications.filter(n=>n.timer>0);
  }

  draw(ctx, player, stageNum, timeLeft) {
    // HUD background
    const hG=ctx.createLinearGradient(0,0,0,HUD_H);
    hG.addColorStop(0,'rgba(255,236,179,0.95)');hG.addColorStop(1,'rgba(255,224,130,0.90)');
    ctx.fillStyle=hG; ctx.fillRect(0,0,WIDTH,HUD_H);
    ctx.fillStyle=COL.PRIMARY; ctx.fillRect(0,HUD_H-2,WIDTH,2);

    // Row 1: Hearts (2 rows of 5)
    const heartR=6;
    for(let i=0;i<player.maxHp;i++){
      const row=Math.floor(i/5), col=i%5;
      const hx=8+col*17, hy=10+row*16;
      if(i<player.hp){ctx.fillStyle=COL.HEART_ON;this._drawHeart(ctx,hx,hy,heartR);ctx.fill();}
      else{ctx.fillStyle='#FFE0B2';this._drawHeart(ctx,hx,hy,heartR);ctx.fill();ctx.strokeStyle='#FFCC80';ctx.lineWidth=1;this._drawHeart(ctx,hx,hy,heartR);ctx.stroke();}
    }

    // Stage label
    ctx.font='12px '+FONT.MAIN;ctx.fillStyle=COL.HUD_TEXT;ctx.textAlign='center';
    ctx.fillText('STAGE '+stageNum, WIDTH/2, 18);

    // Score
    ctx.font='12px '+FONT.MAIN;ctx.fillStyle=COL.PRIMARY_D;ctx.textAlign='right';
    ctx.fillText('★ '+player.score, WIDTH-8, 18);

    // Timer
    ctx.font='11px '+FONT.BODY;ctx.fillStyle=timeLeft<=15?COL.HEART_ON:COL.HUD_TEXT;ctx.textAlign='center';
    const mins=Math.floor(timeLeft/60),secs=Math.floor(timeLeft%60);
    ctx.fillText('⏱ '+mins+':'+(secs<10?'0':'')+secs, WIDTH/2, 42);

    // Combo
    if(player.combo>=2){ctx.font='11px '+FONT.MAIN;ctx.fillStyle=COL.GOLD;ctx.textAlign='right';ctx.fillText('×'+player.combo+' COMBO!',WIDTH-8,42);}

    // ── Charge bar above player (only when >15% charged) ──
    const chargePct=player.charging?Math.min(player.chargeTime/WEAPON_CHARGE_MS,1):0;
    if(chargePct>0.15){
      const barW=40,barH=5;
      const barX=player.x+player.w/2-barW/2;
      const barY=player.y-12;
      ctx.fillStyle='rgba(0,0,0,0.25)';
      ctx.fillRect(barX-1,barY-1,barW+2,barH+2);
      const g2=ctx.createLinearGradient(barX,0,barX+barW,0);
      g2.addColorStop(0,COL.PRIMARY);g2.addColorStop(1,player.chargeFull?COL.WARM_ORANGE:COL.PRIMARY_D);
      ctx.fillStyle=g2; ctx.fillRect(barX,barY,barW*chargePct,barH);
      if(player.chargeFull&&Math.floor(Date.now()/120)%2===0){ctx.fillStyle='rgba(255,255,255,0.7)';ctx.fillRect(barX,barY,barW,barH);}
      ctx.strokeStyle='rgba(255,255,255,0.5)';ctx.lineWidth=1;ctx.strokeRect(barX,barY,barW,barH);
    }

    // Popups
    for(const p of this.comboPopups){ctx.save();ctx.globalAlpha=Math.min(1,p.timer*2);ctx.font='18px '+FONT.MAIN;ctx.fillStyle=p.color;ctx.textAlign='center';ctx.strokeStyle='#FFF';ctx.lineWidth=3;ctx.strokeText(p.text,p.x,p.y);ctx.fillText(p.text,p.x,p.y);ctx.restore();}

    // Notifications
    for(let i=0;i<this.notifications.length;i++){
      const n=this.notifications[i];ctx.save();ctx.globalAlpha=Math.min(1,n.timer*2);
      ctx.font='16px '+FONT.MAIN;ctx.textAlign='center';
      const ny=HEIGHT/2-80+i*28;
      ctx.fillStyle='rgba(255,248,225,0.85)';
      const tw=ctx.measureText(n.text).width+24;
      this._rr(ctx,WIDTH/2-tw/2,ny-14,tw,24,12);ctx.fill();
      ctx.fillStyle=COL.HUD_TEXT;ctx.fillText(n.text,WIDTH/2,ny+2);ctx.restore();
    }
    ctx.textAlign='left';
  }

  _drawHeart(ctx,cx,cy,r){
    ctx.beginPath();ctx.moveTo(cx,cy+r*0.4);
    ctx.bezierCurveTo(cx,cy-r*0.5,cx-r,cy-r*0.5,cx-r,cy+r*0.1);
    ctx.bezierCurveTo(cx-r,cy+r*0.6,cx,cy+r,cx,cy+r*1.2);
    ctx.bezierCurveTo(cx,cy+r,cx+r,cy+r*0.6,cx+r,cy+r*0.1);
    ctx.bezierCurveTo(cx+r,cy-r*0.5,cx,cy-r*0.5,cx,cy+r*0.4);ctx.closePath();
  }
  _rr(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}
}
