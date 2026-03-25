// ═══════════════════════════════════════════════════
//  js/ranking.js  —  Tiny Guardian (Yellow Pastel UI)
// ═══════════════════════════════════════════════════

class TallyScreen {
  constructor() { this.lines=[]; this.total=0; this.animIndex=0; this.animTimer=0; this.done=false; }
  init(player, stagesCleared, timeBonuses) {
    this.lines=[]; this.animIndex=0; this.animTimer=0; this.done=false;
    let stageBonus = stagesCleared * STAGE_CLEAR_BONUS;
    let timeBonus = 0;
    for (const tb of timeBonuses) timeBonus += tb;
    let enemyScore = player.score - stageBonus - timeBonus - (player.itemsCollected * 50);
    if (enemyScore < 0) enemyScore = 0;
    this.lines.push({ label:'🎯 ศัตรูที่กำจัด', value:player.kills+' ตัว', pts:0 });
    this.lines.push({ label:'⚔️ คะแนนต่อสู้', value:'', pts:enemyScore });
    this.lines.push({ label:'⭐ ไอเทม', value:player.itemsCollected+' ชิ้น', pts:player.itemsCollected*50 });
    this.lines.push({ label:'🏁 ผ่านด่าน', value:stagesCleared+' ด่าน', pts:stageBonus });
    this.lines.push({ label:'⏱ Time Bonus', value:'', pts:timeBonus });
    this.lines.push({ label:'', value:'', pts:0, isSep:true });
    this.lines.push({ label:'🏆 คะแนนรวม', value:'', pts:player.score, isTotal:true });
    this.total = player.score;
  }
  update(dt) {
    if (this.done) return;
    this.animTimer += dt;
    if (this.animTimer > 0.4) { this.animTimer=0; this.animIndex++; if (this.animIndex>=this.lines.length) this.done=true; }
  }
  draw(ctx) {
    // Yellow Pastel background
    const g = ctx.createLinearGradient(0,0,0,HEIGHT);
    g.addColorStop(0,'#FFF8E1'); g.addColorStop(1,'#FFE082');
    ctx.fillStyle = g; ctx.fillRect(0,0,WIDTH,HEIGHT);

    // Panel
    ctx.fillStyle = COL.PANEL_BG;
    _rr(ctx, 25, 60, WIDTH-50, HEIGHT-120, 16); ctx.fill();
    ctx.strokeStyle = COL.PANEL_BORDER; ctx.lineWidth = 2;
    _rr(ctx, 25, 60, WIDTH-50, HEIGHT-120, 16); ctx.stroke();

    ctx.font = '26px '+FONT.MAIN; ctx.fillStyle = COL.PRIMARY_D; ctx.textAlign = 'center';
    ctx.fillText('สรุปผล ✨', WIDTH/2, 100);

    let y = 145;
    for (let i = 0; i < Math.min(this.animIndex+1, this.lines.length); i++) {
      const l = this.lines[i];
      if (l.isSep) { ctx.strokeStyle=COL.PRIMARY; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(50,y); ctx.lineTo(WIDTH-50,y); ctx.stroke(); y+=16; continue; }
      ctx.font = l.isTotal ? '18px '+FONT.MAIN : '13px '+FONT.BODY;
      ctx.fillStyle = l.isTotal ? COL.PRIMARY_D : COL.HUD_TEXT;
      ctx.textAlign = 'left';
      ctx.fillText(l.label, 45, y);
      if (l.value) { ctx.textAlign='center'; ctx.fillText(l.value, WIDTH/2, y); }
      ctx.textAlign = 'right';
      ctx.fillStyle = l.isTotal ? COL.GOLD : COL.PRIMARY_D;
      ctx.fillText(l.pts.toLocaleString()+' pts', WIDTH-45, y);
      y += l.isTotal ? 36 : 30;
    }
    if (this.done) {
      ctx.font = '14px '+FONT.BODY; ctx.fillStyle = COL.HUD_TEXT; ctx.textAlign = 'center';
      ctx.globalAlpha = 0.5+Math.sin(Date.now()/300)*0.5;
      ctx.fillText('แตะหรือกด A เพื่อไปต่อ', WIDTH/2, HEIGHT-60);
      ctx.globalAlpha = 1;
    }
  }
}

