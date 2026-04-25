// ═══════════════════════════════════════════════════
//  js/game.js  —  Tiny Guardian
//  Main loop, state machine, input, audio, joypad
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════
//  CharSelectScreen — เลือกตัวละครก่อนเริ่มเกม
// ═══════════════════════════════════════════════════
class CharSelectScreen {
  constructor() {
    this.reset();
  }

  // playerCount=1 (solo) หรือ 2 (coop)
  // onDone(p1Key, p2Key) — callback เมื่อเลือกครบ
  init(playerCount, onDone, mode) {
    this.playerCount = playerCount;
    this._mode = mode || 'solo';
    this.onDone = onDone;
    this.chars = ['player','player2','player3','player4'];
    this.labels = ['🟡 P1','🔵 P2','🟢 P3','🔴 P4'];
    this.colors = [COL.PRIMARY, COL.SKY_BLUE, COL.MINT, COL.SOFT_RED];
    this.cursor = [0, 1];
    this.chosen = [null, null];
    this.currentPlayer = 0;
    this._flash = 0;
    this._takenByOther = null; // online: char ที่ opponent เลือกแล้ว
  }

  reset() {
    this.playerCount = 1;
    this.onDone = null;
    this.chars = ['player','player2','player3','player4'];
    this.cursor = [0, 1];
    this.chosen = [null, null];
    this.currentPlayer = 0;
    this._flash = 0;
    this._takenByOther = null;
  }

  // input: { left, right, btnA } — ทุก field เป็น edge-detected (justPressed) แล้ว
  handleInput(input) {
    const p = this.currentPlayer;

    if (input.left)  this._moveCursor(p, -1);
    if (input.right) this._moveCursor(p,  1);

    if (input.btnA) {
      const key = this.chars[this.cursor[p]];
      this.chosen[p] = key;

      if (this.playerCount === 1 || this.currentPlayer === 1) {
        this.onDone && this.onDone(this.chosen[0], this.chosen[1]);
      } else {
        this.currentPlayer = 1;
        this.cursor[1] = (this.cursor[0] + 1) % this.chars.length;
      }
    }
  }

  _moveCursor(p, dir) {
    const len = this.chars.length;
    let next = (this.cursor[p] + dir + len) % len;
    // ข้าม slot ที่อีก player เลือกไปแล้ว หรือที่ถูกล็อกโดย online opponent
    const otherChosen = p === 0 ? this.chosen[1] : this.chosen[0];
    let tries = 0;
    while (tries < len) {
      const isTakenByChosen = this.chars[next] === otherChosen;
      const isTakenByOther  = this._takenByOther && this.chars[next] === this._takenByOther;
      if (!isTakenByChosen && !isTakenByOther) break;
      next = (next + dir + len) % len;
      tries++;
    }
    this.cursor[p] = next;
  }

  update(dt) {
    this._flash += dt;
  }

  draw(ctx, images) {
    // BG
    const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    grad.addColorStop(0, '#FFF8E1'); grad.addColorStop(1, '#FFE082');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    // Title
    ctx.font = 'bold 22px ' + FONT.MAIN;
    ctx.fillStyle = COL.HUD_TEXT;
    ctx.fillText('เลือกตัวละคร', WIDTH/2, 52);

    // แสดงว่า Player ไหนกำลังเลือก
    const pLabel = this.currentPlayer === 0 ? '🟡 Player 1 กรุณาเลือก' : '🔵 Player 2 กรุณาเลือก';
    ctx.font = '14px ' + FONT.BODY;
    ctx.fillStyle = this.colors[this.currentPlayer];
    ctx.fillText(pLabel, WIDTH/2, 82);

    // วาด 4 ตัวเลือก
    const cardW = 72, cardH = 90, gap = 14;
    const totalW = cardW * 4 + gap * 3;
    const startX = (WIDTH - totalW) / 2;
    const cardY = 120;

    for (let i = 0; i < 4; i++) {
      const key = this.chars[i];
      const cx = startX + i * (cardW + gap);
      const isChosen0 = this.chosen[0] === key;
      const isChosen1 = this.chosen[1] === key;
      const isCurP = this.cursor[this.currentPlayer] === i;
      const isTakenByOther = this._takenByOther === key;
      const isTaken = (isChosen0 && this.currentPlayer === 1) || (isChosen1 && this.currentPlayer === 0) || isTakenByOther;

      // Card BG
      ctx.fillStyle = isTaken ? 'rgba(200,200,200,0.5)' :
                      isChosen0 || isChosen1 ? 'rgba(255,213,79,0.5)' :
                      isCurP ? 'rgba(255,236,179,0.95)' : 'rgba(255,248,225,0.7)';
      _rr(ctx, cx, cardY, cardW, cardH, 12); ctx.fill();

      // Border
      ctx.strokeStyle = isCurP ? (this.currentPlayer === 0 ? COL.PRIMARY_D : COL.SKY_BLUE) :
                        isChosen0 ? COL.PRIMARY_D :
                        isChosen1 ? '#1E88E5' : 'rgba(255,213,79,0.5)';
      ctx.lineWidth = isCurP ? 3 : 1.5;
      _rr(ctx, cx, cardY, cardW, cardH, 12); ctx.stroke();

      // รูปตัวละคร
      const img = images && images[key];
      if (img) {
        ctx.save();
        if (isTaken) ctx.globalAlpha = 0.3;
        const aspect = img.width / img.height;
        const dw = cardW - 12, dh = cardH - 28;
        const srcW = aspect > 1.5 ? Math.floor(img.height * (PLAYER_W / PLAYER_H)) : img.width;
        ctx.drawImage(img, 0, 0, srcW, img.height, cx + 6, cardY + 4, dw, dh);
        ctx.restore();
      } else {
        // Fallback circle
        ctx.fillStyle = this.colors[i];
        ctx.beginPath(); ctx.arc(cx + cardW/2, cardY + cardH/2 - 8, 24, 0, Math.PI*2); ctx.fill();
      }

      // Label ชื่อ
      ctx.font = '11px ' + FONT.BODY;
      ctx.fillStyle = isTaken ? '#999' : COL.HUD_TEXT;
      ctx.fillText('ตัวที่ ' + (i+1), cx + cardW/2, cardY + cardH - 10);

      // แสดงว่า P1/P2 เลือกไปแล้ว
      if (isChosen0) {
        ctx.font = 'bold 10px ' + FONT.BODY;
        ctx.fillStyle = COL.PRIMARY_D;
        ctx.fillText('P1 ✓', cx + cardW/2, cardY - 12);
      }
      if (isChosen1 && this.playerCount > 1) {
        ctx.font = 'bold 10px ' + FONT.BODY;
        ctx.fillStyle = '#1E88E5';
        ctx.fillText('P2 ✓', cx + cardW/2, cardY - 12);
      }
      if (isTakenByOther) {
        ctx.font = 'bold 10px ' + FONT.BODY;
        ctx.fillStyle = '#E53935';
        ctx.fillText('ถูกใช้', cx + cardW/2, cardY - 12);
      }

      // Cursor blink arrow
      if (isCurP && Math.floor(this._flash * 3) % 2 === 0) {
        ctx.font = '18px ' + FONT.BODY;
        ctx.fillStyle = this.currentPlayer === 0 ? COL.PRIMARY_D : '#1E88E5';
        ctx.fillText('▼', cx + cardW/2, cardY - 20);
      }
    }

    // Instructions
    const instrY = cardY + cardH + 30;
    ctx.font = '13px ' + FONT.BODY;
    ctx.fillStyle = COL.HUD_TEXT;
    ctx.fillText('◀ ▶ เลือก    A ยืนยัน', WIDTH/2, instrY);

    // แสดง P1 ที่เลือกแล้ว (ถ้า 2 คนและ P2 กำลังเลือก)
    if (this.playerCount > 1 && this.currentPlayer === 1 && this.chosen[0]) {
      ctx.font = '12px ' + FONT.BODY;
      ctx.fillStyle = COL.PRIMARY_D;
      ctx.fillText('P1 เลือก: ตัวที่ ' + (this.chars.indexOf(this.chosen[0]) + 1) + '  ตอนนี้ P2 กรุณาเลือก', WIDTH/2, instrY + 24);
    }

    // Virtual Joypad — P1 ใช้ joypad, P2 (local coop) ใช้ keyboard hint
    if (this.currentPlayer === 0 || this._mode !== 'local') {
      this._drawSelectJoypad(ctx);
    } else {
      // P2 กำลังเลือก — แสดง keyboard hint แทน
      const jY = HEIGHT - JOYPAD_H;
      const jG = ctx.createLinearGradient(0, jY, 0, HEIGHT);
      jG.addColorStop(0, 'rgba(255,236,179,0.92)'); jG.addColorStop(1, 'rgba(255,224,130,0.95)');
      ctx.fillStyle = jG; ctx.fillRect(0, jY, WIDTH, JOYPAD_H);
      ctx.fillStyle = COL.PRIMARY; ctx.fillRect(0, jY, WIDTH, 2);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 14px ' + FONT.MAIN;
      ctx.fillStyle = '#1E88E5';
      ctx.fillText('🎹 P2 ใช้ Keyboard', WIDTH/2, jY + 30);
      ctx.font = '13px ' + FONT.BODY;
      ctx.fillStyle = COL.HUD_TEXT;
      ctx.fillText('← → เลื่อน    P ยืนยัน', WIDTH/2, jY + 58);
      ctx.font = '11px ' + FONT.BODY;
      ctx.fillStyle = 'rgba(93,64,55,0.6)';
      ctx.fillText('(Arrow Left / Arrow Right / P)', WIDTH/2, jY + 80);
    }
  }

