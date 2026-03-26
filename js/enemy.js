// ═══════════════════════════════════════════════════
//  js/enemy.js — Tiny Guardian — Enemy AI + image support
// ═══════════════════════════════════════════════════

class EnemyUnit {
  constructor(type, x, y, world) {
    const def = ENEMY[type];
    this.type = type;
    this.def = def;
    this.x = x; this.y = y;
    this.w = def.w; this.h = def.h;
    this.hp = 1;
    this.speed = def.speed;
    this.points = def.points;
    this.facing = Math.random() < 0.5 ? 1 : -1;
    this.vy = 0;
    this.grounded = false;
    this.alive = true;
    this.dying = false;
    this.dieTimer = 0;
    this.aiType = def.type;
    this.shootsProj = def.shoots || false;
    this.shootTimer = 3000 + Math.random() * 2000;
    this.aliveTime = 0;
    this.angry = false;
    this.baseY = y;
    this.flyAngle = Math.random() * Math.PI * 2;
    this.flyAmpY = 30 + Math.random() * 40;
    this.world = world;
  }

  update(dt, world, game) {
    if (this.dying) { this.dieTimer -= dt; if (this.dieTimer <= 0) this.alive = false; return; }
    this.aliveTime += dt * 1000;
    if (!this.angry && this.aliveTime > ANGRY_TIME_MS) {
      this.angry = true;
      this.speed = this.def.speed * ANGRY_SPEED_MULT;
    }
    if (this.aiType === 'ground') this._aiGround(dt, world);
    else if (this.aiType === 'fly') this._aiFly(dt);
    else if (this.aiType === 'bounce') this._aiBounce(dt, world);
    if (this.shootsProj && game) {
      this.shootTimer -= dt * 1000;
      if (this.shootTimer <= 0) {
        this.shootTimer = 3000 + Math.random() * 2000;
        game.projManager.addEnemyBullet(this.x+this.w/2, this.y+this.h/2, this.facing*120, 0, 'normal');
      }
    }
  }

  _aiGround(dt, world) {
    if (!this.grounded) this.vy += GRAVITY * dt;
    this.x += this.speed * this.facing * dt;
    this.y += this.vy * dt;
    this.grounded = false;
    if (this.vy >= 0) {
      const surfaces = world.getAllSurfaces();
      for (const p of surfaces) {
        const feetY = this.y + this.h;
        if (feetY >= p.y && feetY <= p.y + 16 && this.x+this.w-2 > p.x && this.x+2 < p.x+p.w) {
          this.y = p.y - this.h; this.vy = 0; this.grounded = true;
          const leftEdge = this.x < p.x+2, rightEdge = this.x+this.w > p.x+p.w-2;
          if ((leftEdge && this.facing===-1)||(rightEdge && this.facing===1)) {
            if (Math.random()<0.6) this.facing *= -1;
          }
          break;
        }
      }
    }
    if (this.grounded && Math.random() < (this.angry?0.50:0.30)*dt) {
      this.vy = -520 - (this.angry?120:0); this.grounded = false;
    }
    if (this.y > PLAY_BOTTOM+20) {
      const plats = world.platforms;
      if (plats.length>0) { const h=plats.reduce((a,b)=>a.y<b.y?a:b); this.x=h.x+Math.random()*Math.max(0,h.w-this.w); this.y=h.y-this.h-10; this.vy=0; }
    }
    if (this.x<0){this.x=0;this.facing=1;} if(this.x+this.w>WIDTH){this.x=WIDTH-this.w;this.facing=-1;}
  }

  _aiFly(dt) {
    this.flyAngle += dt*(this.angry?2.5:1.5);
    this.x += this.speed*this.facing*dt;
    this.y = this.baseY + Math.sin(this.flyAngle)*this.flyAmpY;
    if(this.x<0){this.x=0;this.facing=1;} if(this.x+this.w>WIDTH){this.x=WIDTH-this.w;this.facing=-1;}
    if(this.y<PLAY_TOP) this.y=PLAY_TOP; if(this.y+this.h>GROUND_Y) this.y=GROUND_Y-this.h;
  }

