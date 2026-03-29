// ═══════════════════════════════════════════════════
//  js/boss.js  —  Tiny Guardian
//  Mini Boss (stage 3) + Final Boss (stage 4, Diet Go Go)
// ═══════════════════════════════════════════════════

class BossUnit {
  constructor(config, x, y, isFinal) {
    this.cfg = config;
    this.x = x;
    this.y = y;
    this.w = config.w;
    this.h = config.h;
    this.hp = config.hp;
    this.maxHp = config.hp;
    this.speed = config.speed;
    this.points = config.points;
    this.facing = -1;
    this.vy = 0;
    this.grounded = false;
    this.alive = true;
    this.dying = false;
    this.dieTimer = 0;
    this.isFinal = isFinal;

    // State machine
    this.state = 'idle';       // idle, move, attack, jump
    this.stateTimer = 1500;    // ms before first action
    this.attackTimer = 0;
    this.spawnTimer = this.isFinal ? BOSS.p1SpawnInterval : 99999;

    // Phase (final boss only)
    this.phase = 1;

    // Shake effect
    this.shakeTimer = 0;

    // Flash on hit
    this.flashTimer = 0;
  }

  get isAngry() {
    if (this.isFinal) return this.phase >= 3;
    return this.hp <= this.cfg.angryHp;
  }

  get currentSpeed() {
    if (this.isFinal) {
      if (this.phase === 3) return BOSS.p3Speed;
      if (this.phase === 2) return BOSS.p2Speed;
      return this.cfg.speed;
    }
    return this.isAngry ? this.cfg.angrySpeed : this.cfg.speed;
  }

  update(dt, world, player, game) {
    if (this.dying) {
      this.dieTimer -= dt;
      if (this.dieTimer <= 0) this.alive = false;
      return;
    }

    // Flash
    if (this.flashTimer > 0) this.flashTimer -= dt * 1000;

    // Phase check (final boss)
    if (this.isFinal) {
      if (this.hp <= BOSS.phase3hp) this.phase = 3;
      else if (this.hp <= BOSS.phase2hp) this.phase = 2;
      else this.phase = 1;
    }

    // Gravity
    if (!this.grounded) {
      this.vy += GRAVITY * dt;
    }

    // State machine
    this.stateTimer -= dt * 1000;
    if (this.stateTimer <= 0) {
      this._nextAction(player, game, world);
    }

    // Execute current state
    if (this.state === 'move') {
      this.facing = player.x + player.w/2 > this.x + this.w/2 ? 1 : -1;
      this.x += this.currentSpeed * this.facing * dt;
    } else if (this.state === 'attack') {
      // Stand still during attack
    } else if (this.state === 'jump') {
      // Gentle drift while jumping
      this.x += this.currentSpeed * 0.3 * this.facing * dt;
    }

    // Apply gravity
    this.y += this.vy * dt;

    // Platform collision
    this._resolvePlatforms(world);

    // Wall clamp
    if (this.x < 0) { this.x = 0; this.facing = 1; }
    if (this.x + this.w > WIDTH) { this.x = WIDTH - this.w; this.facing = -1; }

    // Spawn minions (both mini boss and final boss)
    if (game) {
      this.spawnTimer -= dt * 1000;
      let interval, count;
      if (this.isFinal) {
        interval = this.phase === 3 ? BOSS.p3SpawnInterval :
                   this.phase === 2 ? BOSS.p2SpawnInterval : BOSS.p1SpawnInterval;
        count = this.phase >= 2 ? BOSS.p2SpawnCount : BOSS.p1SpawnCount;
      } else {
        // Mini boss spawns 1 enemy every 10s (angry: 7s)
        interval = this.isAngry ? 7000 : 10000;
        count = 1;
      }
      if (this.spawnTimer <= 0) {
        this.spawnTimer = interval;
        const types = this.isFinal ? ['ERASER','CLOWN','CANDY'] : ['ERASER','CANDY'];
        for (let i = 0; i < count; i++) {
          const sx = Math.random() * (WIDTH - 40);
          const et = types[Math.floor(Math.random() * types.length)];
          game.enemyManager.spawnSingle(et, sx, PLAY_TOP + 10, world);
        }
      }

      // Drop heart occasionally (final boss phase 2+)
      if (this.isFinal && this.phase >= 2 && Math.random() < 0.008 * dt) {
        game.itemManager.spawnItem('HEART', this.x + this.w / 2, this.y + this.h);
      }
    }

    // Shake
    if (this.shakeTimer > 0) this.shakeTimer -= dt * 1000;
  }