class NameScreen {
  constructor() { this.name=''; this.maxLen=8; this.cursor=true; this.cursorTimer=0; }
  reset() { this.name=''; }
  handleKey(key) {
    if (key==='Backspace') { this.name=this.name.slice(0,-1); }
    else if ((key==='Enter'||key==='OK') && this.name.length>=1) return this.name;
    else if (this.name.length<this.maxLen && key.length===1 && /[a-zA-Z0-9ก-๛]/.test(key)) this.name+=key;
    return null;
  }
  update(dt) { this.cursorTimer+=dt; if(this.cursorTimer>0.5){this.cursorTimer=0;this.cursor=!this.cursor;} }
  draw(ctx) {
    const g = ctx.createLinearGradient(0,0,0,HEIGHT);
    g.addColorStop(0,'#FFF8E1'); g.addColorStop(1,'#FFE082');
    ctx.fillStyle = g; ctx.fillRect(0,0,WIDTH,HEIGHT);

    ctx.fillStyle = COL.PANEL_BG;
    _rr(ctx, 25, 100, WIDTH-50, HEIGHT-160, 16); ctx.fill();
    ctx.strokeStyle = COL.PANEL_BORDER; ctx.lineWidth = 2;
    _rr(ctx, 25, 100, WIDTH-50, HEIGHT-160, 16); ctx.stroke();

    ctx.font='24px '+FONT.MAIN; ctx.fillStyle=COL.PRIMARY_D; ctx.textAlign='center';
    ctx.fillText('บันทึกชื่อ 🏆', WIDTH/2, 145);

    // Name field
    const fw=260, fh=46, fx=(WIDTH-fw)/2, fy=175;
    ctx.fillStyle='rgba(255,255,255,0.7)';
    _rr(ctx,fx,fy,fw,fh,10); ctx.fill();
    ctx.strokeStyle=COL.PRIMARY_D; ctx.lineWidth=2;
    _rr(ctx,fx,fy,fw,fh,10); ctx.stroke();
    ctx.font='26px '+FONT.MAIN; ctx.fillStyle=COL.HUD_TEXT; ctx.textAlign='center';
    ctx.fillText(this.name+(this.cursor?'|':''), WIDTH/2, fy+32);
    ctx.font='11px '+FONT.BODY; ctx.fillStyle=COL.HUD_TEXT;
    ctx.fillText('พิมพ์ชื่อ 1–8 ตัว แล้วกด Enter', WIDTH/2, fy+62);

    // On-screen keyboard
    this._drawKb(ctx, fy+82);
  }
  _drawKb(ctx, sy) {
    const rows=['QWERTYUIOP','ASDFGHJKL','ZXCVBNM'];
    const kw=30, kh=34, gap=3;
    this._kbData = { rows, sy, kw, kh, gap };
    for (let r=0;r<rows.length;r++) {
      const row=rows[r], tw=row.length*(kw+gap)-gap, sx=(WIDTH-tw)/2, ky=sy+r*(kh+gap);
      for (let c=0;c<row.length;c++) {
        const kx=sx+c*(kw+gap);
        ctx.fillStyle='rgba(255,236,179,0.7)';
        _rr(ctx,kx,ky,kw,kh,5); ctx.fill();
        ctx.strokeStyle=COL.PRIMARY; ctx.lineWidth=1;
        _rr(ctx,kx,ky,kw,kh,5); ctx.stroke();
        ctx.font='12px '+FONT.MAIN; ctx.fillStyle=COL.HUD_TEXT; ctx.textAlign='center';
        ctx.fillText(row[c], kx+kw/2, ky+kh/2+5);
      }
    }
    const lastY = sy+3*(kh+gap);
    ctx.fillStyle='rgba(239,154,154,0.5)';
    _rr(ctx,35,lastY,80,kh,5); ctx.fill();
    ctx.font='11px '+FONT.BODY; ctx.fillStyle=COL.HUD_TEXT; ctx.textAlign='center';
    ctx.fillText('← ลบ', 75, lastY+kh/2+5);
    ctx.fillStyle='rgba(255,213,79,0.5)';
    _rr(ctx,WIDTH-115,lastY,80,kh,5); ctx.fill();
    ctx.fillStyle=COL.HUD_TEXT;
    ctx.fillText('OK ✓', WIDTH-75, lastY+kh/2+5);
    this._kbLastY = lastY;
    this._kbKeyH = kh;
  }
  handleTouch(tx, ty) {
    if (!this._kbData) return null;
    const {rows,sy,kw,kh,gap} = this._kbData;
    for (let r=0;r<rows.length;r++) {
      const row=rows[r], tw=row.length*(kw+gap)-gap, sx=(WIDTH-tw)/2, ky=sy+r*(kh+gap);
      for (let c=0;c<row.length;c++) {
        const kx=sx+c*(kw+gap);
        if (tx>=kx&&tx<=kx+kw&&ty>=ky&&ty<=ky+kh) return this.handleKey(row[c]);
      }
    }
    if (tx>=35&&tx<=115&&ty>=this._kbLastY&&ty<=this._kbLastY+this._kbKeyH) return this.handleKey('Backspace');
    if (tx>=WIDTH-115&&tx<=WIDTH-35&&ty>=this._kbLastY&&ty<=this._kbLastY+this._kbKeyH) return this.handleKey('Enter');
    return null;
  }
}