  _aiBounce(dt, world) {
    this.vy += GRAVITY*dt; this.x += this.speed*this.facing*dt; this.y += this.vy*dt;
    const surfaces = world.getAllSurfaces();
    for (const p of surfaces) {
      if(this.vy>=0){const fY=this.y+this.h; if(fY>=p.y&&fY<=p.y+16&&this.x+this.w>p.x+2&&this.x<p.x+p.w-2){this.y=p.y-this.h;this.vy=-450-(this.angry?80:0);break;}}
    }
    if(this.y>PLAY_BOTTOM+20){const plats=world.platforms;if(plats.length>0){const h=plats.reduce((a,b)=>a.y<b.y?a:b);this.x=h.x+Math.random()*Math.max(0,h.w-this.w);this.y=h.y-this.h-10;this.vy=0;}}
    if(this.x<0){this.x=0;this.facing=1;} if(this.x+this.w>WIDTH){this.x=WIDTH-this.w;this.facing=-1;}
  }

  takeDamage(dmg) { this.hp -= dmg; if (this.hp <= 0) { this.dying = true; this.dieTimer = 0.3; } }

  draw(ctx, images) {
    if (!this.alive) return;
    ctx.save();
    if (this.dying) {
      ctx.globalAlpha = this.dieTimer/0.3;
      const s = 1+(1-this.dieTimer/0.3)*0.5;
      ctx.translate(this.x+this.w/2, this.y+this.h/2); ctx.scale(s,s); ctx.translate(-this.w/2,-this.h/2);
    } else {
      ctx.translate(this.x, this.y);
    }

    // Try image first
    const imgKey = this.def.imgKey;
    if (images && imgKey && images[imgKey]) {
      if (this.facing < 0) { ctx.translate(this.w, 0); ctx.scale(-1, 1); }
      ctx.drawImage(images[imgKey], 0, 0, this.w, this.h);
      if (this.angry) { ctx.fillStyle = 'rgba(239,83,80,0.3)'; ctx.fillRect(0, 0, this.w, this.h); }
    } else {
      // Fallback: programmatic draw
      const col = this.angry ? '#EF5350' : this.def.color;
      ctx.fillStyle = col;
      const r = 8;
      ctx.beginPath();
      ctx.moveTo(r,0);ctx.lineTo(this.w-r,0);ctx.quadraticCurveTo(this.w,0,this.w,r);
      ctx.lineTo(this.w,this.h-r);ctx.quadraticCurveTo(this.w,this.h,this.w-r,this.h);
      ctx.lineTo(r,this.h);ctx.quadraticCurveTo(0,this.h,0,this.h-r);
      ctx.lineTo(0,r);ctx.quadraticCurveTo(0,0,r,0);ctx.fill();
      // Eyes
      ctx.fillStyle='#FFF';ctx.beginPath();
      ctx.arc(this.w*0.35,this.h*0.35,5,0,Math.PI*2);ctx.arc(this.w*0.65,this.h*0.35,5,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=COL.COCOA;ctx.beginPath();
      ctx.arc(this.w*0.35+this.facing*2,this.h*0.35,2.5,0,Math.PI*2);ctx.arc(this.w*0.65+this.facing*2,this.h*0.35,2.5,0,Math.PI*2);ctx.fill();
      if(this.angry){ctx.strokeStyle=COL.COCOA;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(this.w*0.2,this.h*0.2);ctx.lineTo(this.w*0.4,this.h*0.28);ctx.moveTo(this.w*0.8,this.h*0.2);ctx.lineTo(this.w*0.6,this.h*0.28);ctx.stroke();}
      ctx.font=(this.w*0.45)+'px '+FONT.BODY;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(this.def.emoji, this.w/2, this.h*0.7);
    }
    ctx.restore();
  }

  getHitbox() { return {x:this.x+3,y:this.y+3,w:this.w-6,h:this.h-6}; }
}

class EnemyManager {
  constructor() { this.enemies=[]; }
  reset() { this.enemies=[]; }
  spawnWave(waveData, world) {
    for(const entry of waveData){const def=ENEMY[entry.t];if(!def)continue;
      for(let i=0;i<entry.n;i++){const plats=world.platforms;if(!plats.length)continue;
        const p=plats[Math.floor(Math.random()*plats.length)];
        this.enemies.push(new EnemyUnit(entry.t,p.x+Math.random()*Math.max(0,p.w-def.w),p.y-def.h,world));
    }}
  }
  spawnSingle(type,x,y,world){this.enemies.push(new EnemyUnit(type,x,y,world));}
  update(dt,world,game){for(const e of this.enemies)e.update(dt,world,game);this.enemies=this.enemies.filter(e=>e.alive);}
  draw(ctx,images){for(const e of this.enemies)e.draw(ctx,images);}
  get aliveCount(){return this.enemies.filter(e=>!e.dying).length;}
}