  _nextAction(player, game, world) {
    const actions = this.isFinal ? this._bossActions(player) : this._miniBossActions(player);
    const action = actions[Math.floor(Math.random() * actions.length)];

    // Face player
    this.facing = player.x + player.w/2 > this.x + this.w/2 ? 1 : -1;

    if (action === 'move') {
      this.state = 'move';
      this.stateTimer = 1200 + Math.random() * 1000;
    } else if (action === 'jump') {
      this.state = 'jump';
      this.vy = -600 - (this.isAngry ? 80 : 0);
      this.grounded = false;
      this.stateTimer = 800;
    } else if (action === 'attack') {
      this.state = 'attack';
      this.shakeTimer = 300;
      this._doAttack(player, game);
      this.stateTimer = this.isAngry ? 1200 : 1800;
    } else {
      this.state = 'idle';
      this.stateTimer = 600 + Math.random() * 500;
    }
  }

  _miniBossActions(player) {
    if (this.isAngry) return ['move','attack','jump','attack','move','idle'];
    return ['move','attack','idle','jump','move','idle'];
  }

  _bossActions(player) {
    if (this.phase === 3) return ['move','attack','jump','attack','move','jump'];
    if (this.phase === 2) return ['move','jump','attack','idle','move','attack'];
    return ['idle','attack','move','idle','move','attack'];
  }