  _drawSelectJoypad(ctx) {
    const jG = ctx.createLinearGradient(0, HEIGHT-JOYPAD_H, 0, HEIGHT);
    jG.addColorStop(0, 'rgba(255,236,179,0.92)');
    jG.addColorStop(1, 'rgba(255,224,130,0.95)');
    ctx.fillStyle = jG;
    ctx.fillRect(0, HEIGHT-JOYPAD_H, WIDTH, JOYPAD_H);
    ctx.fillStyle = COL.PRIMARY;
    ctx.fillRect(0, HEIGHT-JOYPAD_H, WIDTH, 2);

    // วาดเฉพาะ LEFT, RIGHT, A
    const keys = ['LEFT','RIGHT','A'];
    for (const key of keys) {
      const btn = JBTN[key];
      const isActive = this._joyActive && this._joyActive[key];
      const col = (key==='LEFT'||key==='RIGHT') ? COL.JOYPAD_LEFT : COL.JOYPAD_BTN_A;
      const bx=btn.x, by=btn.y, bw=btn.w, bh=btn.h, r=12;

      ctx.save();
      // Shadow
      ctx.fillStyle='rgba(0,0,0,0.1)';
      ctx.beginPath();ctx.moveTo(bx+r,by+3);ctx.lineTo(bx+bw-r,by+3);ctx.quadraticCurveTo(bx+bw,by+3,bx+bw,by+r+3);ctx.lineTo(bx+bw,by+bh-r+3);ctx.quadraticCurveTo(bx+bw,by+bh+3,bx+bw-r,by+bh+3);ctx.lineTo(bx+r,by+bh+3);ctx.quadraticCurveTo(bx,by+bh+3,bx,by+bh-r+3);ctx.lineTo(bx,by+r+3);ctx.quadraticCurveTo(bx,by+3,bx+r,by+3);ctx.closePath();ctx.fill();
      // Body
      ctx.fillStyle = isActive ? '#FFF' : col;
      ctx.globalAlpha = isActive ? 0.95 : 0.8;
      ctx.beginPath();ctx.moveTo(bx+r,by);ctx.lineTo(bx+bw-r,by);ctx.quadraticCurveTo(bx+bw,by,bx+bw,by+r);ctx.lineTo(bx+bw,by+bh-r);ctx.quadraticCurveTo(bx+bw,by+bh,bx+bw-r,by+bh);ctx.lineTo(bx+r,by+bh);ctx.quadraticCurveTo(bx,by+bh,bx,by+bh-r);ctx.lineTo(bx,by+r);ctx.quadraticCurveTo(bx,by,bx+r,by);ctx.closePath();ctx.fill();
      // Border
      ctx.strokeStyle = isActive ? col : 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 2.5; ctx.stroke();
      ctx.globalAlpha = 1;
      // Label
      ctx.font = '20px '+FONT.MAIN;
      ctx.fillStyle = isActive ? col : COL.HUD_TEXT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, bx+bw/2, by+bh/2-6);
      // Hint
      const hint = key === 'A' ? 'เลือก' : (key === 'LEFT' ? 'ซ้าย' : 'ขวา');
      ctx.font = '9px '+FONT.BODY;
      ctx.fillStyle = isActive ? col : 'rgba(93,64,55,0.5)';
      ctx.fillText(hint, bx+bw/2, by+bh-8);
      ctx.restore();
    }
  }
}

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
    this.charSelect = new CharSelectScreen();
    this._pendingMode = null; // 'solo' | 'local' | 'online'
    this._selPrev = { p1:{left:false,right:false,btnA:false}, p2:{left:false,right:false,btnA:false} };
    this._myCharKey = null;     // charKey ของ player เราเอง
    this._hostCharKey = null;   // charKey ที่ Host เลือก (รับผ่าน p1_char event)
    this._guestCharKey = null;  // charKey ที่ Guest เลือก (รับผ่าน p2_char event)

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
    this.difficulty = DIFFICULTY.MEDIUM; // default

    this.input = { left:false, right:false, btnA:false, btnB:false };
    this._prevBtnA = false;
    this._touches = {};
    this._inputLock = 0;

    this.particles = [];
    this.introTimer = 0;

    // Screen Time
    this._sessionMs = 0;          // เวลาเล่นสะสมใน session นี้
    this._breakTimer = 0;         // countdown พักที่เหลือ (ms)
    this._breakActive = false;

    // Co-op helpers
    this._coopHpOverride = null;
    this._tallyPending = false;
    this._tallyPayload = null;
    this._waitingForTally = false;
    this._stage4Timer = 0; // fallback: Guest ค้าง Stage 4 นานเกิน 30s → self tally
    this.localCoop = false;   // Local 2-player (same device)
    this.input2 = { left:false, right:false, btnA:false, btnB:false };
    this._prevBtnA2 = false;

    this._audioCtx = window._audioCtx || null;
    this._lastTime = 0;
    this._raf = null;

    // BGM fade timer
    this._bgmFadeTimer = null;

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
          // Host เริ่มเกมโดยตรงแล้วใน _handleCoopLobbyTap — ไม่ต้องทำซ้ำ
          if (this.net.isHost) break;
          // Guest: รับ diff+chp จาก Host แล้วเริ่มเกม
          if (data && data.diff && DIFFICULTY[data.diff]) this.difficulty = DIFFICULTY[data.diff];
          if (data && data.chp) this._coopHpOverride = data.chp;
          this._startCoopGame();
          break;
        case 'peer_left':
          this.hud.addNotification('⚠️ เพื่อนออกจากห้อง');
          if (this.state === 'COOP_LOBBY') {
            this.coopLobby.state = 'menu';
          } else if (this.state === STATE.PLAYING || this.state === STATE.STAGE_CLEAR) {
            this.hud.addNotification('เล่นต่อคนเดียว...');
            // If we were Guest, transfer P2→P1
            if (this.net.isGuest || this._wasGuest) {
              if (this.player2 && this.player2.hp > 0) {
                this.player.x = this.player2.x; this.player.y = this.player2.y;
                this.player.hp = this.player2.hp; this.player.maxHp = this.player2.maxHp;
                this.player.score = this.player2.score;
              }
            }
            this.coopMode = false;
            this.player.isP2 = false;
            this.player.coopActive = false;
            this.player2 = null;
            this._wasGuest = false;
            this._lastHostStateTime = 0;
            this.net.disconnect();
          }
          break;
        case 'error':
          if (this.state === 'COOP_LOBBY') {
            this.coopLobby.state = 'error';
            this.coopLobby.errorMsg = data || 'เกิดข้อผิดพลาด';
          } else {
            this.hud.addNotification('⚠️ ' + (data || 'ขัดข้อง'));
          }
          break;
        case 'disconnected':
          if (this.state === 'COOP_LOBBY') {
            if (this.coopLobby.state === 'connecting') {
              this.coopLobby.state = 'error';
              this.coopLobby.errorMsg = 'เชื่อมต่อไม่ได้ — ลองใหม่';
            }
          }
          break;
        case 'peer_event':
          this._handlePeerEvent(data);
          break;
      }
    };
  }

  _startCoopGame() {
    if (this.net.isHost) {
      this.charSelect.init(1, (p1Key) => {
        this._myCharKey = p1Key || 'player';
        // ส่ง p1Key ให้ Guest ล่วงหน้า เพื่อให้ Guest ล็อก slot นั้น
        this.net.sendEvent('p1_char', { key: this._myCharKey });
        this._doStartCoopGame(p1Key, this._guestCharKey || null);
      }, 'online');
      this.state = STATE.SELECT;
      this._inputLock = 300;
      this._selPrev = { p1:{left:false,right:false,btnA:false}, p2:{left:false,right:false,btnA:false} };
    } else {
      // Guest: ถ้าได้รับ p1Key จาก Host แล้ว → ล็อก slot นั้น
      this.charSelect.init(1, (p2Key) => {
        this._myCharKey = p2Key || 'player2';
        this.net.sendEvent('p2_char', { key: this._myCharKey });
        this._doStartCoopGame(this._hostCharKey || null, p2Key);
      }, 'online');
      if (this._hostCharKey) {
        this.charSelect._takenByOther = this._hostCharKey;
      }
      this.state = STATE.SELECT;
      this._inputLock = 300;
      this._selPrev = { p1:{left:false,right:false,btnA:false}, p2:{left:false,right:false,btnA:false} };
    }
  }

  _doStartCoopGame(p1Key, p2Key) {
    this.coopMode = true;
    this._wasGuest = false;
    this._lastHostStateTime = 0;
    this._prevP2BtnA = false;
    this._prevP2BtnA_host = false;

    const chp = this._coopHpOverride || this.difficulty.coopHp;
    this._coopHpOverride = null;

    this.player.reset(); this.player.maxHp = chp; this.player.hp = chp;
    this.player.charKey = p1Key || 'player';
    this.player.coopActive = true;
    this.player.isP2 = false;

    this.player2 = new Player();
    this.player2.reset(); this.player2.maxHp = chp; this.player2.hp = chp;
    this.player2.charKey = p2Key || 'player2';
    this.player2.isP2 = true;
    this.player2.coopActive = true;
    this.player2.x = WIDTH - PLAYER_W - 30;

    this.boss = null;
    this.currentStage = 1; this.currentWave = 0;
    this.stagesCleared = 0; this.timeBonuses = [];
    this.particles = [];
    this._stageClearing = false;

    this._startStage(1);
    this.state = STATE.PLAYING;
  }

  _handlePeerEvent(data) {
    if (!data || !data.event) return;
    if (data.event === 'sfx') this.playSfx(data.name);
    if (data.event === 'set_difficulty' && data.diff && DIFFICULTY[data.diff]) {
      this.difficulty = DIFFICULTY[data.diff];
    }
    if (data.event === 'set_coop_start') {
      if (data.diff && DIFFICULTY[data.diff]) this.difficulty = DIFFICULTY[data.diff];
      if (data.chp) this._coopHpOverride = data.chp;
    }
    // Host ส่ง p1Key → Guest รับและล็อก slot นั้น
    if (data.event === 'p1_char') {
      this._hostCharKey = data.key;
      // ถ้ากำลังอยู่ใน SELECT screen → update _takenByOther ทันที
      if (this.state === STATE.SELECT) {
        this.charSelect._takenByOther = data.key;
        // ถ้า cursor ชนกัน → เลื่อน
        if (this.charSelect.chars[this.charSelect.cursor[0]] === data.key) {
          this.charSelect._moveCursor(0, 1);
        }
      }
    }
    // Guest ส่ง p2Key → Host รับและเก็บไว้
    if (data.event === 'p2_char') {
      this._guestCharKey = data.key;
      // อัพเดต charKey ของ player2 บน Host ทันที
      if (this.player2) this.player2.charKey = data.key;
    }
  }

  start() {
    this.state = STATE.INTRO;
    this.player.reset();
    this.introTimer = 0;
    this._lastTime = performance.now();
    this._loadScreenTime();
    this._bindVisibility();
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

    // ── Screen Time ──────────────────────────────────
    if (this._breakActive) {
      this._breakTimer -= dt * 1000;
      if (this._breakTimer <= 0) {
        // พักครบแล้ว → reset และเล่นต่อ
        this._breakActive = false;
        this._breakTimer = 0;
        this._sessionMs = 0;
        this._saveScreenTime();
      }
      return;
    }
    if (this.state === STATE.PLAYING || this.state === STATE.STAGE_CLEAR) {
      this._sessionMs += dt * 1000;
      // save ทุก 1 นาที — ป้องกัน refresh หรือ crash
      if (!this._lastScreenTimeSave) this._lastScreenTimeSave = Date.now();
      if (Date.now() - this._lastScreenTimeSave >= 60 * 1000) {
        this._saveScreenTime();
        this._lastScreenTimeSave = Date.now();
      }
      if (this._sessionMs >= SCREEN_TIME_LIMIT_MS) {
        this._triggerBreak();
        return;
      }
    }

    switch (this.state) {
      case STATE.INTRO:    this.introTimer += dt; this._stopBGM('bgm'); break;
      case 'COOP_LOBBY':   this.coopLobby.update(dt); this._stopBGM('bgm'); break;
      case STATE.PLAYING:
        this._updatePlaying(dt);
        if (this.coopMode && (this.player2 || (this.net && this.net.isGuest))) this._updateCoop(dt);
        this._playBGM('bgm');
        break;
      case STATE.STAGE_CLEAR:
        if (!(this.coopMode && this.net && this.net.isGuest)) {
          this.stageClearTimer -= dt;
          if (this.stageClearTimer <= 0) {
            if (this.currentStage > 4) this._goTally();
            else this._startStage(this.currentStage);
          }
        }
        if (this.coopMode && (this.player2 || (this.net && this.net.isGuest))) {
          this._updateCoop(dt);
        }
        this._playBGM('bgm');
        break;
      case STATE.GAME_OVER:
        if (!(this.coopMode && this.net && this.net.isGuest)) {
          this.stageClearTimer -= dt;
          if (this.stageClearTimer <= 0) this._goTally();
        }
        if (this.coopMode && (this.player2 || (this.net && this.net.isGuest))) { this._updateCoop(dt); }
        this._bgmFadeOut(2.0);
        break;
      case STATE.TALLY:
        this.tally.update(dt);
        this._stopBGM('bgm');
        // HOST: ส่ง tallyPayload ซ้ำทุก frame จนกว่า Guest disconnect (reliable delivery)
        if (this._tallyPending && this.net && this.net.isHost && this.net.connected) {
          this.net.sendGameState(this._tallyPayload);
        }
        // HOST: ถ้า Guest disconnect แล้ว → cleanup coop
        if (this._tallyPending && this.net && this.net.isHost && !this.net.connected) {
          this.coopMode = false;
          this._tallyPending = false;
          this._tallyPayload = null;
        }
        // Guest: ยังรับ pending TALLY packet จาก Host ได้ (กรณี packet มาช้า)
        if (this.net && this.net.isGuest && this.net.peerState) {
          const ps = this.net.peerState;
          this.net.peerState = null;
          if (ps.gs === STATE.TALLY) this._applyGuestTally(ps);
        }
        break;
      case STATE.NAME:   this.nameScreen.update(dt); break;
      case STATE.RANKING: this.rankingScreen.update(); break;
      case STATE.SELECT:
        this.charSelect.update(1/60);
        if (this._inputLock <= 0) this._handleSelectInput();
        break;
    }

    for (const p of this.particles) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 200 * dt; p.life -= dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);
    this.hud.update(dt);
  }

  _updatePlaying(dt) {
    // Guest in co-op: skip ALL local physics — just render Host state
    if (this.coopMode && this.net.isGuest) {
      // Only update visual things
      this.world.update(dt);
      this.hud.update(dt);
      return;
    }

    const jumpJustPressed = this.input.btnA && !this._prevBtnA;
    const inputForPlayer = {
      left: this.input.left, right: this.input.right,
      btnA: this.input.btnA, btnB: this.input.btnB,
      jumpPressed: jumpJustPressed,
    };
    this._prevBtnA = this.input.btnA;

    this.stageTimer -= dt;
    if (this.stageTimer < 0) this.stageTimer = 0;

    // In co-op: skip dead player's update
    if (this.player.hp > 0) {
      this.player.update(dt, inputForPlayer, this.world, this);
    }

    // Local Co-op: P2 keyboard input
    if (this.localCoop && this.player2) {
      const jumpP2 = this.input2.btnA && !this._prevBtnA2;
      this._prevBtnA2 = this.input2.btnA;
      if (this.player2.hp > 0) {
        this.player2.update(dt, {
          left: this.input2.left, right: this.input2.right,
          btnA: this.input2.btnA, btnB: this.input2.btnB,
          jumpPressed: jumpP2,
        }, this.world, this);
      }
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

    if (this.coopMode || this.localCoop) {
      // Co-op: game over only when BOTH players dead
      if (this.player.hp <= 0 && (!this.player2 || this.player2.hp <= 0)) {
        this.playSfx('hit');
        this.state = STATE.GAME_OVER;
        this.stageClearTimer = 2.5;
      }
    } else {
      if (this.player.hp <= 0) {
        this.playSfx('hit');
        this.state = STATE.GAME_OVER;
        this.stageClearTimer = 2.5;
      }
    }
  }

  _updateCoop(dt) {
    // Guest ไม่ต้องการ player2 เพื่อรัน — Host ต้องการ player2
    if (!this.player2 && !(this.net && this.net.isGuest)) return;

    if (this.net.isHost) {
      // Check if Guest disconnected
      if (!this.net.connected) {
        this.hud.addNotification('⚠️ P2 หลุด — เล่นต่อคนเดียว');
        this.coopMode = false;
        this.player2 = null;
        this.player.coopActive = false;
        return;
      }
      // ═══ HOST: full game authority ═══
      const btnANow = this.net.peerInput.btnA;
      const jumpQ = this.net.peerInput._jumpQueued;
      const jumpEdge = btnANow && !this._prevP2BtnA_host;
      this._prevP2BtnA_host = btnANow;
      this.net.peerInput._jumpQueued = false;

      if (this.player2.hp > 0) {
        this.player2.update(dt, {
          left:this.net.peerInput.left, right:this.net.peerInput.right,
          btnA:btnANow, btnB:this.net.peerInput.btnB,
          jumpPressed:jumpQ||jumpEdge,
        }, this.world, this);

        // P2 collisions
        const p2H = this.player2.getHitbox();
        if (!this.player2.invincible) {
          for (const e of this.enemyManager.enemies) { if (!e.dying && this._aabb(p2H,e.getHitbox())) { this.player2.takeDamage(this); break; } }
          if (this.boss && !this.boss.dying && this._aabb(p2H,this.boss.getHitbox())) this.player2.takeDamage(this);
        }
        for (const eb of this.projManager.enemyBullets) { if (eb.alive && this._aabb(p2H,eb.getHitbox())) { eb.alive=false; this.player2.takeDamage(this); } }
        for (const it of this.itemManager.items) {
          if (it.alive && this._aabb(p2H, it.getHitbox())) {
            it.alive = false;
            if (it.healsHp && this.player2.hp < this.player2.maxHp) {
              this.player2.hp++;
              this.hud.addComboPopup('+1 HP', it.x, it.y, COL.HEART_ON);
              this.playSfx('powerup');
            } else if (!it.healsFat && !it.healsHp) {
              this.player2.score += it.points;
              this.player2.itemsCollected++;
              this.playSfx('coin');
              if (it.points > 0) this.hud.addComboPopup('+' + it.points, it.x, it.y, '#42A5F5');
            }
            this._spawnParticles(it.x + it.w/2, it.y + it.h/2, '#42A5F5', 5);
          }
        }
      }

      // Co-op game over — check AFTER P2 collision update
      if (this.player.hp <= 0 && this.player2.hp <= 0 && this.state === STATE.PLAYING) {
        this.playSfx('hit');
        this.state = STATE.GAME_OVER;
        this.stageClearTimer = 2.5;
      }

      // Send FULL state (including bullets + items)
      this.net.sendGameState({
        p1:{x:this.player.x,y:this.player.y,hp:this.player.hp,mhp:this.player.maxHp,facing:this.player.facing,state:this.player.state,score:this.player.score,kills:this.player.kills||0,items:this.player.itemsCollected||0,grounded:this.player.grounded,invincible:this.player.invincible,animFrame:this.player.animFrame,charging:this.player.charging,chargeTime:this.player.chargeTime||0,ck:this.player.charKey||'player'},
        p2:{x:this.player2.x,y:this.player2.y,hp:this.player2.hp,mhp:this.player2.maxHp,facing:this.player2.facing,state:this.player2.state,score:this.player2.score,kills:this.player2.kills||0,items:this.player2.itemsCollected||0,grounded:this.player2.grounded,invincible:this.player2.invincible,animFrame:this.player2.animFrame,charging:this.player2.charging,chargeTime:this.player2.chargeTime||0,ck:this.player2.charKey||'player2'},
        en:this.enemyManager.enemies.map(e=>({x:e.x,y:e.y,t:e.type,a:e.alive,d:e.dying,g:e.angry,f:e.facing,dt:e.dieTimer})),
        bo:this.boss?{x:this.boss.x,y:this.boss.y,hp:this.boss.hp,mhp:this.boss.maxHp,a:this.boss.alive,d:this.boss.dying,f:this.boss.facing,s:this.boss.state,ag:this.boss.isAngry,fl:this.boss.flashTimer,fin:this.boss.isFinal,ph:this.boss.phase}:null,
        pb:this.projManager.playerBullets.filter(b=>b.alive).map(b=>({x:b.x,y:b.y,d:b.dir,c:b.charged})),
        eb:this.projManager.enemyBullets.filter(b=>b.alive).map(b=>({x:b.x,y:b.y})),
        it:this.itemManager.items.filter(i=>i.alive).map(i=>({x:i.x,y:i.y,t:i.type})),
        ti:this.stageTimer,gs:this.state,st:this.currentStage,sc:this.stagesCleared,tb:this.timeBonuses,
      });

    } else if (this.net.isGuest) {
      // ═══ GUEST: pure renderer — no physics ═══
      if (!this.net.connected) {
        this.hud.addNotification('⚠️ หลุดจาก Host — เล่นต่อคนเดียว');
        this.coopMode = false;
        // Transfer P2 state to P1 properly
        if (this.player2 && this.player2.hp > 0) {
          this.player.x = this.player2.x; this.player.y = this.player2.y;
          this.player.hp = this.player2.hp; this.player.maxHp = this.player2.maxHp;
          this.player.score = this.player2.score;
          this.player.vy = this.player2.vy;
          this.player.grounded = this.player2.grounded;
        }
        this.player.isP2 = false;  // Reset to P1 appearance
        this.player.coopActive = false;
        this.player2 = null;
        this.net.disconnect();
        this._lastHostStateTime = 0;
        return;
      }

      // Track last received state — if stale > 5s, switch to solo
      if (this.net.peerState) this._lastHostStateTime = Date.now();
      if (!this._lastHostStateTime) this._lastHostStateTime = Date.now();

      // Fallback: ถ้า Guest อยู่ Stage 4 นานเกิน 30s → self tally
      if (this.coopMode && this.currentStage >= 4 &&
          (this.state === STATE.PLAYING || this.state === STATE.STAGE_CLEAR)) {
        if (!this._stage4Timer) this._stage4Timer = Date.now();
        if (Date.now() - this._stage4Timer > 30000) {
          this.hud.addNotification('⏱ โหลด Tally อัตโนมัติ');
          this._guestSelfTally();
          return;
        }
      } else {
        this._stage4Timer = 0; // reset ถ้าออกจาก Stage 4
      }

      if (Date.now() - this._lastHostStateTime > 5000) {
        // ถ้ากำลังรอ TALLY → แสดง tally ด้วยข้อมูลที่มี แทนที่จะ solo switch
        if (this._waitingForTally) {
          this._waitingForTally = false;
          this.tally.init(this.player, this.stagesCleared, this.timeBonuses || []);
          this.state = STATE.TALLY;
          this._inputLock = 800;
          this.coopMode = false;
          this.player2 = null;
          this.player.coopActive = false;
          this.net.disconnect();
          this._lastHostStateTime = 0;
          return;
        }
        this.hud.addNotification('⚠️ Host ไม่ตอบ — เล่นต่อคนเดียว');
        this.coopMode = false;
        if (this.player2 && this.player2.hp > 0) {
          this.player.x = this.player2.x; this.player.y = this.player2.y;
          this.player.hp = this.player2.hp; this.player.maxHp = this.player2.maxHp;
          this.player.score = this.player2.score;
        }
        this.player.isP2 = false;
        this.player.coopActive = false;
        this.player2 = null;
        this.net.disconnect();
        this._lastHostStateTime = 0;
        return;
      }

      this.net.sendInput({left:this.input.left,right:this.input.right,btnA:this.input.btnA,btnB:this.input.btnB,jumpPressed:this.input.btnA&&!this._prevP2BtnA});
      this._prevP2BtnA = this.input.btnA;
      this._wasGuest = true;

      const s = this.net.peerState;
      if (!s) return;

      // ── Players ──
      if(s.p1){const p=this.player;p.x=s.p1.x;p.y=s.p1.y;p.hp=s.p1.hp;if(s.p1.mhp)p.maxHp=s.p1.mhp;p.facing=s.p1.facing;p.state=s.p1.state;p.score=s.p1.score;if(s.p1.kills!==undefined)p.kills=s.p1.kills;if(s.p1.items!==undefined)p.itemsCollected=s.p1.items;p.grounded=s.p1.grounded;p.invincible=s.p1.invincible;p.animFrame=s.p1.animFrame;p.charging=s.p1.charging;p.chargeTime=s.p1.chargeTime||0;if(s.p1.ck)p.charKey=s.p1.ck;}
      if(s.p2&&this.player2){const p=this.player2;p.x=s.p2.x;p.y=s.p2.y;p.hp=s.p2.hp;if(s.p2.mhp)p.maxHp=s.p2.mhp;p.facing=s.p2.facing;p.state=s.p2.state;p.score=s.p2.score;if(s.p2.kills!==undefined)p.kills=s.p2.kills;if(s.p2.items!==undefined)p.itemsCollected=s.p2.items;p.grounded=s.p2.grounded;p.invincible=s.p2.invincible;p.animFrame=s.p2.animFrame;p.charging=s.p2.charging;p.chargeTime=s.p2.chargeTime||0;if(s.p2.ck)p.charKey=s.p2.ck;}

      // ── Enemies ──
      if(s.en){
        while(this.enemyManager.enemies.length<s.en.length) this.enemyManager.enemies.push(new EnemyUnit('ERASER',0,0));
        this.enemyManager.enemies.length=s.en.length;
        for(let i=0;i<s.en.length;i++){
          const e=this.enemyManager.enemies[i],se=s.en[i];
          e.x=se.x;e.y=se.y;e.alive=se.a;e.dying=se.d;e.angry=se.g;e.facing=se.f;e.dieTimer=se.dt||0;e.spawnShield=0;
          if(se.t&&ENEMY[se.t]){e.type=se.t;e.def=ENEMY[se.t];e.w=e.def.w;e.h=e.def.h;}
        }
      }

      // ── Boss ──
      if(s.bo){
        if(!this.boss){
          try{
            const cfg=s.bo.fin?BOSS:MINIBOSS;
            this.boss=new BossUnit(cfg,s.bo.x,s.bo.y,!!s.bo.fin);
          }catch(e){console.error('Boss create err:',e);}
        }
        if(this.boss){
          const b=this.boss,sb=s.bo;
          b.x=sb.x;b.y=sb.y;b.hp=sb.hp;b.maxHp=sb.mhp;b.alive=sb.a;b.dying=sb.d;b.facing=sb.f;b.state=sb.s;b.flashTimer=sb.fl||0;
          // phase for final boss
          if(sb.ph!==undefined)b.phase=sb.ph;
        }
      } else if(s.bo===null) {
        this.boss=null;
      }

      // ── Player bullets (always sync, independent from boss) ──
      if(s.pb!==undefined){
        this.projManager.playerBullets=[];
        for(const b of s.pb){
          try{
            const pb=new Projectile(b.x,b.y,b.d||1,b.c,0);
            pb.trail=[];
            this.projManager.playerBullets.push(pb);
          }catch(e){}
        }
      }

      // ── Enemy bullets ──
      if(s.eb!==undefined){
        this.projManager.enemyBullets=[];
        for(const b of s.eb){
          try{
            const eb=new EnemyProjectile(b.x,b.y,0,0,'normal');
            eb.x=b.x;eb.y=b.y;
            this.projManager.enemyBullets.push(eb);
          }catch(e){}
        }
      }

      // ── Items ──
      if(s.it!==undefined){
        this.itemManager.items=[];
        for(const si of s.it){
          try{
            const it=new ItemUnit(si.t||'COIN',si.x,si.y,this.currentStage);
            it.alive=true;it.grounded=true;
            this.itemManager.items.push(it);
          }catch(e){}
        }
      }

      // ── Timer ──
      if(s.ti!==undefined) this.stageTimer=s.ti;

      // ── Stage change — apply BEFORE state transition so currentStage is correct ──
      if(s.st&&s.st!==this.currentStage){
        this.currentStage=s.st;
        this.world.loadStage(s.st);
        this.boss=null;
      }

      // ── Stages cleared count from Host — apply BEFORE state transition ──
      if(s.sc!==undefined) this.stagesCleared=s.sc;
      if(s.tb && Array.isArray(s.tb) && s.tb.length > 0) this.timeBonuses=s.tb;

      // ── Game state transition ──
      if(s.gs && s.gs!==this.state){
        const newState=s.gs;
        if(newState===STATE.STAGE_CLEAR){
          const stageNum = s.st || this.currentStage;
          if(stageNum > 4) {
            // Stage 4 จบแล้ว — Guest สร้าง Tally เองทันที ไม่รอ Host
            this._guestSelfTally();
          } else {
            this.state=STATE.STAGE_CLEAR;
            this.stageClearTimer=2.5;
            this.hud.addNotification('✨ Stage Clear!');
          }
        } else if(newState===STATE.GAME_OVER){
          this.state=STATE.GAME_OVER;
          this.stageClearTimer=2.5;
        } else if(newState===STATE.TALLY){
          // ถ้า Host ส่ง TALLY มาด้วย (กรณี timing ช้า) — ใช้ได้เช่นกัน
          if(this.state !== STATE.TALLY) this._applyGuestTally(s);
        } else {
          this.state=newState;
        }
      }

      this.net.peerState=null;
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
          if (enemy.dying) this._onEnemyKill(enemy, bullet.owner);
          break;
        }
      }
      // vs boss
      if (this.boss && !this.boss.dying && bullet.alive) {
        if (this._aabb(bH, this.boss.getHitbox())) {
          this.boss.takeDamage(bullet.damage, this);
          if (bullet.pierce > 0) bullet.pierce--; else bullet.alive = false;
          if (this.boss && this.boss.dying) this._onBossKill(bullet.owner);
        }
      }
    }

    // Enemy bullets vs player (skip if dead)
    if (this.player.hp > 0) {
      for (const eb of this.projManager.enemyBullets) {
        if (!eb.alive) continue;
        if (this._aabb(pH, eb.getHitbox())) {
          eb.alive = false;
          this.player.takeDamage(this);
        }
      }
    }

    // Enemies contact player (skip if dead)
    if (this.player.hp > 0 && !this.player.invincible) {
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

    // Items P1
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
        } else {
          this.player.score += item.points;
          this.player.itemsCollected++;
          this.playSfx('coin');
          if (item.points > 0) this.hud.addComboPopup('+' + item.points, item.x, item.y, COL.PRIMARY);
        }
        this._spawnParticles(item.x + item.w/2, item.y + item.h/2, COL.PRIMARY, 5);
      }
    }

    // Local Co-op: P2 collisions (same as online coop P2 block)
    if (this.localCoop && this.player2) {
      const p2H = this.player2.getHitbox();
      if (!this.player2.invincible) {
        for (const e of this.enemyManager.enemies) {
          if (!e.dying && this._aabb(p2H, e.getHitbox())) { this.player2.takeDamage(this); break; }
        }
        if (this.boss && !this.boss.dying && this._aabb(p2H, this.boss.getHitbox())) {
          this.player2.takeDamage(this);
        }
      }
      for (const eb of this.projManager.enemyBullets) {
        if (eb.alive && this._aabb(p2H, eb.getHitbox())) { eb.alive = false; this.player2.takeDamage(this); }
      }
      for (const it of this.itemManager.items) {
        if (it.alive && this._aabb(p2H, it.getHitbox())) {
          it.alive = false;
          if (it.healsHp && this.player2.hp < this.player2.maxHp) {
            this.player2.hp++;
            this.hud.addComboPopup('+1 HP', it.x, it.y, COL.HEART_ON);
            this.playSfx('powerup');
          } else if (!it.healsHp) {
            this.player2.score += it.points;
            this.player2.itemsCollected++;
            this.playSfx('coin');
            if (it.points > 0) this.hud.addComboPopup('+' + it.points, it.x, it.y, '#42A5F5');
          }
          this._spawnParticles(it.x + it.w/2, it.y + it.h/2, '#42A5F5', 5);
        }
      }
    }
  }

  _onEnemyKill(enemy, owner) {
    const isP2 = (this.coopMode || this.localCoop) && this.player2 && owner === 'p2';
    const scorer = isP2 ? this.player2 : this.player;
    scorer.kills++;
    scorer.addCombo();
    const mult = scorer.getComboMultiplier();
    const pts = enemy.points * mult;
    scorer.score += pts;
    const popColor = scorer.isP2 ? '#42A5F5' : COL.GOLD;
    this.hud.addComboPopup('+' + pts + (mult > 1 ? ' ×' + mult : ''), enemy.x + enemy.w/2, enemy.y, popColor);
    this.playSfx('enemy_die');
    this.itemManager.dropFromEnemy(enemy.x, enemy.y, this.currentStage);
    this._spawnParticles(enemy.x + enemy.w/2, enemy.y + enemy.h/2, enemy.def.color, 8);
  }

  _onBossKill(owner) {
    if (!this.boss) return;
    const scorer = ((this.coopMode || this.localCoop) && this.player2 && owner === 'p2') ? this.player2 : this.player;
    const pts = this.boss.points;
    scorer.score += pts;
    scorer.kills++;
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
    this.waveDelay = Math.floor(1200 * (this.difficulty ? this.difficulty.spawnDelayMult : 1));
    this.stageTimer = STAGE_TIME[num] || 90;
    this.boss = null;
    this._stageClearing = false;
    this.world.loadStage(num);
    this.enemyManager.reset();
    this.projManager.reset();
    this.itemManager.reset();
    // Reset P1 position
    this.player.x = WIDTH/2 - this.player.w/2;
    this.player.y = GROUND_Y - this.player.h;
    this.player.vy = 0;
    this.player.grounded = true;
    // Reset P2 position if co-op
    if (this.player2) {
      this.player2.x = WIDTH - PLAYER_W - 30;
      this.player2.y = GROUND_Y - this.player2.h;
      this.player2.vy = 0;
      this.player2.grounded = true;
    }
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
      this.boss.hp = Math.ceil(this.boss.hp * this.difficulty.bossHpMult);
      this.boss.maxHp = this.boss.hp;
      this.hud.addNotification('⚠️ บอสปรากฏตัว!');
      this.playSfx('boss_warning');
    } else if (waveData === 'BOSS') {
      const topPlat = this.world.platforms.reduce((a, b) => a.y < b.y ? a : b);
      this.boss = new BossUnit(BOSS, topPlat.x + topPlat.w/2 - BOSS.w/2, topPlat.y - BOSS.h, true);
      this.boss.hp = Math.ceil(this.boss.hp * this.difficulty.bossHpMult);
      this.boss.maxHp = this.boss.hp;
      this.hud.addNotification('⚠️ จอมวายร้ายมาแล้ว!');
      this.playSfx('boss_warning');
    } else {
      this.enemyManager.spawnWave(waveData, this.world, this.player, this.difficulty);
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
    // Merge P2 stats
    if ((this.coopMode || this.localCoop) && this.player2) {
      this.player.score += this.player2.score;
      this.player.kills += this.player2.kills || 0;
      this.player.itemsCollected += this.player2.itemsCollected || 0;
    }

    // เตรียม tally payload — ส่งผ่าน sendGameState loop ทุก 50ms จนกว่า Guest รับ
    this._tallyPayload = {
      p1:{ score:this.player.score, kills:this.player.kills, items:this.player.itemsCollected },
      p2:null, en:[], bo:null, pb:[], eb:[], it:[],
      ti:0, gs:STATE.TALLY, st:this.currentStage, sc:this.stagesCleared,
      tb:this.timeBonuses,
    };

    // ส่งทันที 1 ครั้งก่อน
    if (this.coopMode && this.net && this.net.connected) {
      this.net.forceSendState(this._tallyPayload);
    }

    // cleanup visual ทันที — player2=null ป้องกัน HUD ค้าง
    // cleanup visual ทันที
    this._tallyPending = true;
    this._waitingForTally = false;
    this.player2 = null;
    this.player.coopActive = false;
    // localCoop cleanup ทันที (ไม่ต้องรอ network)
    if (this.localCoop) {
      this.localCoop = false;
      this.input2 = { left:false, right:false, btnA:false, btnB:false };
    }

    this.tally.init(this.player, this.stagesCleared, this.timeBonuses);
    this.state = STATE.TALLY;
    this._inputLock = 800;
  }
  spawnProjectile(x, y, dir, charged, angleY, owner) {
    this.projManager.addPlayerBullet(x, y, dir, charged, angleY, owner);
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
      case STATE.SELECT:      this.charSelect.draw(ctx, this.images); break;
    }
    // Break overlay — วาดทับทุก state
    if (this._breakActive) this._drawBreak(ctx);
    this._drawParticles(ctx);
  }

  _drawIntro(ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    grad.addColorStop(0, '#FFF8E1'); grad.addColorStop(1, '#FFE082');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const titleY = 140 + Math.sin(this.introTimer*2)*8;
    ctx.font = '36px '+FONT.MAIN; ctx.textAlign = 'center';
    ctx.strokeStyle = COL.PRIMARY; ctx.lineWidth = 4;
    ctx.fillStyle = COL.COCOA;
    ctx.strokeText('TINY', WIDTH/2, titleY); ctx.fillText('TINY', WIDTH/2, titleY);
    ctx.strokeText('GUARDIAN', WIDTH/2, titleY+46); ctx.fillText('GUARDIAN', WIDTH/2, titleY+46);

    ctx.font = '14px '+FONT.BODY;
    ctx.fillText('— ผู้พิทักษ์ตัวจิ๋ว —', WIDTH/2, titleY+78);

    // Player character
    ctx.save();
    const py = 300+Math.sin(this.introTimer*3)*5;
    const savedX = this.player.x, savedY = this.player.y;
    this.player.x = WIDTH/2 - PLAYER_W*0.75;
    this.player.y = py;
    this.player.state = 'idle';
    this.player.facing = 1;
    ctx.save();
    const sc = 1.3;
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

    ctx.font = '14px '+FONT.BODY; ctx.fillStyle = COL.COCOA;
    ctx.fillText('ปกป้องโลกจากเหล่าวายร้ายกัน!', WIDTH/2, 395);

    // Difficulty selector
    ctx.font = '12px '+FONT.BODY; ctx.fillStyle = COL.HUD_TEXT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('เลือกระดับการเล่น:', WIDTH/2, 422);
    const diffs = [['EASY','MEDIUM','HARD']];
    const dw=108, dh=34, dg=6, dx0=(WIDTH-(dw*3+dg*2))/2;
    for(let i=0;i<3;i++){
      const key=['EASY','MEDIUM','HARD'][i];
      const x=dx0+i*(dw+dg), y=432;
      const sel=this.difficulty===DIFFICULTY[key];
      ctx.fillStyle=sel?COL.PRIMARY:'rgba(255,236,179,0.6)';
      _rr(ctx,x,y,dw,dh,8);ctx.fill();
      if(sel){ctx.strokeStyle=COL.PRIMARY_D;ctx.lineWidth=2;_rr(ctx,x,y,dw,dh,8);ctx.stroke();}
      ctx.fillStyle=sel?COL.HUD_TEXT:'rgba(93,64,55,0.7)';
      ctx.font=(sel?'bold ':'')+'11px '+FONT.MAIN;
      ctx.fillText(DIFFICULTY[key].label,x+dw/2,y+dh/2);
    }

    // Solo play button
    ctx.fillStyle = COL.PRIMARY;
    _rr(ctx, WIDTH/2-120, 472, 240, 40, 14); ctx.fill();
    ctx.strokeStyle = COL.PRIMARY_D; ctx.lineWidth = 1.5; _rr(ctx, WIDTH/2-120, 472, 240, 40, 14); ctx.stroke();
    ctx.font = '15px '+FONT.MAIN; ctx.fillStyle = COL.HUD_TEXT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🎮 เล่นคนเดียว', WIDTH/2, 492);

    // Local Co-op button
    ctx.fillStyle = COL.MINT;
    _rr(ctx, WIDTH/2-120, 520, 240, 40, 14); ctx.fill();
    ctx.strokeStyle = COL.PRIMARY_D; ctx.lineWidth = 1.5; _rr(ctx, WIDTH/2-120, 520, 240, 40, 14); ctx.stroke();
    ctx.fillStyle = COL.HUD_TEXT;
    ctx.fillText('🎮🎮 2 คน (เครื่องเดียว)', WIDTH/2, 540);

    // Online Co-op button
    ctx.fillStyle = COL.SKY_BLUE;
    _rr(ctx, WIDTH/2-120, 568, 240, 40, 14); ctx.fill();
    ctx.strokeStyle = COL.PRIMARY_D; ctx.lineWidth = 1.5; _rr(ctx, WIDTH/2-120, 568, 240, 40, 14); ctx.stroke();
    ctx.fillStyle = COL.HUD_TEXT;
    ctx.fillText('👥 เล่น 2 คน (Online)', WIDTH/2, 588);

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
    if (this.player2) this.player2.draw(ctx, this.images);
    this.hud.sessionMs = this._sessionMs;
    this.hud.draw(ctx, this.player, this.currentStage, this.stageTimer, (this.coopMode || this.localCoop) ? this.player2 : null);
    this._drawJoypad(ctx);
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
    ctx.fillText('หมดแรงแล้ว! 💫', WIDTH/2, HEIGHT/2-20);
    ctx.font = '16px '+FONT.BODY; ctx.fillStyle = COL.HUD_TEXT;
    ctx.fillText('ลองใหม่นะ! 🌟', WIDTH/2, HEIGHT/2+16);
    ctx.font = '14px '+FONT.BODY;
    ctx.fillText('คะแนน: '+this.player.score.toLocaleString(), WIDTH/2, HEIGHT/2+42);
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
    this.canvas.addEventListener('touchmove', e => { e.preventDefault(); if(this.state===STATE.PLAYING) this._recomputeTouchInput(e.touches); if(this.state===STATE.SELECT) this._recomputeSelectTouch(e.touches); }, {passive:false});
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

    if (['a','d','r','t','arrowleft','arrowright','o','p'].includes(kl)) e.preventDefault();

    // P1 keys: A=ซ้าย, D=ขวา, R=ยิง, T=กระโดด
    if (kl === 'a') this.input.left  = down;
    if (kl === 'd') this.input.right = down;
    if (kl === 'r') this.input.btnB  = down;
    if (kl === 't') this.input.btnA  = down;

    // P2 Local keys: ←=ซ้าย, →=ขวา, O=ยิง, P=กระโดด
    // ทำงานทั้งตอนเล่น (localCoop) และตอนเลือกตัวละคร (SELECT state)
    const isLocalP2Active = this.localCoop && this.player2;
    const isSelectP2 = this.state === STATE.SELECT && this._pendingMode === 'local';
    if (isLocalP2Active || isSelectP2) {
      if (kl === 'arrowleft')  this.input2.left  = down;
      if (kl === 'arrowright') this.input2.right = down;
      if (kl === 'o')          this.input2.btnB  = down;
      if (kl === 'p')          this.input2.btnA  = down;
    }

    if (down && this._inputLock <= 0) {
      if (kl === 't' || kl === 'enter') this._handleConfirm();
    }
  }

  _handleSelectInput() {
    const p = this.charSelect.currentPlayer;

    // เลือก input object ตาม player ที่กำลังเลือก
    const inp = (p === 0) ? this.input : this.input2;

    // prev state แยกกัน P1/P2 และแยก left/right/A ด้วย
    if (!this._selPrev) this._selPrev = {
      p1: { left:false, right:false, btnA:false },
      p2: { left:false, right:false, btnA:false },
    };
    const prev = (p === 0) ? this._selPrev.p1 : this._selPrev.p2;

    // edge detect
    const justLeft  = inp.left  && !prev.left;
    const justRight = inp.right && !prev.right;
    const justA     = inp.btnA  && !prev.btnA;

    // อัพเดต prev
    prev.left  = inp.left;
    prev.right = inp.right;
    prev.btnA  = inp.btnA;

    this.charSelect.handleInput({ left: justLeft, right: justRight, btnA: justA });
  }

  _handleConfirm() {
    if (this.state === STATE.INTRO) this._startGame();
    else if (this.state === STATE.TALLY && this.tally.done) { this.state = STATE.NAME; this.nameScreen.reset(); this._inputLock = 400; }
    else if (this.state === STATE.RANKING) this._restartGame();
  }

  _handleIntroTap(pos) {
    // Difficulty buttons: y 432-466 (dh=34)
    if (pos.y >= 432 && pos.y <= 466) {
      const dw=108, dg=6, dx0=(WIDTH-(dw*3+dg*2))/2;
      if (pos.x >= dx0 && pos.x <= dx0+dw) { this.difficulty = DIFFICULTY.EASY; return true; }
      if (pos.x >= dx0+dw+dg && pos.x <= dx0+dw*2+dg) { this.difficulty = DIFFICULTY.MEDIUM; return true; }
      if (pos.x >= dx0+dw*2+dg*2 && pos.x <= dx0+dw*3+dg*2) { this.difficulty = DIFFICULTY.HARD; return true; }
    }
    // Solo button: y 472-512
    if (pos.y >= 472 && pos.y <= 512) { this._startGame(); return true; }
    // Local Co-op button: y 520-560
    if (pos.y >= 520 && pos.y <= 560) { this._startLocalCoop(); return true; }
    // Online Co-op button: y 568-608
    if (pos.y >= 568 && pos.y <= 608) { this.state = 'COOP_LOBBY'; this.coopLobby.state = 'menu'; return true; }
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
      const diffKey = Object.keys(DIFFICULTY).find(k => DIFFICULTY[k] === this.difficulty) || 'MEDIUM';
      // Host เริ่มเกมด้วย difficulty ของตัวเองทันที — ไม่รอ server round-trip
      this._startCoopGame();
      // ส่ง start+diff+chp ให้ Guest ผ่าน server
      this.net.startGame(diffKey, this.difficulty.coopHp);
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
    // Only process joypad during PLAYING state
    if (this.state === STATE.PLAYING) {
      this._recomputeTouchInput(e.touches);
    }
    // SELECT state: ใช้ changedTouches เพราะ touchstart บาง device e.touches ยัง empty
    if (this.state === STATE.SELECT) {
      this._recomputeSelectTouch(e.changedTouches);
    }
  }

  _onTouchEnd(e) {
    e.preventDefault();
    for (const t of e.changedTouches) delete this._touches[t.identifier];
    this._recomputeTouchInput(e.touches);
    if (this.state === STATE.SELECT) this._recomputeSelectTouch(e.touches);
  }

  _recomputeSelectTouch(touchList) {
    // reset
    this.input.left = false; this.input.right = false; this.input.btnA = false;
    for (const touch of touchList) {
      const pos = this._getCanvasPos(touch.clientX, touch.clientY);
      const pad = 8;
      for (const key of ['LEFT','RIGHT','A']) {
        const btn = JBTN[key];
        if (pos.x >= btn.x-pad && pos.x <= btn.x+btn.w+pad &&
            pos.y >= btn.y-pad && pos.y <= btn.y+btn.h+pad) {
          if (key==='LEFT')  this.input.left  = true;
          if (key==='RIGHT') this.input.right = true;
          if (key==='A')     this.input.btnA  = true;
        }
      }
    }
    // อัพเดต joyActive สำหรับ highlight ปุ่ม
    if (!this.charSelect._joyActive) this.charSelect._joyActive = {};
    this.charSelect._joyActive['LEFT']  = this.input.left;
    this.charSelect._joyActive['RIGHT'] = this.input.right;
    this.charSelect._joyActive['A']     = this.input.btnA;
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
    this._pendingMode = 'solo';
    this.charSelect.init(1, (p1Key) => {
      this._doStartGame(p1Key);
    }, 'solo');
    this.state = STATE.SELECT;
    this._inputLock = 300;
    this._selPrev = { p1:{left:false,right:false,btnA:false}, p2:{left:false,right:false,btnA:false} }; // ป้องกัน A ค้างจากตอนกดปุ่มเริ่ม
  }

  _doStartGame(p1Key) {
    this.coopMode = false;
    this.player2 = null;
    this.net.disconnect();

    this.player.reset();
    this.player.charKey = p1Key || 'player';
    this.player.maxHp = this.difficulty.playerHp;
    this.player.hp = this.difficulty.playerHp;
    this.player.coopActive = false;
    this.stagesCleared = 0;
    this.timeBonuses = [];
    this.currentStage = 1;
    this.particles = [];
    this._stageClearing = false;
    this.input = { left:false, right:false, btnA:false, btnB:false };
    this._prevBtnA = false;
    this._startStage(1);
  }

  _startLocalCoop() {
    this._pendingMode = 'local';
    this.charSelect.init(2, (p1Key, p2Key) => {
      this._doStartLocalCoop(p1Key, p2Key);
    }, 'local');
    this.state = STATE.SELECT;
    this._inputLock = 300;
    this._selPrev = { p1:{left:false,right:false,btnA:false}, p2:{left:false,right:false,btnA:false} };
  }

  _doStartLocalCoop(p1Key, p2Key) {
    this.coopMode = false;
    this.localCoop = true;
    this.net.disconnect();

    const chp = this.difficulty.coopHp;

    this.player.reset();
    this.player.charKey = p1Key || 'player';
    this.player.maxHp = chp; this.player.hp = chp;
    this.player.coopActive = true;
    this.player.isP2 = false;

    this.player2 = new Player();
    this.player2.reset();
    this.player2.charKey = p2Key || 'player2';
    this.player2.maxHp = chp; this.player2.hp = chp;
    this.player2.isP2 = true;
    this.player2.coopActive = true;
    this.player2.x = WIDTH - PLAYER_W - 30;

    this.boss = null;
    this.currentStage = 1; this.currentWave = 0;
    this.stagesCleared = 0; this.timeBonuses = [];
    this.particles = [];
    this._stageClearing = false;

    this.input  = { left:false, right:false, btnA:false, btnB:false };
    this.input2 = { left:false, right:false, btnA:false, btnB:false };
    this._prevBtnA = false;
    this._prevBtnA2 = false;

    this._startStage(1);
    this.state = STATE.PLAYING;
  }

  _submitName(name) {
    this.rankingScreen.addScore(name, this.player.score);
    this.state = STATE.RANKING;
    this._inputLock = 500;
  }

  _restartGame() {
    this.coopMode = false;
    this.localCoop = false;
    this.player2 = null;
    this.player.coopActive = false;
    this._tallyPending = false;
    this._tallyPayload = null;
    this._waitingForTally = false;
    this._stage4Timer = 0;
    this._myCharKey = null;
    this._hostCharKey = null;
    this._guestCharKey = null;
    this.input2 = { left:false, right:false, btnA:false, btnB:false };
    this._selPrev = { p1:{left:false,right:false,btnA:false}, p2:{left:false,right:false,btnA:false} };
    this.net.disconnect();

    this.state = STATE.INTRO;
    this.introTimer = 0;
    this._inputLock = 400;
  }

  // ══════════════════════════════════════════════════
  //  AUDIO
  // ══════════════════════════════════════════════════
  // ══════════════════════════════════════════════════
  //  SCREEN TIME
  // ══════════════════════════════════════════════════
  // ══════════════════════════════════════════════════
  //  SCREEN TIME — ใช้ timestamp จริง ไม่ใช่ frame counter
  // ══════════════════════════════════════════════════
  _loadScreenTime() {
    try {
      const raw = localStorage.getItem(SCREEN_TIME_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      const now = Date.now();

      // ถ้ากำลังพักอยู่ (breakUntil มีค่า)
      if (data.breakUntil) {
        if (now >= data.breakUntil) {
          // พักครบแล้ว (ปิด app ไปเล่นอย่างอื่น) → reset ทันที
          this._sessionMs = 0;
          this._breakActive = false;
          this._saveScreenTime();
        } else {
          // ยังต้องพักอยู่ → เข้า break mode ต่อ
          this._breakActive = true;
          this._breakTimer = data.breakUntil - now;
          this._sessionMs = data.playMs || 0;
        }
        return;
      }

      // reset ถ้าบันทึกไว้นานกว่า 24 ชั่วโมง
      const age = now - (data.dayTs || 0);
      if (age >= 24 * 60 * 60 * 1000) return;

      // คำนวณเวลาที่ผ่านไปขณะ app ปิด/background
      let playMs = data.playMs || 0;
      if (data.startTs) {
        const elapsed = now - data.startTs;
        // นับเฉพาะถ้า app ปิดไม่เกิน 1 ชั่วโมง (ป้องกันนับเวลาข้ามคืน)
        if (elapsed > 0 && elapsed < 60 * 60 * 1000) {
          playMs += elapsed;
        }
      }
      this._sessionMs = Math.min(playMs, SCREEN_TIME_LIMIT_MS);

      // ถ้าโหลดมาแล้วครบ limit เลย → trigger break ทันที
      if (this._sessionMs >= SCREEN_TIME_LIMIT_MS) {
        this._triggerBreak();
      }
    } catch(e) {}
  }

  _saveScreenTime() {
    try {
      const now = Date.now();
      const data = {
        playMs:    this._sessionMs,
        startTs:   (this.state === STATE.PLAYING || this.state === STATE.STAGE_CLEAR)
                   ? now : null,  // บันทึก timestamp เริ่มต้น session ปัจจุบัน
        breakUntil: this._breakActive ? (now + this._breakTimer) : null,
        dayTs:     now,
      };
      localStorage.setItem(SCREEN_TIME_KEY, JSON.stringify(data));
    } catch(e) {}
  }

  _triggerBreak() {
    this._breakActive = true;
    this._breakTimer = SCREEN_TIME_BREAK_MS;
    this._stopBGM('bgm');
    if (this.state === STATE.PLAYING) {
      this.state = STATE.GAME_OVER;
      this.stageClearTimer = 99999;
    }
    this._saveScreenTime(); // บันทึก breakUntil = now + 5 นาที
  }

  _drawBreak(ctx) {
    // Full overlay
    ctx.save();
    ctx.fillStyle = 'rgba(255,248,225,0.97)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Icon
    ctx.font = '64px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👀', WIDTH/2, HEIGHT/2 - 120);

    // Title
    ctx.font = 'bold 26px ' + FONT.MAIN;
    ctx.fillStyle = COL.PRIMARY_D;
    ctx.fillText('เล่นมานานแล้วนะ!', WIDTH/2, HEIGHT/2 - 40);

    // Subtitle
    ctx.font = '15px ' + FONT.BODY;
    ctx.fillStyle = COL.HUD_TEXT;
    ctx.fillText('พักสายตาสักครู่ก่อนนะ 🌟', WIDTH/2, HEIGHT/2);

    // Countdown
    const secLeft = Math.ceil(this._breakTimer / 1000);
    const min = Math.floor(secLeft / 60);
    const sec = secLeft % 60;
    const timeStr = min + ':' + (sec < 10 ? '0' : '') + sec;

    ctx.font = 'bold 48px ' + FONT.MAIN;
    ctx.fillStyle = COL.PRIMARY_D;
    ctx.fillText(timeStr, WIDTH/2, HEIGHT/2 + 70);

    ctx.font = '13px ' + FONT.BODY;
    ctx.fillStyle = 'rgba(93,64,55,0.6)';
    ctx.fillText('อีกสักครู่จะเล่นต่อได้เลย!', WIDTH/2, HEIGHT/2 + 120);

    // Progress bar
    const pct = 1 - (this._breakTimer / SCREEN_TIME_BREAK_MS);
    const bw = 260, bh = 10, bx = WIDTH/2 - bw/2, by = HEIGHT/2 + 148;
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath(); _rr(ctx, bx, by, bw, bh, 5); ctx.fill();
    ctx.fillStyle = COL.PRIMARY;
    ctx.beginPath(); _rr(ctx, bx, by, bw * pct, bh, 5); ctx.fill();

    ctx.restore();
  }

  // ── Guest สร้าง Tally เองทันที ไม่รอ Host ─────────────
  _guestSelfTally() {
    // บน Guest: this.player = P1 (synced จาก Host)
    //           this.player2 = P2 ตัวจริงที่ Guest เล่นเอง
    // Merge P1+P2 เหมือน Host ทำใน _goTally
    const p2 = this.player2;
    if (p2) {
      this.player.score          += p2.score         || 0;
      this.player.kills          += p2.kills          || 0;
      this.player.itemsCollected += p2.itemsCollected || 0;
    }
    this.tally.init(this.player, this.stagesCleared, this.timeBonuses || []);
    this.state = STATE.TALLY;
    this._inputLock = 800;
    this.coopMode = false;
    this.player2 = null;
    this.player.coopActive = false;
    try { this.net.disconnect(); } catch(e) {}
  }

  // ── Guest รับ Tally data จาก Host (fallback) ──────────
  _applyGuestTally(s) {
    // ถ้าเข้ามาซ้ำ (packet ส่งหลายครั้ง) ให้ข้ามถ้า TALLY แสดงอยู่แล้ว
    if (this.state === STATE.TALLY && !this._waitingForTally) return;
    if (s.p1) {
      this.player.score         = s.p1.score || 0;
      this.player.kills         = s.p1.kills || 0;
      this.player.itemsCollected= s.p1.items || 0;
    }
    if (s.tb && Array.isArray(s.tb)) this.timeBonuses = s.tb;
    this.stagesCleared = s.sc || this.stagesCleared || 0;
    this.tally.init(this.player, this.stagesCleared, this.timeBonuses || []);
    this.state = STATE.TALLY;
    this._inputLock = 800;
    this._waitingForTally = false;
    this.coopMode = false;
    this.player2 = null;
    this.player.coopActive = false;
    try { this.net.disconnect(); } catch(e) {}
  }

  playSfx(key) {
    // Co-op: Host relay SFX ไปยัง Guest ด้วย
    if (this.coopMode && this.net && this.net.isHost && this.net.connected) {
      this.net.sendEvent('sfx', { name: key });
    }
    this._sfx(key);
  }

  _sfx(key) {
    const s = this.sounds[key];
    if (!s) return;

    // Web Audio path — ใช้ decoded AudioBuffer (decode ครั้งเดียวแล้วเก็บ cache)
    if (s._sfxBuf || s._audioBuf) {
      const ctx = window._audioCtx;
      if (!ctx) return;

      const play = (buf) => {
        try {
          const src  = ctx.createBufferSource();
          const gain = ctx.createGain();
          gain.gain.value = SFX_VOLUME;
          src.buffer = buf;
          src.connect(gain);
          gain.connect(ctx.destination);
          src.start(0);
        } catch(e) {}
      };

      // iOS: suspended → resume แล้ว retry (ไม่ทิ้งเสียง)
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          if (s._audioBuf) play(s._audioBuf);
        }).catch(() => {});
        return;
      }

      if (s._audioBuf) {
        play(s._audioBuf);
      } else {
        ctx.decodeAudioData(s._sfxBuf, (decoded) => {
          s._audioBuf = decoded;
          delete s._sfxBuf;
          play(decoded);
        }, () => {});
      }
      return;
    }

    // Audio element fallback
    if (window._audioCtx && window._audioCtx.state === 'suspended') {
      window._audioCtx.resume();
    }
    try {
      const clone = typeof s.cloneNode === 'function' ? s.cloneNode(true) : s;
      clone.volume = SFX_VOLUME;
      clone.muted  = false;
      const p = clone.play();
      if (p instanceof Promise) p.catch(() => {});
    } catch(e) {}
  }

  // ── BGM ───────────────────────────────────────────────
  _playBGM(key) {
    const bgm = this.sounds[key];
    if (!bgm) return;
    // เล่นอยู่แล้ว → ไม่ทำซ้ำ
    if (!bgm.paused) return;
    bgm.loop   = true;
    bgm.volume = BGM_VOLUME;
    bgm.muted  = false;
    window._bgmEl = bgm;
    if (window._audioCtx && window._audioCtx.state === 'suspended') {
      window._audioCtx.resume().then(() => bgm.play().catch(() => {}));
      return;
    }
    const p = bgm.play();
    if (p instanceof Promise) {
      p.catch(() => {
        // retry หลัง 200ms — iOS อาจต้องการเวลาหลัง unlock
        setTimeout(() => bgm.play().catch(() => {}), 200);
      });
    }
  }

  _stopBGM(key) {
    const bgm = this.sounds[key];
    if (bgm) { try { bgm.pause(); bgm.currentTime = 0; } catch(e) {} }
    if (key === 'bgm') window._bgmEl = null;
  }

  _bgmFadeOut(durationSec) {
    // fade ผ่าน volume ของ Audio element
    const bgm = this.sounds['bgm'];
    if (!bgm || bgm.paused) return;
    if (this._bgmFadeTimer) { clearTimeout(this._bgmFadeTimer); this._bgmFadeTimer = null; }
    const steps   = 20;
    const stepMs  = (durationSec * 1000) / steps;
    const volStep = bgm.volume / steps;
    let   count   = 0;
    const tick = () => {
      count++;
      bgm.volume = Math.max(0, bgm.volume - volStep);
      if (count < steps) {
        this._bgmFadeTimer = setTimeout(tick, stepMs);
      } else {
        this._bgmFadeTimer = null;
        this._stopBGM('bgm');
      }
    };
    this._bgmFadeTimer = setTimeout(tick, stepMs);
  }

  _bindVisibility() {
    document.addEventListener('visibilitychange', () => {
      const bgm = window._bgmEl;
      if (document.hidden) {
        if (bgm) bgm.pause();
        // บันทึกเวลาจริง + timestamp ขณะออกไป background
        this._saveScreenTime();
      } else {
        // กลับมา → โหลด timestamp และคำนวณเวลาที่ผ่านไป
        this._loadScreenTime();
        if (bgm && (this.state === STATE.PLAYING || this.state === STATE.STAGE_CLEAR)) {
          bgm.play().catch(() => {});
        }
      }
    });
  }

  // ── iOS Audio Unlock ──────────────────────────────────
  _unlockAudio() {
    if (window._audioUnlocked) return;
    window._audioUnlocked = true;

    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        const ctx = new AC();
        window._audioCtx = ctx;
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
        ctx.resume().then(() => {
          this._predecodeSFX(ctx);
        });
      }
    } catch(e) {}

    // unlock HTMLAudio elements ทั้งหมด (BGM + fallback)
    // iOS ต้องการ play() ใน gesture context ก่อนถึงจะ play ได้ทีหลัง
    Object.values(this.sounds).forEach(s => {
      if (!s || typeof s.play !== 'function') return;
      try {
        s.muted = true;
        const p = s.play();
        if (p && p.then) {
          p.then(() => { s.pause(); s.currentTime = 0; s.muted = false; })
           .catch(() => { s.muted = false; });
        }
      } catch(e) { try { s.muted = false; } catch(e2) {} }
    });

    // ถ้า BGM ควรเล่นอยู่ → resume
    if (window._bgmEl && (this.state === STATE.PLAYING || this.state === STATE.STAGE_CLEAR)) {
      window._bgmEl.play().catch(() => {});
    }
  }

  _predecodeSFX(ctx) {
    Object.entries(this.sounds).forEach(([key, s]) => {
      if (!s || !s._sfxBuf) return;
      ctx.decodeAudioData(s._sfxBuf, (decoded) => {
        s._audioBuf = decoded;
        delete s._sfxBuf;
      }, () => {});
    });
  }
}
