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
    this.player2 = null;    // Co-op Player 2
    this.world = new World();
    this.enemyManager = new EnemyManager();
    this.projManager = new ProjectileManager();
    this.itemManager = new ItemManager();
    this.hud = new HUD();
    this.tally = new TallyScreen();
    this.nameScreen = new NameScreen();
    this.rankingScreen = new RankingScreen();

    // Co-op
    this.coopMode = false;
    this.net = new NetworkManager();
    this.coopLobby = new CoopLobbyUI();
    this._setupNetwork();

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

  // ── Network Setup ──
  _setupNetwork() {
    this.net.onEvent = (type, data) => {
      switch (type) {
        case 'room_created':
          this.coopLobby.state = 'waiting';
          this.coopLobby.roomCode = data;
          break;
        case 'room_joined':
          this.coopLobby.state = 'guest_ready';
          this.coopLobby.roomCode = data;
          break;
        case 'guest_joined':
          this.coopLobby.state = 'ready';
          break;
        case 'game_start':
          this._startCoopGame();
          break;
        case 'peer_left':
          this.hud.addNotification('⚠️ เพื่อนออกจากห้อง');
          if (this.state === 'COOP_LOBBY') this.coopLobby.state = 'menu';
          break;
        case 'error':
          this.coopLobby.state = 'error';
          this.coopLobby.errorMsg = data || 'เกิดข้อผิดพลาด';
          break;
        case 'peer_event':
          this._handlePeerEvent(data);
          break;
      }
    };
  }

  _startCoopGame() {
    this.coopMode = true;
    this.player.reset(); this.player.maxHp = 5; this.player.hp = 5;
    this.player.coopActive = true;
    this.player2 = new Player();
    this.player2.reset(); this.player2.maxHp = 5; this.player2.hp = 5;
    this.player2.isP2 = true;
    this.player2.coopActive = true;
    // P2 starts on right side
    this.player2.x = WIDTH - PLAYER_W - 30;
    this.currentStage = 1; this.currentWave = 0;
    this.stagesCleared = 0; this.timeBonuses = [];
    this._startStage(1);
    this.state = STATE.PLAYING;
  }

  _handlePeerEvent(data) {
    if (!data || !data.event) return;
    if (data.event === 'sfx') this.playSfx(data.name);
  }

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
      case 'COOP_LOBBY':   this.coopLobby.update(dt); break;
      case STATE.PLAYING:
        this._updatePlaying(dt);
        // Co-op: update P2 + network sync
        if (this.coopMode && this.player2) this._updateCoop(dt);
        break;
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

    // In co-op Guest mode: joypad controls player2 locally
    if (this.coopMode && this.net.isGuest) {
      // Guest: update own player2 with local joypad (instant response)
      if (this.player2 && this.player2.hp > 0) {
        this.player2.update(dt, inputForPlayer, this.world, this);
      }
      // Don't update player1 locally — Host sends P1 state
    } else {
      // Solo or Host: update player1 with joypad
      this.player.update(dt, inputForPlayer, this.world, this);
    }

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

    if (this.coopMode) {
      // Co-op: game over only when BOTH players dead
      if (this.player.hp <= 0 && (!this.player2 || this.player2.hp <= 0)) {
        this.playSfx('die');
        this.state = STATE.GAME_OVER;
        this.stageClearTimer = 2.5;
      }
    } else {
      if (this.player.hp <= 0) {
        this.playSfx('die');
        this.state = STATE.GAME_OVER;
        this.stageClearTimer = 2.5;
      }
    }
  }

  _updateCoop(dt) {
    if (!this.player2) return;
    if (this.net.isHost) {
      // Host: update P2 with peer input from Guest
      const p2Input = {
        left: this.net.peerInput.left,
        right: this.net.peerInput.right,
        btnA: this.net.peerInput.btnA,
        btnB: this.net.peerInput.btnB,
        jumpPressed: this.net.peerInput.jumpPressed,
      };
      if (this.player2.hp > 0) {
        this.player2.update(dt, p2Input, this.world, this);
      }
      // Send state to Guest (20fps)
      this.net.sendGameState({
        p1: { x:this.player.x, y:this.player.y, hp:this.player.hp, facing:this.player.facing, state:this.player.state, score:this.player.score },
        p2: { x:this.player2.x, y:this.player2.y, hp:this.player2.hp, facing:this.player2.facing, state:this.player2.state, score:this.player2.score },
        boss: this.boss ? { x:this.boss.x, y:this.boss.y, hp:this.boss.hp, alive:this.boss.alive } : null,
        timer: this.stageTimer,
      });
      // P2 collision with enemies/boss/bullets/items
      if (this.player2.hp > 0) {
        const p2H = this.player2.getHitbox();
        if (!this.player2.invincible) {
          for (const enemy of this.enemyManager.enemies) {
            if (enemy.dying) continue;
            if (this._aabb(p2H, enemy.getHitbox())) { this.player2.takeDamage(this); break; }
          }
          if (this.boss && !this.boss.dying) {
            if (this._aabb(p2H, this.boss.getHitbox())) this.player2.takeDamage(this);
          }
        }
        for (const eb of this.projManager.enemyBullets) {
          if (!eb.alive) continue;
          if (this._aabb(p2H, eb.getHitbox())) { eb.alive = false; this.player2.takeDamage(this); }
        }
        for (const item of this.itemManager.items) {
          if (!item.alive) continue;
          if (this._aabb(p2H, item.getHitbox())) {
            item.alive = false;
            if (item.healsHp) { if(this.player2.hp<this.player2.maxHp){this.player2.hp++;} }
            else if (!item.healsFat) { this.player2.score+=item.points; this.player2.itemsCollected++; }
          }
        }
      }
    } else if (this.net.isGuest) {
      // Guest: send own input + apply Host sync smoothly
      this.net.sendInput({
        left: this.input.left, right: this.input.right,
        btnA: this.input.btnA, btnB: this.input.btnB,
        jumpPressed: this.input.btnA && !this._prevP2BtnA,
      });
      this._prevP2BtnA = this.input.btnA;

      if (this.net.peerState) {
        const s = this.net.peerState;
        // P1 (Host's player) — smooth lerp to network position
        if (s.p1) {
          this.player.x += (s.p1.x - this.player.x) * 0.3;
          this.player.y += (s.p1.y - this.player.y) * 0.3;
          this.player.hp = s.p1.hp;
          this.player.facing = s.p1.facing;
          this.player.state = s.p1.state;
          this.player.score = s.p1.score;
        }
        // P2 (Guest's own player) — soft correction from Host authority
        if (s.p2) {
          // Only correct if far off (>20px) — otherwise trust local prediction
          const dx = s.p2.x - this.player2.x;
          const dy = s.p2.y - this.player2.y;
          if (Math.abs(dx) > 20) this.player2.x += dx * 0.4;
          if (Math.abs(dy) > 20) this.player2.y += dy * 0.4;
          this.player2.hp = s.p2.hp;
          this.player2.score = s.p2.score;
        }
        // Boss sync
        if (s.boss && this.boss) {
          this.boss.x += (s.boss.x - this.boss.x) * 0.3;
          this.boss.y += (s.boss.y - this.boss.y) * 0.3;
          this.boss.hp = s.boss.hp;
        }
        if (s.timer !== undefined) this.stageTimer = s.timer;
        this.net.peerState = null; // consumed
      }
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
        this.player.takeDamage(this);
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
        if (item.healsHp) {
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
    this.itemManager.spawnItem('HEART', this.boss.x + this.boss.w/2 - 15, this.boss.y);
    this.itemManager.spawnItem('HEART', this.boss.x + this.boss.w/2 + 15, this.boss.y);
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
      this.enemyManager.spawnWave(waveData, this.world, this.player);
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
    this.projManager.addPlayerBullet(x, y, dir, charged, angleY);
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
      case 'COOP_LOBBY':      this.coopLobby.draw(ctx); break;
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
    ctx.fillText('ปกป้องโลกจากเหล่าวายร้ายกัน!', WIDTH/2, 490);

    // Solo play button
    ctx.fillStyle = COL.PRIMARY;
    _rr(ctx, WIDTH/2-120, 520, 240, 46, 14); ctx.fill();
    ctx.strokeStyle = COL.PRIMARY_D; ctx.lineWidth = 1.5; _rr(ctx, WIDTH/2-120, 520, 240, 46, 14); ctx.stroke();
    ctx.font = '16px '+FONT.MAIN; ctx.fillStyle = COL.HUD_TEXT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🎮 เล่นคนเดียว', WIDTH/2, 543);

    // Co-op button
    ctx.fillStyle = COL.SKY_BLUE;
    _rr(ctx, WIDTH/2-120, 580, 240, 46, 14); ctx.fill();
    ctx.strokeStyle = COL.PRIMARY_D; ctx.lineWidth = 1.5; _rr(ctx, WIDTH/2-120, 580, 240, 46, 14); ctx.stroke();
    ctx.fillStyle = COL.HUD_TEXT;
    ctx.fillText('👥 เล่น 2 คน (Online)', WIDTH/2, 603);

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
    // Draw Player 2
    if (this.player2) this.player2.draw(ctx, this.images);
    this.hud.draw(ctx, this.player, this.currentStage, this.stageTimer);
    // Draw P2 HP on right side
    if (this.coopMode && this.player2) {
      this._drawP2HUD(ctx);
    }
    this._drawJoypad(ctx);
  }

  _drawP2HUD(ctx) {
    const p2 = this.player2;
    // P2 hearts on right side, row 1 of HUD area
    const heartR = 8, sp = 20;
    for (let i = 0; i < p2.maxHp; i++) {
      const hx = WIDTH - 10 - (p2.maxHp - i) * sp;
      const hy = 12;
      ctx.fillStyle = i < p2.hp ? '#42A5F5' : '#E3F2FD';
      ctx.beginPath();
      ctx.moveTo(hx,hy+heartR*0.4);
      ctx.bezierCurveTo(hx,hy-heartR*0.5,hx-heartR,hy-heartR*0.5,hx-heartR,hy+heartR*0.1);
      ctx.bezierCurveTo(hx-heartR,hy+heartR*0.6,hx,hy+heartR,hx,hy+heartR*1.2);
      ctx.bezierCurveTo(hx,hy+heartR,hx+heartR,hy+heartR*0.6,hx+heartR,hy+heartR*0.1);
      ctx.bezierCurveTo(hx+heartR,hy-heartR*0.5,hx,hy-heartR*0.5,hx,hy+heartR*0.4);
      ctx.closePath(); ctx.fill();
    }
    // P2 score
    ctx.font = '11px '+FONT.MAIN; ctx.fillStyle = '#42A5F5'; ctx.textAlign = 'right';
    ctx.fillText('P2 ★'+p2.score, WIDTH-8, 42);
    // Ghost label if dead
    if (p2.hp <= 0) {
      ctx.font = '10px '+FONT.BODY; ctx.fillStyle = 'rgba(66,165,245,0.5)';
      ctx.fillText('👻 GHOST', WIDTH-8, 55);
    }
  }

  _drawJoypad(ctx) {
    // Background
    const jG = ctx.createLinearGradient(0, HEIGHT-JOYPAD_H, 0, HEIGHT);
    jG.addColorStop(0, 'rgba(255,236,179,0.92)');
    jG.addColorStop(1, 'rgba(255,224,130,0.95)');
    ctx.fillStyle = jG;
    ctx.fillRect(0, HEIGHT-JOYPAD_H, WIDTH, JOYPAD_H);
    ctx.fillStyle = COL.PRIMARY;
    ctx.fillRect(0, HEIGHT-JOYPAD_H, WIDTH, 2);

    for (const [key, btn] of Object.entries(JBTN)) {
      const isActive = (key==='LEFT'&&this.input.left)||(key==='RIGHT'&&this.input.right)||
                       (key==='A'&&this.input.btnA)||(key==='B'&&this.input.btnB);
      let col = (key==='LEFT'||key==='RIGHT') ? COL.JOYPAD_LEFT : key==='B' ? COL.JOYPAD_BTN_B : COL.JOYPAD_BTN_A;

      ctx.save();
      const bx=btn.x, by=btn.y, bw=btn.w, bh=btn.h;
      const r=12;

      // Shadow
      ctx.fillStyle='rgba(0,0,0,0.1)';
      ctx.beginPath();ctx.moveTo(bx+r,by+3);ctx.lineTo(bx+bw-r,by+3);ctx.quadraticCurveTo(bx+bw,by+3,bx+bw,by+r+3);ctx.lineTo(bx+bw,by+bh-r+3);ctx.quadraticCurveTo(bx+bw,by+bh+3,bx+bw-r,by+bh+3);ctx.lineTo(bx+r,by+bh+3);ctx.quadraticCurveTo(bx,by+bh+3,bx,by+bh-r+3);ctx.lineTo(bx,by+r+3);ctx.quadraticCurveTo(bx,by+3,bx+r,by+3);ctx.closePath();ctx.fill();

      // Button body
      ctx.fillStyle = isActive ? '#FFF' : col;
      ctx.globalAlpha = isActive ? 0.95 : 0.8;
      ctx.beginPath();ctx.moveTo(bx+r,by);ctx.lineTo(bx+bw-r,by);ctx.quadraticCurveTo(bx+bw,by,bx+bw,by+r);ctx.lineTo(bx+bw,by+bh-r);ctx.quadraticCurveTo(bx+bw,by+bh,bx+bw-r,by+bh);ctx.lineTo(bx+r,by+bh);ctx.quadraticCurveTo(bx,by+bh,bx,by+bh-r);ctx.lineTo(bx,by+r);ctx.quadraticCurveTo(bx,by,bx+r,by);ctx.closePath();ctx.fill();

      // Border
      ctx.strokeStyle = isActive ? col : 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Label (big)
      ctx.font = '20px '+FONT.MAIN;
      ctx.fillStyle = isActive ? col : COL.HUD_TEXT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, bx+bw/2, by+bh/2-6);

      // Hint (small text below)
      ctx.font = '9px '+FONT.BODY;
      ctx.fillStyle = isActive ? col : 'rgba(93,64,55,0.5)';
      ctx.fillText(btn.hint, bx+bw/2, by+bh-8);

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

    // COOP_LOBBY: route keys for code input
    if (this.state === 'COOP_LOBBY') {
      if (down) {
        const action = this.coopLobby.handleKey(key);
        if (action === 'join') {
          this.coopLobby.state = 'connecting';
          this.net.joinRoom(this.coopLobby.inputCode, COOP_SERVER_URL);
        }
        if (key === 'Escape') { this.net.disconnect(); this.state = STATE.INTRO; }
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

  _handleIntroTap(pos) {
    // Solo button: y 520-566
    if (pos.y >= 520 && pos.y <= 566) { this._startGame(); return true; }
    // Co-op button: y 580-626
    if (pos.y >= 580 && pos.y <= 626) { this.state = 'COOP_LOBBY'; this.coopLobby.state = 'menu'; return true; }
    return false;
  }

  _handleCoopLobbyTap(pos) {
    const action = this.coopLobby.handleTouch(pos.x, pos.y, this.net);
    if (action === 'create') {
      this.coopLobby.state = 'connecting';
      this.net.createRoom(COOP_SERVER_URL);
    } else if (action === 'join') {
      this.coopLobby.state = 'connecting';
      this.net.joinRoom(this.coopLobby.inputCode, COOP_SERVER_URL);
    } else if (action === 'start') {
      this.net.startGame();
    } else if (action === 'back') {
      this.net.disconnect();
      this.state = STATE.INTRO;
    } else if (action === 'cancel') {
      this.net.disconnect();
      this.coopLobby.state = 'menu';
    }
  }

  _getCanvasPos(cx, cy) {
    const r = this.canvas.getBoundingClientRect();
    return { x: (cx-r.left)*(WIDTH/r.width), y: (cy-r.top)*(HEIGHT/r.height) };
  }

  _onTouch(e) {
    e.preventDefault();
    if (this._inputLock <= 0) {
      if (this.state === STATE.INTRO && e.changedTouches.length > 0) {
        const pos = this._getCanvasPos(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        if (this._handleIntroTap(pos)) return;
        return;
      }
      if (this.state === 'COOP_LOBBY' && e.changedTouches.length > 0) {
        const pos = this._getCanvasPos(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        this._handleCoopLobbyTap(pos);
        return;
      }
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
    const pad = 8; // extra padding for easier tapping
    for (const [key, btn] of Object.entries(JBTN)) {
      if (pos.x >= btn.x - pad && pos.x <= btn.x + btn.w + pad &&
          pos.y >= btn.y - pad && pos.y <= btn.y + btn.h + pad) {
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
      if (this.state === STATE.INTRO) { if (this._handleIntroTap(pos)) return; return; }
      if (this.state === 'COOP_LOBBY') { this._handleCoopLobbyTap(pos); return; }
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
