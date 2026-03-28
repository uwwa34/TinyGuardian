// ═══════════════════════════════════════════════════
//  js/enemy.js — Tiny Guardian
// ═══════════════════════════════════════════════════
class EnemyUnit {
  constructor(type,x,y){
    const def=ENEMY[type];this.type=type;this.def=def;
    this.x=x;this.y=y;this.w=def.w;this.h=def.h;this.hp=1;
    this.speed=def.speed;this.points=def.points;
    this.facing=Math.random()<0.5?1:-1;this.vy=0;this.grounded=false;
    this.alive=true;this.dying=false;this.dieTimer=0;
    this.aiType=def.type;this.shootsProj=def.shoots||false;
    this.shootTimer=3000+Math.random()*2000;
    this.aliveTime=0;this.angry=false;
    this.baseY=y;this.flyAngle=Math.random()*Math.PI*2;this.flyAmpY=30+Math.random()*40;
    this.spawnShield=800; // 0.8s immune to contact
  }
  update(dt,world,game){
    if(this.dying){this.dieTimer-=dt;if(this.dieTimer<=0)this.alive=false;return;}
    if(this.spawnShield>0)this.spawnShield-=dt*1000;
    this.aliveTime+=dt*1000;
    if(!this.angry&&this.aliveTime>ANGRY_TIME_MS){this.angry=true;this.speed=this.def.speed*ANGRY_SPEED_MULT;}
    if(this.aiType==='ground')this._aiGround(dt,world);
    else if(this.aiType==='fly')this._aiFly(dt);
    else if(this.aiType==='bounce')this._aiBounce(dt,world);
    if(this.shootsProj&&game){this.shootTimer-=dt*1000;if(this.shootTimer<=0){this.shootTimer=3000+Math.random()*2000;game.projManager.addEnemyBullet(this.x+this.w/2,this.y+this.h/2,this.facing*120,0,'normal');}}
  }
  _aiGround(dt,world){
    if(!this.grounded)this.vy+=GRAVITY*dt;
    this.x+=this.speed*this.facing*dt;this.y+=this.vy*dt;this.grounded=false;
    if(this.vy>=0){for(const p of world.getAllSurfaces()){const fY=this.y+this.h;if(fY>=p.y&&fY<=p.y+16&&this.x+this.w-2>p.x&&this.x+2<p.x+p.w){this.y=p.y-this.h;this.vy=0;this.grounded=true;if((this.x<p.x+2&&this.facing===-1)||(this.x+this.w>p.x+p.w-2&&this.facing===1)){if(Math.random()<0.6)this.facing*=-1;}break;}}}
    if(this.grounded&&Math.random()<(this.angry?0.50:0.30)*dt){this.vy=-520-(this.angry?120:0);this.grounded=false;}
    if(this.y>PLAY_BOTTOM+20){const pl=world.platforms;if(pl.length>0){const h=pl.reduce((a,b)=>a.y<b.y?a:b);this.x=h.x+Math.random()*Math.max(0,h.w-this.w);this.y=h.y-this.h-10;this.vy=0;}}
    if(this.x<0){this.x=0;this.facing=1;}if(this.x+this.w>WIDTH){this.x=WIDTH-this.w;this.facing=-1;}
  }
  _aiFly(dt){
    this.flyAngle+=dt*(this.angry?2.5:1.5);this.x+=this.speed*this.facing*dt;
    this.y=this.baseY+Math.sin(this.flyAngle)*this.flyAmpY;
    if(this.x<0){this.x=0;this.facing=1;}if(this.x+this.w>WIDTH){this.x=WIDTH-this.w;this.facing=-1;}
    if(this.y<PLAY_TOP)this.y=PLAY_TOP;if(this.y+this.h>GROUND_Y)this.y=GROUND_Y-this.h;
  }
  _aiBounce(dt,world){
    this.vy+=GRAVITY*dt;this.x+=this.speed*this.facing*dt;this.y+=this.vy*dt;
    for(const p of world.getAllSurfaces()){if(this.vy>=0){const fY=this.y+this.h;if(fY>=p.y&&fY<=p.y+16&&this.x+this.w>p.x+2&&this.x<p.x+p.w-2){this.y=p.y-this.h;this.vy=-450-(this.angry?80:0);break;}}}
    if(this.y>PLAY_BOTTOM+20){const pl=world.platforms;if(pl.length>0){const h=pl.reduce((a,b)=>a.y<b.y?a:b);this.x=h.x+Math.random()*Math.max(0,h.w-this.w);this.y=h.y-this.h-10;this.vy=0;}}
    if(this.x<0){this.x=0;this.facing=1;}if(this.x+this.w>WIDTH){this.x=WIDTH-this.w;this.facing=-1;}
  }
  takeDamage(dmg){this.hp-=dmg;if(this.hp<=0){this.dying=true;this.dieTimer=0.3;}}

