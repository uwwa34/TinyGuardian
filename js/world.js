// ═══════════════════════════════════════════════════
//  js/world.js — Tiny Guardian — Platforms + disappearing
// ═══════════════════════════════════════════════════

class Platform {
  constructor(x, y, w, opts) {
    this.x = x; this.y = y; this.w = w; this.h = 14;
    opts = opts || {};
    // Moving
    this.moving = !!opts.moving;
    this.baseX = x; this.moveRange = opts.moveRange||0; this.moveSpeed = opts.moveSpeed||0; this.moveDir = 1;
    // Disappearing
    this.disappear = !!opts.disappear;
    this.onTime = opts.onTime || 3000;   // ms visible
    this.offTime = opts.offTime || 1500; // ms hidden
    this.phase = opts.phase || 0;        // start offset
    this.disTimer = this.phase;
    this.visible = true;
    this.blinking = false;
  }

  update(dt) {
    if (this.moving) {
      this.x += this.moveSpeed * this.moveDir * dt;
      if (this.x > this.baseX + this.moveRange) this.moveDir = -1;
      if (this.x < this.baseX) this.moveDir = 1;
    }
    if (this.disappear) {
      this.disTimer += dt * 1000;
      const cycle = this.onTime + this.offTime;
      const t = this.disTimer % cycle;
      this.visible = t < this.onTime;
      // Blink warning 500ms before disappearing
      this.blinking = this.visible && t > this.onTime - 500;
    }
  }

  get solid() { return !this.disappear || this.visible; }

  draw(ctx, col) {
    if (this.disappear && !this.visible) return;
    const alpha = this.blinking ? (Math.floor(Date.now()/80)%2===0 ? 0.4 : 0.9) : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = col;
    const r = 7;
    ctx.beginPath();
    ctx.moveTo(this.x+r,this.y);ctx.lineTo(this.x+this.w-r,this.y);
    ctx.quadraticCurveTo(this.x+this.w,this.y,this.x+this.w,this.y+r);
    ctx.lineTo(this.x+this.w,this.y+this.h);ctx.lineTo(this.x,this.y+this.h);
    ctx.lineTo(this.x,this.y+r);ctx.quadraticCurveTo(this.x,this.y,this.x+r,this.y);
    ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.35)';
    ctx.fillRect(this.x+4,this.y+1,this.w-8,3);
    ctx.restore();
  }
}

class World {
  constructor() {
    this.platforms = []; this.stage = 1;
    this.cloudOffsets = [];
    for (let i=0;i<5;i++) this.cloudOffsets.push({x:Math.random()*WIDTH,y:PLAY_TOP+10+Math.random()*80,s:0.5+Math.random()*0.6,spd:8+Math.random()*12});
  }

  loadStage(stageNum) {
    this.stage = stageNum; this.platforms = [];
    const presets = PLAT_PRESETS[stageNum] || PLAT_PRESETS[1];
    for (const p of presets) {
      this.platforms.push(new Platform(p.x, p.y, p.w, p));
    }
  }

  update(dt) {
    for (const p of this.platforms) p.update(dt);
    for (const c of this.cloudOffsets) { c.x+=c.spd*dt; if(c.x>WIDTH+60)c.x=-60; }
  }

  drawBackground(ctx, images) {
    const sc = STAGE_COL[this.stage];
    const playH = GROUND_Y - PLAY_TOP;
    const bgKey = 'bg_stage'+this.stage;
    const bgImg = images && (images[bgKey]||images.background);
    if (bgImg) {
      ctx.globalAlpha=0.55;ctx.drawImage(bgImg,0,PLAY_TOP,WIDTH,playH);ctx.globalAlpha=1;
      ctx.fillStyle=sc.bg;ctx.globalAlpha=0.35;ctx.fillRect(0,PLAY_TOP,WIDTH,playH);ctx.globalAlpha=1;
    } else {
      const grad=ctx.createLinearGradient(0,PLAY_TOP,0,GROUND_Y);grad.addColorStop(0,sc.bg);grad.addColorStop(1,sc.bg2);
      ctx.fillStyle=grad;ctx.fillRect(0,PLAY_TOP,WIDTH,playH);
      ctx.fillStyle='rgba(255,255,255,0.5)';
      for(const c of this.cloudOffsets) this._drawCloud(ctx,c.x,c.y,28*c.s);
      this._drawStageDecor(ctx);
    }
    ctx.fillStyle=sc.ground;ctx.fillRect(0,GROUND_Y,WIDTH,HEIGHT-GROUND_Y);
    ctx.fillStyle='rgba(255,255,255,0.2)';ctx.fillRect(0,GROUND_Y,WIDTH,4);
    ctx.fillStyle='rgba(255,255,255,0.15)';
    for(let gx=10;gx<WIDTH;gx+=30){ctx.beginPath();ctx.arc(gx,GROUND_Y+2,3,0,Math.PI*2);ctx.fill();}
  }

