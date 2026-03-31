// ═══════════════════════════════════════════════════
//  js/hud.js — Tiny Guardian (co-op ready)
// ═══════════════════════════════════════════════════
class HUD {
  constructor(){this.comboPopups=[];this.notifications=[];}
  addComboPopup(t,x,y,c){this.comboPopups.push({text:t,x,y,timer:1.0,color:c||COL.GOLD});}
  addNotification(t){this.notifications.push({text:t,timer:2.0});}
  update(dt){
    for(const p of this.comboPopups){p.timer-=dt;p.y-=40*dt;}
    this.comboPopups=this.comboPopups.filter(p=>p.timer>0);
    for(const n of this.notifications)n.timer-=dt;
    this.notifications=this.notifications.filter(n=>n.timer>0);
  }

  draw(ctx, player, stageNum, timeLeft, player2) {
    const hG=ctx.createLinearGradient(0,0,0,HUD_H);
    hG.addColorStop(0,'rgba(255,236,179,0.95)');hG.addColorStop(1,'rgba(255,224,130,0.90)');
    ctx.fillStyle=hG;ctx.fillRect(0,0,WIDTH,HUD_H);
    ctx.fillStyle=COL.PRIMARY;ctx.fillRect(0,HUD_H-2,WIDTH,2);

    const hr=7, hsp=18;

    // P1 hearts — left side
    for(let i=0;i<player.maxHp;i++){
      const row=Math.floor(i/5),col=i%5;
      ctx.fillStyle=i<player.hp?COL.HEART_ON:'#FFE0B2';
      this._heart(ctx,8+col*hsp,10+row*16,hr);ctx.fill();
    }

    // Stage (center top)
    ctx.font='12px '+FONT.MAIN;ctx.fillStyle=COL.HUD_TEXT;ctx.textAlign='center';
    ctx.fillText('STAGE '+stageNum,WIDTH/2,14);

    // P2 hearts — right side (blue, mirror)
    if(player2){
      for(let i=0;i<player2.maxHp;i++){
        const row=Math.floor(i/5),col=4-(i%5);
        ctx.fillStyle=i<player2.hp?'#42A5F5':'#E3F2FD';
        this._heart(ctx,WIDTH-8-col*hsp,10+row*16,hr);ctx.fill();
      }
    }

    // Row 2: scores + timer
    const r2y=player.maxHp>5?42:30;
    ctx.font='11px '+FONT.MAIN;ctx.textAlign='left';ctx.fillStyle=COL.PRIMARY_D;
    ctx.fillText('★'+player.score,8,r2y);
    ctx.font='11px '+FONT.BODY;ctx.fillStyle=timeLeft<=15?COL.HEART_ON:COL.HUD_TEXT;ctx.textAlign='center';
    const m=Math.floor(timeLeft/60),s=Math.floor(timeLeft%60);
    ctx.fillText('⏱'+m+':'+(s<10?'0':'')+s,WIDTH/2,r2y);
    if(player2){ctx.font='11px '+FONT.MAIN;ctx.fillStyle='#42A5F5';ctx.textAlign='right';ctx.fillText('★'+player2.score,WIDTH-8,r2y);
      if(player2.hp<=0){ctx.font='9px '+FONT.BODY;ctx.fillText('👻',WIDTH-8,r2y+12);}
    }
    // Combo
    if(player.combo>=2){ctx.font='10px '+FONT.MAIN;ctx.fillStyle=COL.GOLD;ctx.textAlign='left';ctx.fillText('×'+player.combo,8,r2y+12);}

    // Charge bars above players
    this._chargeBar(ctx,player);
    if(player2&&player2.hp>0)this._chargeBar(ctx,player2);

    // Popups
    for(const p of this.comboPopups){ctx.save();ctx.globalAlpha=Math.min(1,p.timer*2);ctx.font='18px '+FONT.MAIN;ctx.fillStyle=p.color;ctx.textAlign='center';ctx.strokeStyle='#FFF';ctx.lineWidth=3;ctx.strokeText(p.text,p.x,p.y);ctx.fillText(p.text,p.x,p.y);ctx.restore();}
    // Notifications
    for(let i=0;i<this.notifications.length;i++){const n=this.notifications[i];ctx.save();ctx.globalAlpha=Math.min(1,n.timer*2);ctx.font='16px '+FONT.MAIN;ctx.textAlign='center';const ny=HEIGHT/2-80+i*28;ctx.fillStyle='rgba(255,248,225,0.85)';const tw=ctx.measureText(n.text).width+24;this._rr(ctx,WIDTH/2-tw/2,ny-14,tw,24,12);ctx.fill();ctx.fillStyle=COL.HUD_TEXT;ctx.fillText(n.text,WIDTH/2,ny+2);ctx.restore();}
    ctx.textAlign='left';
  }

  _chargeBar(ctx,p){
    const pct=p.charging?Math.min(p.chargeTime/WEAPON_CHARGE_MS,1):0;
    if(pct<=0.15)return;
    const bw=40,bh=5,bx=p.x+p.w/2-bw/2,by=p.y-12,blue=p.isP2;
    ctx.fillStyle='rgba(0,0,0,0.2)';ctx.fillRect(bx-1,by-1,bw+2,bh+2);
    const g=ctx.createLinearGradient(bx,0,bx+bw,0);
    g.addColorStop(0,blue?'#81D4FA':COL.PRIMARY);g.addColorStop(1,p.chargeFull?(blue?'#1E88E5':COL.WARM_ORANGE):(blue?'#42A5F5':COL.PRIMARY_D));
    ctx.fillStyle=g;ctx.fillRect(bx,by,bw*pct,bh);
    if(p.chargeFull&&Math.floor(Date.now()/120)%2===0){ctx.fillStyle='rgba(255,255,255,0.7)';ctx.fillRect(bx,by,bw,bh);}
  }

  _heart(ctx,cx,cy,r){ctx.beginPath();ctx.moveTo(cx,cy+r*0.4);ctx.bezierCurveTo(cx,cy-r*0.5,cx-r,cy-r*0.5,cx-r,cy+r*0.1);ctx.bezierCurveTo(cx-r,cy+r*0.6,cx,cy+r,cx,cy+r*1.2);ctx.bezierCurveTo(cx,cy+r,cx+r,cy+r*0.6,cx+r,cy+r*0.1);ctx.bezierCurveTo(cx+r,cy-r*0.5,cx,cy-r*0.5,cx,cy+r*0.4);ctx.closePath();}
  _rr(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}
}
