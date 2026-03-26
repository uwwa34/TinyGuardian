// ═══════════════════════════════════════════════════
//  js/game.js  —  Tiny Guardian
//  Main loop, state machine, input, audio, joypad
// ═══════════════════════════════════════════════════

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.images = {};
    this.sounds = {};
    this.state = STATE.LOADING;

    this.player = new Player();
    this.world = new World();
    this.enemyManager = new EnemyManager();
    this.projManager = new ProjectileManager();
    this.itemManager = new ItemManager();
    this.hud = new HUD();
    this.tally = new TallyScreen();
    this.nameScreen = new NameScreen();
    this.rankingScreen = new RankingScreen();

    this.boss = null;
    this.currentStage = 1;
    this.currentWave = 0;
    this.waveDelay = 0;
    this.stageTimer = 0;
    this.stagesCleared = 0;
    this.timeBonuses = [];
    this.stageClearTimer = 0;
    this._stageClearing = false;

    this.input = { left:false, right:false, btnA:false, btnB:false };
    this._prevBtnA = false;
    this._touches = {};
    this._inputLock = 0;

    this.particles = [];
    this.introTimer = 0;

    this._audioCtx = window._audioCtx || null;
    this._sfxCache = {};
    this._lastTime = 0;
    this._raf = null;

    this._bindInput();
  }

  setImages(imgs) { this.images = imgs; }
  setSounds(snds) { this.sounds = snds; }

  start() {
    this.state = STATE.INTRO;
    this.player.reset();
    this.introTimer = 0;
    this._lastTime = performance.now();
    this._loop(this._lastTime);
    window._game = this;
  }

  // ── Utility ─────────────────────────────────────
  _aabb(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // ══════════════════════════════════════════════════
  //  MAIN LOOP
  // ══════════════════════════════════════════════════
  _loop(now) {
    const dt = Math.min((now - this._lastTime) / 1000, 0.05);
    this._lastTime = now;
    this._update(dt);
    this._draw();
    this._raf = requestAnimationFrame(t => this._loop(t));
  }

  _update(dt) {
    if (this._inputLock > 0) this._inputLock -= dt * 1000;

    switch (this.state) {
      case STATE.INTRO:    this.introTimer += dt; break;
      case STATE.PLAYING:  this._updatePlaying(dt); break;
      case STATE.STAGE_CLEAR:
        this.stageClearTimer -= dt;
        if (this.stageClearTimer <= 0) {
          if (this.currentStage > 4) this._goTally();
          else this._startStage(this.currentStage);
        }
        break;
      case STATE.GAME_OVER:
        this.stageClearTimer -= dt;
        if (this.stageClearTimer <= 0) this._goTally();
        break;
      case STATE.TALLY:  this.tally.update(dt); break;
      case STATE.NAME:   this.nameScreen.update(dt); break;
      case STATE.RANKING: this.rankingScreen.update(); break;
    }

    for (const p of this.particles) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 200 * dt; p.life -= dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);
    this.hud.update(dt);
  }

  _updatePlaying(dt) {
    const jumpJustPressed = this.input.btnA && !this._prevBtnA;
    const inputForPlayer = {
      left: this.input.left, right: this.input.right,
      btnA: this.input.btnA, btnB: this.input.btnB,
      jumpPressed: jumpJustPressed,
    };
    this._prevBtnA = this.input.btnA;

    this.stageTimer -= dt;
    if (this.stageTimer < 0) this.stageTimer = 0;

    this.player.update(dt, inputForPlayer, this.world, this);
    this.world.update(dt);
    this.enemyManager.update(dt, this.world, this);
    this.projManager.update(dt);
    this.itemManager.update(dt, this.world, this.player);
    if (this.boss) this.boss.update(dt, this.world, this.player, this);

    if (this.waveDelay > 0) {
      this.waveDelay -= dt * 1000;
      if (this.waveDelay <= 0) this._spawnNextWave();
    }

    this._checkCollisions();

    // Wave/stage progression
    if (!this._stageClearing) {
      const noEnemies = this.enemyManager.aliveCount === 0 && !this.boss;
      const waves = STAGE_WAVES[this.currentStage];
      if (noEnemies && this.waveDelay <= 0 && waves) {
        if (this.currentWave < waves.length) {
          // More waves to spawn
          this.waveDelay = 1500;
        } else {
          // All waves done — delay 3.5s for item collection then clear
          this._stageClearing = true;
          this._clearDelay = 3.5;
          this.hud.addNotification('✨ Wave Clear!');
        }
      }
    }

    // Clear delay countdown
    if (this._stageClearing && this._clearDelay > 0) {
      this._clearDelay -= dt;
      if (this._clearDelay <= 0) {
        this._clearDelay = 0;
        this._stageClear();
      }
    }

    if (this.player.hp <= 0) {
      this.playSfx('die');
      this.state = STATE.GAME_OVER;
      this.stageClearTimer = 2.5;
    }
  }

  _checkCollisions() {
    const pH = this.player.getHitbox();

    // Player bullets vs enemies
    for (const bullet of this.projManager.playerBullets) {
      if (!bullet.alive) continue;
      const bH = bullet.getHitbox();
      for (const enemy of this.enemyManager.enemies) {
        if (enemy.dying) continue;
        if (this._aabb(bH, enemy.getHitbox())) {
          enemy.takeDamage(bullet.damage);
          if (bullet.pierce > 0) bullet.pierce--; else bullet.alive = false;
          if (enemy.dying) this._onEnemyKill(enemy);
          break;
        }
      }
      // vs boss
      if (this.boss && !this.boss.dying && bullet.alive) {
        if (this._aabb(bH, this.boss.getHitbox())) {
          this.boss.takeDamage(bullet.damage, this);
          if (bullet.pierce > 0) bullet.pierce--; else bullet.alive = false;
          if (this.boss && this.boss.dying) this._onBossKill();
        }
      }
    }

    // Enemy bullets vs player
    for (const eb of this.projManager.enemyBullets) {
      if (!eb.alive) continue;
      if (this._aabb(pH, eb.getHitbox())) {
        eb.alive = false;
        if (eb.type === 'food') this.player.getFat(this);
        else this.player.takeDamage(this);
      }
    }

    // Enemies contact player
    if (!this.player.invincible) {
      for (const enemy of this.enemyManager.enemies) {
        if (enemy.dying) continue;
        if (this._aabb(pH, enemy.getHitbox())) {
          this.player.takeDamage(this);
          break;
        }
      }
    }

    // Boss contact player
    if (this.boss && !this.boss.dying && !this.player.invincible) {
      if (this._aabb(pH, this.boss.getHitbox())) {
        this.player.takeDamage(this);
      }
    }

    // Items
    for (const item of this.itemManager.items) {
      if (!item.alive) continue;
      if (this._aabb(pH, item.getHitbox())) {
        item.alive = false;
        if (item.isPowerup) {
          this.player.applyPowerup(item.powerupKey, this);
          this.hud.addNotification(POWERUP_TYPES[item.powerupKey].label);
          this.playSfx('powerup');
        } else if (item.healsHp) {
          if (this.player.hp < this.player.maxHp) {
            this.player.hp++;
            this.hud.addComboPopup('+1 HP', item.x, item.y, COL.HEART_ON);
            this.playSfx('powerup');
          }
        } else if (item.healsFat) {
          this.player.healFat(this);
          this.hud.addComboPopup('Slim!', item.x, item.y, COL.MINT);
        } else {
          this.player.score += item.points;
          this.player.itemsCollected++;
          this.playSfx('coin');
          if (item.points > 0) this.hud.addComboPopup('+' + item.points, item.x, item.y, COL.PRIMARY);
        }
        this._spawnParticles(item.x + item.w/2, item.y + item.h/2, COL.PRIMARY, 5);
      }
    }
  }

  _onEnemyKill(enemy) {
    this.player.kills++;
    this.player.addCombo();
    const mult = this.player.getComboMultiplier();
    const pts = enemy.points * mult;
    this.player.score += pts;
    this.hud.addComboPopup('+' + pts + (mult > 1 ? ' ×' + mult : ''), enemy.x + enemy.w/2, enemy.y, COL.GOLD);
    this.playSfx('enemy_die');
    this.itemManager.dropFromEnemy(enemy.x, enemy.y, this.currentStage);
    this._spawnParticles(enemy.x + enemy.w/2, enemy.y + enemy.h/2, enemy.def.color, 8);
  }

  _onBossKill() {
    if (!this.boss) return;
    const pts = this.boss.points;
    this.player.score += pts;
    this.player.kills++;
    this.hud.addComboPopup('+' + pts + ' BOSS!', this.boss.x + this.boss.w/2, this.boss.y, COL.GOLD);
    this._spawnParticles(this.boss.x + this.boss.w/2, this.boss.y + this.boss.h/2, COL.GOLD, 20);
    this.itemManager.spawnRandomPowerup(this.boss.x + this.boss.w/2, this.boss.y);
    this.boss = null;
  }

  // ── Stage ──────────────────────────────────────────
  _startStage(num) {
    this.currentStage = num;
    this.currentWave = 0;
    this.waveDelay = 1200; // delay before first wave
    this.stageTimer = STAGE_TIME[num] || 90;
    this.boss = null;
    this._stageClearing = false;
    this.world.loadStage(num);
    this.enemyManager.reset();
    this.projManager.reset();
    this.itemManager.reset();
    this.player.x = WIDTH/2 - this.player.w/2;
    this.player.y = GROUND_Y - this.player.h;
    this.player.vy = 0;
    this.player.grounded = true;
    this.player.fatLevel = 0;
    this.state = STATE.PLAYING;
    this.input = { left:false, right:false, btnA:false, btnB:false };
    this._prevBtnA = false;
    this._inputLock = 500;
    this.hud.addNotification('🛡️ ด่าน ' + num + ' เริ่ม!');
  }

  _spawnNextWave() {
    const waves = STAGE_WAVES[this.currentStage];
    if (!waves || this.currentWave >= waves.length) return;
    const waveData = waves[this.currentWave];
    this.currentWave++;

    if (waveData === 'MINIBOSS') {
      const plats = this.world.platforms;
      const p = plats[Math.floor(Math.random() * plats.length)];
      this.boss = new BossUnit(MINIBOSS, p.x + p.w/2 - MINIBOSS.w/2, p.y - MINIBOSS.h, false);
      this.hud.addNotification('⚠️ ' + MINIBOSS.name + ' ปรากฏตัว!');
      this.playSfx('boss_warning');
    } else if (waveData === 'BOSS') {
      const topPlat = this.world.platforms.reduce((a, b) => a.y < b.y ? a : b);
      this.boss = new BossUnit(BOSS, topPlat.x + topPlat.w/2 - BOSS.w/2, topPlat.y - BOSS.h, true);
      this.hud.addNotification('⚠️ ' + BOSS.name + ' มาแล้ว!');
      this.playSfx('boss_warning');
    } else {
      this.enemyManager.spawnWave(waveData, this.world);
      this.hud.addNotification('Wave ' + this.currentWave + '!');
    }
  }

  _stageClear() {
    this._stageClearing = true;
    this.stagesCleared++;
    const tb = Math.floor(this.stageTimer) * TIME_BONUS_PER_S;
    this.timeBonuses.push(tb);
    this.player.score += STAGE_CLEAR_BONUS + tb;
    this.playSfx('stage_clear');
    this.currentStage++;
    this.state = STATE.STAGE_CLEAR;
    this.stageClearTimer = 2.5;
  }

  _goTally() {
    this.tally.init(this.player, this.stagesCleared, this.timeBonuses);
    this.state = STATE.TALLY;
    this._inputLock = 800;
  }

  spawnProjectile(x, y, dir, charged, angleY) {
    if (this.player.powerups.triple) {
      this.projManager.addPlayerBullet(x, y, dir, charged, 0);
      this.projManager.addPlayerBullet(x, y-8, dir, charged, -0.25);
      this.projManager.addPlayerBullet(x, y+8, dir, charged, 0.25);
    } else {
      this.projManager.addPlayerBullet(x, y, dir, charged, angleY);
    }
  }

  bombAllEnemies() {
    for (const e of this.enemyManager.enemies) {
      if (!e.dying) { e.takeDamage(2); if (e.dying) this._onEnemyKill(e); }
    }
    if (this.boss && !this.boss.dying) {
      this.boss.takeDamage(2, this);
      if (this.boss.dying) this._onBossKill();
    }
    this._spawnParticles(WIDTH/2, HEIGHT/2, COL.WARM_ORANGE, 30);
  }

  _spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x, y, vx: (Math.random()-0.5)*200, vy: (Math.random()-0.5)*200-50,
        life: 0.3+Math.random()*0.5, color, size: 3+Math.random()*4,
      });
    }
  }

  // ══════════════════════════════════════════════════
  //  DRAW
  // ══════════════════════════════════════════════════
  _draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    switch (this.state) {
      case STATE.INTRO:       this._drawIntro(ctx); break;
      case STATE.PLAYING:
      case STATE.GAME_OVER:
        this._drawPlaying(ctx);
        if (this.state === STATE.GAME_OVER) this._drawGameOver(ctx);
        break;
      case STATE.STAGE_CLEAR: this._drawPlaying(ctx); this._drawStageClear(ctx); break;
      case STATE.TALLY:       this.tally.draw(ctx); break;
      case STATE.NAME:        this.nameScreen.draw(ctx); break;
      case STATE.RANKING:     this.rankingScreen.draw(ctx); break;
    }
    this._drawParticles(ctx);
  }

  _drawIntro(ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    grad.addColorStop(0, '#FFF8E1'); grad.addColorStop(1, '#FFE082');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const titleY = 180 + Math.sin(this.introTimer*2)*8;
    ctx.font = '36px '+FONT.MAIN; ctx.textAlign = 'center';
    ctx.strokeStyle = COL.PRIMARY; ctx.lineWidth = 4;
    ctx.fillStyle = COL.COCOA;
    ctx.strokeText('TINY', WIDTH/2, titleY); ctx.fillText('TINY', WIDTH/2, titleY);
    ctx.strokeText('GUARDIAN', WIDTH/2, titleY+46); ctx.fillText('GUARDIAN', WIDTH/2, titleY+46);

    ctx.font = '14px '+FONT.BODY;
    ctx.fillText('— ผู้พิทักษ์ตัวจิ๋ว —', WIDTH/2, titleY+80);

    // Player character — draw using the actual player draw method
    ctx.save();
    const py = 360+Math.sin(this.introTimer*3)*5;
    // Temporarily position and scale the player for drawing
    const savedX = this.player.x, savedY = this.player.y;
    this.player.x = WIDTH/2 - PLAYER_W*0.75;
    this.player.y = py;
    this.player.state = 'idle';
    this.player.facing = 1;
    ctx.save();
    const sc = 1.5;
    ctx.translate(WIDTH/2, py + PLAYER_H/2);
    ctx.scale(sc, sc);
    ctx.translate(-PLAYER_W/2, -PLAYER_H/2);
    // Draw with image if available, else emoji
    if (this.images && this.images.player) {
      const img = this.images.player;
      const aspect = img.width / img.height;
      const srcW = aspect > 1.5 ? Math.floor(img.height * (PLAYER_W / PLAYER_H)) : img.width;
      ctx.drawImage(img, 0, 0, srcW, img.height, 0, 0, PLAYER_W, PLAYER_H);
    } else {
      this.player._drawEmoji(ctx, PLAYER_W, PLAYER_H);
    }
    ctx.restore();
    this.player.x = savedX; this.player.y = savedY;
    ctx.restore();

    ctx.font = '15px '+FONT.BODY; ctx.fillStyle = COL.COCOA;
    ctx.fillText('ปกป้องโลกจากเหล่าวายร้ายกัน!', WIDTH/2, 500);

    ctx.globalAlpha = 0.5+Math.sin(this.introTimer*4)*0.5;
    ctx.font = '16px '+FONT.MAIN; ctx.fillStyle = COL.PRIMARY_D;
    ctx.fillText('แตะที่จอหรือกด A เพื่อเริ่มกันเลย', WIDTH/2, 550);
    ctx.globalAlpha = 1;

    ctx.font = '24px '+FONT.BODY; ctx.textAlign = 'center';
    ctx.fillText('⭐', 50, 120+Math.sin(this.introTimer*1.5)*10);
    ctx.fillText('🌟', 340, 150+Math.cos(this.introTimer*1.8)*8);
    ctx.fillText('✨', 80, 600+Math.sin(this.introTimer*2.2)*6);
    ctx.fillText('💫', 310, 620+Math.cos(this.introTimer*2)*7);
  }

  _drawPlaying(ctx) {
    this.world.drawBackground(ctx, this.images);
    this.world.drawPlatforms(ctx, this.images);
    this.itemManager.draw(ctx, this.images);
    this.enemyManager.draw(ctx, this.images);
    if (this.boss) this.boss.draw(ctx, this.images);
    this.projManager.draw(ctx);
    this.player.draw(ctx, this.images);
    this.hud.draw(ctx, this.player, this.currentStage, this.stageTimer);
    this._drawJoypad(ctx);
  }

  _drawJoypad(ctx) {
    // Yellow Pastel joypad background
    const jG = ctx.createLinearGradient(0, HEIGHT-JOYPAD_H, 0, HEIGHT);
    jG.addColorStop(0, 'rgba(255,236,179,0.92)');
    jG.addColorStop(1, 'rgba(255,224,130,0.95)');
    ctx.fillStyle = jG;
    ctx.fillRect(0, HEIGHT-JOYPAD_H, WIDTH, JOYPAD_H);
    // Top edge
    ctx.fillStyle = COL.PRIMARY;
    ctx.fillRect(0, HEIGHT-JOYPAD_H, WIDTH, 2);

    for (const [key, btn] of Object.entries(JBTN)) {
      const isActive = (key==='LEFT'&&this.input.left)||(key==='RIGHT'&&this.input.right)||
                       (key==='A'&&this.input.btnA)||(key==='B'&&this.input.btnB);
      let col = (key==='LEFT'||key==='RIGHT') ? COL.JOYPAD_LEFT : key==='B' ? COL.JOYPAD_BTN_B : COL.JOYPAD_BTN_A;

      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.beginPath(); ctx.arc(btn.x+btn.r, btn.y+btn.r+2, btn.r, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = isActive?'#FFF':col; ctx.globalAlpha = isActive?0.95:0.75;
      ctx.beginPath(); ctx.arc(btn.x+btn.r, btn.y+btn.r, btn.r, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = isActive?col:'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.font = '18px '+FONT.MAIN; ctx.fillStyle = isActive?col:COL.HUD_TEXT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, btn.x+btn.r, btn.y+btn.r+1);
      ctx.restore();
    }
  }

  _drawStageClear(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,248,225,0.85)'; ctx.fillRect(0,0,WIDTH,HEIGHT);
    ctx.font = '30px '+FONT.MAIN; ctx.fillStyle = COL.GOLD; ctx.textAlign = 'center';
    ctx.fillText('🎉 ด่าน '+(this.currentStage-1)+' ผ่าน! 🎉', WIDTH/2, HEIGHT/2-30);
    const tb = this.timeBonuses[this.timeBonuses.length-1]||0;
    ctx.font = '15px '+FONT.BODY; ctx.fillStyle = COL.HUD_TEXT;
    ctx.fillText('Stage Bonus: +'+STAGE_CLEAR_BONUS, WIDTH/2, HEIGHT/2+20);
    ctx.fillText('Time Bonus: +'+tb, WIDTH/2, HEIGHT/2+46);
    ctx.restore();
  }

  _drawGameOver(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,248,225,0.88)'; ctx.fillRect(0,0,WIDTH,HEIGHT);
    ctx.font = '34px '+FONT.MAIN; ctx.fillStyle = COL.HEART_ON; ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', WIDTH/2, HEIGHT/2-20);
    ctx.font = '14px '+FONT.BODY; ctx.fillStyle = COL.HUD_TEXT;
    ctx.fillText('คะแนน: '+this.player.score.toLocaleString(), WIDTH/2, HEIGHT/2+20);
    ctx.restore();
  }

  _drawParticles(ctx) {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life*3);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size*p.life, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }

  // ══════════════════════════════════════════════════
  //  INPUT
  // ══════════════════════════════════════════════════
  _bindInput() {
    document.addEventListener('keydown', e => this._onKey(e, true), {passive:false});
    document.addEventListener('keyup', e => this._onKey(e, false), {passive:false});
    this.canvas.addEventListener('touchstart', e => this._onTouch(e), {passive:false});
    this.canvas.addEventListener('touchmove', e => { e.preventDefault(); if(this.state===STATE.PLAYING) this._recomputeTouchInput(e.touches); }, {passive:false});
    this.canvas.addEventListener('touchend', e => this._onTouchEnd(e), {passive:false});
    this.canvas.addEventListener('touchcancel', e => this._onTouchEnd(e), {passive:false});
    this.canvas.addEventListener('mousedown', e => this._onMouse(e, true));
    this.canvas.addEventListener('mouseup', e => this._onMouse(e, false));
  }

  _onKey(e, down) {
    const key = e.key;
    const kl = key.toLowerCase();

    // NAME state: route all keys to name handler only
    if (this.state === STATE.NAME) {
      if (down) {
        e.preventDefault();
        const result = this.nameScreen.handleKey(key);
        if (result) this._submitName(result);
      }
      return;
    }

    if (['a','d','b',' ','arrowleft','arrowright'].includes(kl)) e.preventDefault();

    if (kl === 'a' || kl === 'arrowleft') this.input.left = down;
    if (kl === 'd' || kl === 'arrowright') this.input.right = down;
    if (kl === 'b') this.input.btnB = down;
    if (kl === ' ') this.input.btnA = down;

    if (down && this._inputLock <= 0) {
      if (kl === ' ' || kl === 'enter') this._handleConfirm();
    }
  }

  _handleConfirm() {
    if (this.state === STATE.INTRO) this._startGame();
    else if (this.state === STATE.TALLY && this.tally.done) { this.state = STATE.NAME; this.nameScreen.reset(); this._inputLock = 400; }
    else if (this.state === STATE.RANKING) this._restartGame();
  }

  _getCanvasPos(cx, cy) {
    const r = this.canvas.getBoundingClientRect();
    return { x: (cx-r.left)*(WIDTH/r.width), y: (cy-r.top)*(HEIGHT/r.height) };
  }

  _onTouch(e) {
    e.preventDefault();
    if (this._inputLock <= 0) {
      if (this.state === STATE.INTRO) { this._startGame(); return; }
      if (this.state === STATE.TALLY && this.tally.done) { this.state = STATE.NAME; this.nameScreen.reset(); this._inputLock = 400; return; }
      if (this.state === STATE.RANKING) { this._restartGame(); return; }
      if (this.state === STATE.NAME && e.changedTouches.length > 0) {
        const pos = this._getCanvasPos(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        const result = this.nameScreen.handleTouch(pos.x, pos.y);
        if (result) this._submitName(result);
        return;
      }
    }
    this._recomputeTouchInput(e.touches);
  }

  _onTouchEnd(e) {
    e.preventDefault();
    for (const t of e.changedTouches) delete this._touches[t.identifier];
    this._recomputeTouchInput(e.touches);
  }

  _recomputeTouchInput(touchList) {
    this.input.left = false; this.input.right = false;
    this.input.btnA = false; this.input.btnB = false;
    for (const touch of touchList) {
      const pos = this._getCanvasPos(touch.clientX, touch.clientY);
      this._touches[touch.identifier] = pos;
      this._checkJoypadBtn(pos);
    }
  }

  _checkJoypadBtn(pos) {
    for (const [key, btn] of Object.entries(JBTN)) {
      const cx = btn.x+btn.r, cy = btn.y+btn.r;
      const dx = pos.x-cx, dy = pos.y-cy;
      const hitR = btn.r+14;
      if (dx*dx+dy*dy <= hitR*hitR) {
        if (key==='LEFT') this.input.left = true;
        if (key==='RIGHT') this.input.right = true;
        if (key==='A') this.input.btnA = true;
        if (key==='B') this.input.btnB = true;
      }
    }
  }

  _onMouse(e, down) {
    const pos = this._getCanvasPos(e.clientX, e.clientY);
    if (down && this._inputLock <= 0) {
      if (this.state === STATE.INTRO) { this._startGame(); return; }
      if (this.state === STATE.TALLY && this.tally.done) { this.state = STATE.NAME; this.nameScreen.reset(); this._inputLock = 400; return; }
      if (this.state === STATE.RANKING) { this._restartGame(); return; }
      if (this.state === STATE.NAME) {
        const result = this.nameScreen.handleTouch(pos.x, pos.y);
        if (result) this._submitName(result);
        return;
      }
    }
    if (this.state === STATE.PLAYING && pos.y >= HEIGHT-JOYPAD_H) {
      if (!down) { this.input.left=false; this.input.right=false; this.input.btnA=false; this.input.btnB=false; }
      else this._checkJoypadBtn(pos);
    }
  }

  // ── State Transitions ──────────────────────────────
  _startGame() {
    this.player.reset();
    this.stagesCleared = 0;
    this.timeBonuses = [];
    this.currentStage = 1;
    this.particles = [];
    this._stageClearing = false;
    this.input = { left:false, right:false, btnA:false, btnB:false };
    this._prevBtnA = false;
    this._startStage(1);
  }

  _submitName(name) {
    this.rankingScreen.addScore(name, this.player.score);
    this.state = STATE.RANKING;
    this._inputLock = 500;
  }

  _restartGame() {
    this.state = STATE.INTRO;
    this.introTimer = 0;
    this._inputLock = 400;
  }

  // ══════════════════════════════════════════════════
  //  AUDIO
  // ══════════════════════════════════════════════════
  playSfx(key) {
    const snd = this.sounds[key];
    if (!snd) return;
    try {
      if (snd._sfxBuf) {
        if (!this._audioCtx) this._audioCtx = window._audioCtx || new (window.AudioContext||window.webkitAudioContext)();
        const ctx = this._audioCtx;
        if (!this._sfxCache[key]) {
          const buf = snd._sfxBuf.slice(0);
          ctx.decodeAudioData(buf, decoded => { this._sfxCache[key]=decoded; this._playSfxBuf(decoded); });
        } else { this._playSfxBuf(this._sfxCache[key]); }
      } else if (snd instanceof Audio) {
        const clone = snd.cloneNode(); clone.volume=0.6; clone.play().catch(()=>{});
      }
    } catch(e) {}
  }

  _playSfxBuf(decoded) {
    const ctx = this._audioCtx;
    const src = ctx.createBufferSource(); src.buffer = decoded;
    const gain = ctx.createGain(); gain.gain.value = 0.6;
    src.connect(gain).connect(ctx.destination); src.start(0);
  }

  _unlockAudio() {
    if (this._audioCtx && this._audioCtx.state === 'suspended') this._audioCtx.resume();
  }
}