  _doAttack(player, game) {
    if (!game) return;
    let count;
    if (this.isFinal) {
      count = this.phase === 3 ? BOSS.p3FoodCount :
              this.phase === 2 ? BOSS.p2FoodCount : BOSS.p1FoodCount;
    } else {
      count = this.isAngry ? this.cfg.angryShootCount : this.cfg.shootCount;
    }

    const cx = this.x + this.w / 2;
    const cy = this.y + this.h * 0.3;

    // Aim toward player
    const dx = (player.x + player.w/2) - cx;
    const dy = (player.y + player.h/2) - cy;
    const baseAngle = Math.atan2(dy, dx);

    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) / 2) * 0.25;
      const angle = baseAngle + spread;
      const spd = 140 + Math.random() * 60;
      const vx = Math.cos(angle) * spd;
      const vy = Math.sin(angle) * spd;
      game.projManager.addEnemyBullet(cx, cy, vx, vy, 'normal');
    }
  }

  _resolvePlatforms(world) {
    const surfaces = world.getAllSurfaces();
    this.grounded = false;
    for (const p of surfaces) {
      if (this.vy >= 0) {
        const feetY = this.y + this.h;
        if (feetY >= p.y && feetY <= p.y + 20 &&
            this.x + this.w > p.x && this.x < p.x + p.w) {
          this.y = p.y - this.h;
          this.vy = 0;
          this.grounded = true;
          break;
        }
      }
    }
    // Don't fall below screen
    if (this.y + this.h > PLAY_BOTTOM) {
      this.y = GROUND_Y - this.h;
      this.vy = 0;
      this.grounded = true;
    }
  }

  takeDamage(dmg, game) {
    this.hp -= dmg;
    this.flashTimer = 150;
    if (game) game.playSfx('boss_hit');
    if (this.hp <= 0) {
      this.dying = true;
      this.dieTimer = 1.0;
    }
  }

  draw(ctx, images) {
    if (!this.alive) return;
    ctx.save();

    const shakeX = this.shakeTimer > 0 ? (Math.random()-0.5)*6 : 0;
    const shakeY = this.shakeTimer > 0 ? (Math.random()-0.5)*4 : 0;
    let dx = this.x + shakeX;
    let dy = this.y + shakeY;

    // Walk bob animation
    const t = Date.now()/1000;
    let bobY = 0, lean = 0;
    if (!this.dying && this.grounded && this.state === 'move') {
      bobY = Math.sin(t * this.currentSpeed * 0.06) * 4;
      lean = Math.sin(t * this.currentSpeed * 0.06) * 0.05 * this.facing;
    }

    // Flash = blink via globalAlpha (no rect!)
    if (this.flashTimer > 0 && Math.floor(this.flashTimer/50)%2===0) {
      ctx.globalAlpha = 0.3;
    }
    // Angry = periodic blink (no rect!)
    if (this.isAngry && Math.floor(t*5)%3===0) {
      ctx.globalAlpha *= 0.4;
    }

    if (this.dying) {
      ctx.globalAlpha = this.dieTimer;
      const scale = 1+(1-this.dieTimer)*0.8;
      ctx.translate(dx+this.w/2, dy+this.h/2);
      ctx.scale(scale,scale);
      ctx.translate(-this.w/2,-this.h/2);
      dx=0; dy=0;
    } else {
      // Apply bob + lean
      ctx.translate(dx, dy + bobY);
      if (lean) { ctx.translate(this.w/2,this.h); ctx.rotate(lean); ctx.translate(-this.w/2,-this.h); }
      dx=0; dy=0;
    }

    // Try image
    const imgKey = this.isFinal ? 'boss' : 'miniboss';
    if (images && images[imgKey]) {
      const img = images[imgKey];
      if (this.facing < 0 && !this.dying) {
        ctx.translate(this.w,0); ctx.scale(-1,1);
      }
      ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, this.w, this.h);
    } else {
      // Fallback programmatic
      const col = this.flashTimer > 0 ? '#FFF' :
                  this.isAngry ? (this.cfg.angryColor||'#EF5350') :
                  (this.cfg.color||'#9575CD');
      ctx.fillStyle = col;
      const r=12;
      ctx.beginPath();
      ctx.moveTo(dx+r,dy);ctx.lineTo(dx+this.w-r,dy);ctx.quadraticCurveTo(dx+this.w,dy,dx+this.w,dy+r);
      ctx.lineTo(dx+this.w,dy+this.h-r);ctx.quadraticCurveTo(dx+this.w,dy+this.h,dx+this.w-r,dy+this.h);
      ctx.lineTo(dx+r,dy+this.h);ctx.quadraticCurveTo(dx,dy+this.h,dx,dy+this.h-r);
      ctx.lineTo(dx,dy+r);ctx.quadraticCurveTo(dx,dy,dx+r,dy);ctx.fill();
      ctx.strokeStyle=COL.COCOA;ctx.lineWidth=2.5;ctx.stroke();
      // Eyes
      const eyeY=dy+this.h*0.3, eyeS=this.w*0.12;
      ctx.fillStyle='#FFF';ctx.beginPath();ctx.arc(dx+this.w*0.35,eyeY,eyeS+2,0,Math.PI*2);ctx.arc(dx+this.w*0.65,eyeY,eyeS+2,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=this.isAngry?'#C62828':COL.COCOA;ctx.beginPath();ctx.arc(dx+this.w*0.35,eyeY,eyeS,0,Math.PI*2);ctx.arc(dx+this.w*0.65,eyeY,eyeS,0,Math.PI*2);ctx.fill();
      if(this.isAngry){ctx.strokeStyle=COL.COCOA;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(dx+this.w*0.2,eyeY-eyeS-6);ctx.lineTo(dx+this.w*0.42,eyeY-eyeS);ctx.moveTo(dx+this.w*0.8,eyeY-eyeS-6);ctx.lineTo(dx+this.w*0.58,eyeY-eyeS);ctx.stroke();}
      if(this.isFinal){ctx.fillStyle='#FFD700';const cw=this.w*0.5,ch=14,cx2=dx+(this.w-cw)/2,cy2=dy-ch+4;ctx.beginPath();ctx.moveTo(cx2,cy2+ch);ctx.lineTo(cx2,cy2+4);ctx.lineTo(cx2+cw*0.25,cy2+ch*0.5);ctx.lineTo(cx2+cw*0.5,cy2);ctx.lineTo(cx2+cw*0.75,cy2+ch*0.5);ctx.lineTo(cx2+cw,cy2+4);ctx.lineTo(cx2+cw,cy2+ch);ctx.closePath();ctx.fill();}
      ctx.font=(this.w*0.35)+'px '+FONT.BODY;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(this.cfg.emoji,dx+this.w/2,dy+this.h*0.65);
    }
    ctx.restore();

    // HP bar — OUTSIDE save/restore, world coords, no transforms
    if (!this.dying) {
      const barW=this.w+10, barH=7;
      let barX=this.x+(this.w-barW)/2;
      barX=Math.max(2,Math.min(barX,WIDTH-barW-2));
      const barY=Math.max(PLAY_TOP+2,this.y-18);
      ctx.save(); ctx.globalAlpha=1;
      ctx.fillStyle='rgba(0,0,0,0.3)';ctx.fillRect(barX,barY,barW,barH);
      const pct=this.hp/this.maxHp;
      ctx.fillStyle=pct>0.3?COL.BOSS_HP2:COL.BOSS_HP1;
      ctx.fillRect(barX,barY,barW*pct,barH);
      ctx.strokeStyle='rgba(0,0,0,0.5)';ctx.lineWidth=1;ctx.strokeRect(barX,barY,barW,barH);
      ctx.restore();
    }
  }

  getHitbox() {
    return { x: this.x + 5, y: this.y + 5, w: this.w - 10, h: this.h - 10 };
  }
}