  _drawCloud(ctx,cx,cy,r){ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.arc(cx-r*0.7,cy+r*0.2,r*0.7,0,Math.PI*2);ctx.arc(cx+r*0.7,cy+r*0.2,r*0.7,0,Math.PI*2);ctx.fill();}

  _drawStageDecor(ctx){
    const s=this.stage;ctx.save();
    if(s===1){ctx.fillStyle='rgba(255,255,255,0.15)';for(let i=0;i<4;i++)ctx.fillRect(40+i*90,GROUND_Y-60,30,40);}
    else if(s===2){ctx.strokeStyle='#FFB74D';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(20,PLAY_TOP+40);ctx.lineTo(WIDTH-20,PLAY_TOP+40);ctx.stroke();const fc=['#EF5350','#FFD54F','#66BB6A','#42A5F5','#AB47BC'];for(let i=0;i<12;i++){const fx=30+i*30;ctx.fillStyle=fc[i%fc.length];ctx.beginPath();ctx.moveTo(fx,PLAY_TOP+40);ctx.lineTo(fx+12,PLAY_TOP+40);ctx.lineTo(fx+6,PLAY_TOP+58);ctx.closePath();ctx.fill();}}
    else if(s===3){const ll=[[60,GROUND_Y-10],[180,GROUND_Y-10],[310,GROUND_Y-10]];for(const[lx,ly]of ll){ctx.fillStyle='rgba(206,147,216,0.3)';ctx.fillRect(lx-2,ly-50,4,50);ctx.beginPath();ctx.arc(lx,ly-55,16,0,Math.PI*2);ctx.fillStyle='rgba(248,187,208,0.4)';ctx.fill();}}
    else if(s===4){ctx.fillStyle='rgba(255,215,0,0.25)';ctx.beginPath();ctx.arc(WIDTH-60,PLAY_TOP+45,22,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(255,255,255,0.3)';const st=[[40,PLAY_TOP+20],[120,PLAY_TOP+35],[200,PLAY_TOP+15],[280,PLAY_TOP+30],[340,PLAY_TOP+25]];for(const[sx,sy]of st){ctx.beginPath();ctx.arc(sx,sy,2,0,Math.PI*2);ctx.fill();}}
    ctx.restore();
  }

  drawPlatforms(ctx, images) {
    const sc=STAGE_COL[this.stage];
    for(const p of this.platforms) {
      if(images&&images.platform){
        if(!p.solid)continue;
        const alpha=p.blinking?(Math.floor(Date.now()/80)%2===0?0.4:0.9):1;
        ctx.save();ctx.globalAlpha=alpha;
        const imgH=p.h;
        for(let tx=p.x;tx<p.x+p.w;tx+=images.platform.width){const dw=Math.min(images.platform.width,p.x+p.w-tx);ctx.drawImage(images.platform,0,0,dw,images.platform.height,tx,p.y,dw,imgH);}
        ctx.restore();
      } else {
        p.draw(ctx,sc.platform);
      }
    }
  }

  // Only return solid platforms for collision
  getAllSurfaces() {
    const solid = this.platforms.filter(p => p.solid);
    solid.push({x:0, y:GROUND_Y, w:WIDTH, h:GROUND_H, moving:false, solid:true});
    return solid;
  }
}