class RankingScreen {
  constructor() { this.entries=[]; this.highlightIndex=-1; }
  load() { try { const r=localStorage.getItem(RANKING_KEY); this.entries=r?JSON.parse(r):[]; } catch(e){ this.entries=[]; } }
  save() { try { localStorage.setItem(RANKING_KEY, JSON.stringify(this.entries.slice(0,RANKING_MAX))); } catch(e){} }
  addScore(name, score) {
    this.load();
    this.entries.push({ name, score, date:new Date().toLocaleDateString('th-TH') });
    this.entries.sort((a,b)=>b.score-a.score);
    this.entries=this.entries.slice(0,RANKING_MAX);
    this.highlightIndex=this.entries.findIndex(e=>e.name===name&&e.score===score);
    this.save();
  }
  draw(ctx) {
    const g = ctx.createLinearGradient(0,0,0,HEIGHT);
    g.addColorStop(0,'#FFF8E1'); g.addColorStop(1,'#FFE082');
    ctx.fillStyle=g; ctx.fillRect(0,0,WIDTH,HEIGHT);

    // Panel
    ctx.fillStyle=COL.PANEL_BG;
    _rr(ctx,20,40,WIDTH-40,HEIGHT-80,16); ctx.fill();
    ctx.strokeStyle=COL.PANEL_BORDER; ctx.lineWidth=2;
    _rr(ctx,20,40,WIDTH-40,HEIGHT-80,16); ctx.stroke();

    ctx.font='26px '+FONT.MAIN; ctx.fillStyle=COL.GOLD; ctx.textAlign='center';
    ctx.fillText('🏆 TOP 10 🏆', WIDTH/2, 78);

    const tx=35, tw=WIDTH-70;
    let y=108;
    ctx.font='10px '+FONT.BODY; ctx.fillStyle=COL.HUD_TEXT; ctx.textAlign='left';
    ctx.fillText('#', tx, y); ctx.fillText('ชื่อ', tx+30, y);
    ctx.textAlign='right'; ctx.fillText('คะแนน', tx+tw, y);
    y+=18;

    for (let i=0;i<RANKING_MAX;i++) {
      const isMe=i===this.highlightIndex;
      if (isMe) { ctx.fillStyle='rgba(255,213,79,0.25)'; _rr(ctx,tx-4,y-14,tw+8,26,6); ctx.fill(); }
      const e=this.entries[i], rank=i+1;
      ctx.font='13px '+FONT.MAIN; ctx.textAlign='left';
      ctx.fillStyle = rank===1?'#FFD700':rank===2?'#C0C0C0':rank===3?'#CD7F32': isMe?COL.PRIMARY_D:'rgba(93,64,55,0.5)';
      ctx.fillText(rank+'.', tx, y);
      if (e) {
        ctx.fillStyle = isMe?COL.HUD_TEXT:'rgba(93,64,55,0.8)';
        ctx.fillText(e.name, tx+30, y);
        ctx.textAlign='right';
        ctx.fillStyle = isMe?COL.GOLD:COL.PRIMARY_D;
        ctx.fillText(e.score.toLocaleString(), tx+tw, y);
      } else {
        ctx.fillStyle='rgba(93,64,55,0.25)'; ctx.fillText('---', tx+30, y);
        ctx.textAlign='right'; ctx.fillText('-', tx+tw, y);
      }
      y+=30;
    }
    ctx.font='13px '+FONT.BODY; ctx.fillStyle=COL.HUD_TEXT; ctx.textAlign='center';
    ctx.globalAlpha=0.5+Math.sin(Date.now()/300)*0.5;
    ctx.fillText('แตะหรือกด A เพื่อเล่นอีกครั้ง', WIDTH/2, HEIGHT-50);
    ctx.globalAlpha=1;
  }
}

// ── Shared round-rect helper ──
function _rr(ctx,x,y,w,h,r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}