  draw(ctx,images){
    if(!this.alive)return;
    ctx.save();
    const t=Date.now()/1000;
    let bobY=0,lean=0;
    if(this.aiType==='ground'&&this.grounded){bobY=Math.sin(t*this.speed*0.08)*3;lean=Math.sin(t*this.speed*0.08)*0.07*this.facing;}
    else if(this.aiType==='fly'){lean=Math.sin(t*2.5)*0.1;}

    // Angry = blink the whole character (no red rect!)
    if(this.angry&&Math.floor(t*6)%4===0)ctx.globalAlpha=0.35;

    if(this.dying){
      ctx.globalAlpha=this.dieTimer/0.3;const s=1+(1-this.dieTimer/0.3)*0.5;
      ctx.translate(this.x+this.w/2,this.y+this.h/2);ctx.scale(s,s);ctx.translate(-this.w/2,-this.h/2);
    } else {
      ctx.translate(this.x,this.y+bobY);
      if(lean){ctx.translate(this.w/2,this.h);ctx.rotate(lean);ctx.translate(-this.w/2,-this.h);}
      if(this.aiType==='bounce'){const sy=this.vy>100?0.85:(this.vy<-100?1.15:1.0);const sx=2-sy;ctx.translate(this.w/2,this.h);ctx.scale(sx,sy);ctx.translate(-this.w/2,-this.h);}
    }

    // Spawn shield visual — semi-transparent
    if(this.spawnShield>0)ctx.globalAlpha*=0.5;

    const imgKey=this.def.imgKey;
    if(images&&imgKey&&images[imgKey]){
      const img=images[imgKey];
      if(this.facing<0){ctx.translate(this.w,0);ctx.scale(-1,1);}
      const srcW=img.width>img.height*1.3?img.height:img.width;
      ctx.drawImage(img,0,0,srcW,img.height,0,0,this.w,this.h);
    } else {
      const col=this.angry?'#EF5350':this.def.color;
      ctx.fillStyle=col;const r=10;
      ctx.beginPath();ctx.moveTo(r,0);ctx.lineTo(this.w-r,0);ctx.quadraticCurveTo(this.w,0,this.w,r);ctx.lineTo(this.w,this.h-r);ctx.quadraticCurveTo(this.w,this.h,this.w-r,this.h);ctx.lineTo(r,this.h);ctx.quadraticCurveTo(0,this.h,0,this.h-r);ctx.lineTo(0,r);ctx.quadraticCurveTo(0,0,r,0);ctx.fill();
      ctx.fillStyle='#FFF';ctx.beginPath();ctx.arc(this.w*0.35,this.h*0.35,6,0,Math.PI*2);ctx.arc(this.w*0.65,this.h*0.35,6,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=COL.COCOA;ctx.beginPath();ctx.arc(this.w*0.35+this.facing*2,this.h*0.35,3,0,Math.PI*2);ctx.arc(this.w*0.65+this.facing*2,this.h*0.35,3,0,Math.PI*2);ctx.fill();
      if(this.angry){ctx.strokeStyle=COL.COCOA;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(this.w*0.2,this.h*0.18);ctx.lineTo(this.w*0.42,this.h*0.26);ctx.moveTo(this.w*0.8,this.h*0.18);ctx.lineTo(this.w*0.58,this.h*0.26);ctx.stroke();}
      ctx.font=(this.w*0.45)+'px '+FONT.BODY;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(this.def.emoji,this.w/2,this.h*0.7);
    }
    ctx.restore();
  }
  getHitbox(){
    if(this.spawnShield>0)return{x:0,y:0,w:0,h:0};
    return{x:this.x+3,y:this.y+3,w:this.w-6,h:this.h-6};
  }
}

class EnemyManager {
  constructor(){this.enemies=[];}
  reset(){this.enemies=[];}
  spawnWave(waveData,world,player){
    const px=player?player.x+player.w/2:WIDTH/2;
    const py=player?player.y+player.h/2:GROUND_Y;
    for(const entry of waveData){const def=ENEMY[entry.t];if(!def)continue;
      for(let i=0;i<entry.n;i++){
        const plats=world.platforms;if(!plats.length)continue;
        // Filter platforms that are far enough from player
        const safePlats=plats.filter(p=>{
          const cx=p.x+p.w/2,cy=p.y;
          return Math.sqrt((cx-px)**2+(cy-py)**2)>120;
        });
        const pool=safePlats.length>0?safePlats:plats;
        const p=pool[Math.floor(Math.random()*pool.length)];
        const ex=p.x+Math.random()*Math.max(0,p.w-def.w);
        this.enemies.push(new EnemyUnit(entry.t,ex,p.y-def.h));
    }}
  }
  spawnSingle(type,x,y,world){this.enemies.push(new EnemyUnit(type,x,y));}
  update(dt,world,game){for(const e of this.enemies)e.update(dt,world,game);this.enemies=this.enemies.filter(e=>e.alive);}
  draw(ctx,images){for(const e of this.enemies)e.draw(ctx,images);}
  get aliveCount(){return this.enemies.filter(e=>!e.dying).length;}
}
