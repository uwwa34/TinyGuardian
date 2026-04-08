// ═══════════════════════════════════════════════════
//  js/network.js — Tiny Guardian Co-op Client
// ═══════════════════════════════════════════════════

const NET_STATE = { DISCONNECTED:'DISCONNECTED', CONNECTING:'CONNECTING', IN_LOBBY:'IN_LOBBY', WAITING:'WAITING', READY:'READY', PLAYING:'PLAYING' };

class NetworkManager {
  constructor() {
    this.ws = null;
    this.state = NET_STATE.DISCONNECTED;
    this.role = null;       // 'host' | 'guest'
    this.roomCode = null;
    this.serverUrl = '';
    this.onEvent = null;    // callback(eventType, data)
    this._reconnectTimer = null;
    // State sync
    this.lastSentState = 0;
    this.sendInterval = 50; // ~20fps state sync
    // Peer input (host receives guest input)
    this.peerInput = { left:false, right:false, btnA:false, btnB:false, jumpPressed:false };
    // Peer state (guest receives game state from host)
    this.peerState = null;
  }

  get connected() { return this.ws && this.ws.readyState === WebSocket.OPEN; }
  get isHost() { return this.role === 'host'; }
  get isGuest() { return this.role === 'guest'; }
  get isCoopActive() { return this.state === NET_STATE.PLAYING; }

  setServerUrl(url) { this.serverUrl = url; }

  // ── Connect + Create Room ──
  createRoom(serverUrl) {
    this.serverUrl = serverUrl || this.serverUrl;
    this._connect(() => {
      this._send({ type: 'create' });
    });
  }

  // ── Connect + Join Room ──
  joinRoom(code, serverUrl) {
    this.serverUrl = serverUrl || this.serverUrl;
    this._connect(() => {
      this._send({ type: 'join', code: code.toUpperCase() });
    });
  }

  // ── Host starts game ──
  startGame(diffKey) {
    if (this.isHost) this._send({ type: 'start', diff: diffKey || 'MEDIUM' });
  }

  // ── Send input (guest → host) ──
  sendInput(input) {
    if (!this.isGuest || !this.connected) return;
    this._send({
      type: 'input',
      left: input.left, right: input.right,
      btnA: input.btnA, btnB: input.btnB,
      jumpPressed: input.jumpPressed || false,
    });
  }

  // ── Send game state (host → guest, throttled) ──
  sendGameState(stateData) {
    if (!this.isHost || !this.connected) return;
    const now = Date.now();
    if (now - this.lastSentState < this.sendInterval) return;
    this.lastSentState = now;
    this._send({ type: 'state', ...stateData });
  }

  // ── Force send (bypass throttle — for critical state like TALLY) ──
  forceSendState(stateData) {
    if (!this.connected) return;
    this._send({ type: 'state', ...stateData });
    this.lastSentState = Date.now();
  }

  // ── Send event (either direction) ──
  sendEvent(eventType, data) {
    if (!this.connected) return;
    this._send({ type: 'event', event: eventType, ...data });
  }

  // ── Disconnect ──
  disconnect() {
    if (this.ws) {
      this._send({ type: 'leave' });
      this.ws.close();
      this.ws = null;
    }
    this.state = NET_STATE.DISCONNECTED;
    this.role = null;
    this.roomCode = null;
  }

  // ── Internal ──
  _connect(onOpen) {
    if (this.ws) { try { this.ws.close(); } catch(e){} }
    this.state = NET_STATE.CONNECTING;
    this._emit('connecting');

    // Timeout — if no connection in 15s, give up
    this._connectTimeout = setTimeout(() => {
      if (this.state === NET_STATE.CONNECTING) {
        this._emit('error', 'เชื่อมต่อไม่ได้ — Server อาจกำลัง sleep (ลองอีกครั้ง)');
        try { this.ws.close(); } catch(e){}
      }
    }, 15000);

    try {
      this.ws = new WebSocket(this.serverUrl);
    } catch (e) {
      clearTimeout(this._connectTimeout);
      this.state = NET_STATE.DISCONNECTED;
      this._emit('error', 'ไม่สามารถเชื่อมต่อ server');
      return;
    }

    this.ws.onopen = () => {
      clearTimeout(this._connectTimeout);
      this.state = NET_STATE.IN_LOBBY;
      this._emit('connected');
      if (onOpen) onOpen();
    };

    this.ws.onmessage = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      this._handleMessage(msg);
    };

    this.ws.onclose = () => {
      clearTimeout(this._connectTimeout);
      this.state = NET_STATE.DISCONNECTED;
      this._emit('disconnected');
    };

    this.ws.onerror = () => {
      clearTimeout(this._connectTimeout);
      this._emit('error', 'การเชื่อมต่อขัดข้อง');
    };
  }

  _handleMessage(msg) {
    switch (msg.type) {
      case 'created':
        this.role = 'host';
        this.roomCode = msg.code;
        this.state = NET_STATE.WAITING;
        this._emit('room_created', msg.code);
        break;
      case 'joined':
        this.role = 'guest';
        this.roomCode = msg.code;
        this.state = NET_STATE.READY;
        this._emit('room_joined', msg.code);
        break;
      case 'guest_joined':
        this.state = NET_STATE.READY;
        this._emit('guest_joined');
        break;
      case 'start':
        this.state = NET_STATE.PLAYING;
        this._emit('game_start', msg.diff || 'MEDIUM');
        break;
      case 'input':
        // Host receives guest input
        this.peerInput.left = msg.left;
        this.peerInput.right = msg.right;
        this.peerInput.btnA = msg.btnA;
        this.peerInput.btnB = msg.btnB;
        // Queue jump: if guest says jumpPressed, keep it until Host consumes
        if (msg.jumpPressed) this.peerInput._jumpQueued = true;
        break;
      case 'state':
        // Guest receives game state from host
        this.peerState = msg;
        break;
      case 'event':
        this._emit('peer_event', msg);
        break;
      case 'peer_left':
        this._emit('peer_left');
        break;
      case 'error':
        this._emit('error', msg.msg);
        break;
    }
  }

  _send(obj) {
    if (this.connected) this.ws.send(JSON.stringify(obj));
  }

  _emit(type, data) {
    if (this.onEvent) this.onEvent(type, data);
  }
}

// ── Co-op Lobby UI (drawn on canvas) ──
class CoopLobbyUI {
  constructor() {
    this.state = 'menu';  // menu | creating | waiting | joining | input_code | ready | error
    this.roomCode = '';
    this.inputCode = '';
    this.errorMsg = '';
    this.cursor = true;
    this.cursorT = 0;
    this.dotAnim = 0;
  }

  update(dt) {
    this.cursorT += dt;
    if (this.cursorT > 0.4) { this.cursorT = 0; this.cursor = !this.cursor; }
    this.dotAnim += dt;
  }

  draw(ctx) {
    // BG
    const g = ctx.createLinearGradient(0,0,0,HEIGHT);
    g.addColorStop(0,'#FFF8E1'); g.addColorStop(1,'#FFE082');
    ctx.fillStyle = g; ctx.fillRect(0,0,WIDTH,HEIGHT);

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    if (this.state === 'menu') {
      ctx.font = '28px '+FONT.MAIN; ctx.fillStyle = COL.HUD_TEXT;
      ctx.fillText('🛡️ CO-OP MODE 🛡️', WIDTH/2, 160);
      ctx.font = '14px '+FONT.BODY; ctx.fillStyle = COL.PRIMARY_D;
      ctx.fillText('เล่น 2 คน ออนไลน์', WIDTH/2, 200);

      // Create Room button
      this._drawBtn(ctx, WIDTH/2-120, 280, 240, 56, '🏠 สร้างห้อง', COL.PRIMARY);
      // Join Room button
      this._drawBtn(ctx, WIDTH/2-120, 360, 240, 56, '🔑 เข้าห้อง', COL.SKY_BLUE);
      // Back button
      this._drawBtn(ctx, WIDTH/2-80, 460, 160, 44, '← กลับ', '#FFE0B2');

    } else if (this.state === 'creating' || this.state === 'connecting') {
      ctx.font = '18px '+FONT.MAIN; ctx.fillStyle = COL.HUD_TEXT;
      const dots = '.'.repeat(Math.floor(this.dotAnim*2) % 4);
      ctx.fillText('กำลังเชื่อมต่อ'+dots, WIDTH/2, HEIGHT/2);

    } else if (this.state === 'waiting') {
      ctx.font = '16px '+FONT.BODY; ctx.fillStyle = COL.HUD_TEXT;
      ctx.fillText('รหัสห้อง:', WIDTH/2, 180);
      // Big room code
      ctx.font = '48px '+FONT.MAIN; ctx.fillStyle = COL.PRIMARY_D;
      ctx.fillText(this.roomCode, WIDTH/2, 240);
      ctx.font = '13px '+FONT.BODY; ctx.fillStyle = COL.HUD_TEXT;
      ctx.fillText('บอกรหัสนี้ให้เพื่อน', WIDTH/2, 290);
      const dots = '.'.repeat(Math.floor(this.dotAnim*2) % 4);
      ctx.fillText('รอเพื่อนเข้าร่วม'+dots, WIDTH/2, 330);
      this._drawBtn(ctx, WIDTH/2-80, 400, 160, 44, '← ยกเลิก', '#FFE0B2');

    } else if (this.state === 'input_code') {
      ctx.font = '16px '+FONT.BODY; ctx.fillStyle = COL.HUD_TEXT;
      ctx.fillText('ใส่รหัสห้อง:', WIDTH/2, 200);
      // Input box
      ctx.fillStyle = '#FFF'; ctx.strokeStyle = COL.PRIMARY; ctx.lineWidth = 2;
      _rr(ctx, WIDTH/2-100, 230, 200, 50, 10); ctx.fill(); ctx.stroke();
      ctx.font = '32px '+FONT.MAIN; ctx.fillStyle = COL.HUD_TEXT;
      ctx.fillText((this.inputCode || '____') + (this.cursor ? '|' : ''), WIDTH/2, 258);
      // VKB - simple number+letter grid
      this._drawCodeKB(ctx, 310);
      this._drawBtn(ctx, WIDTH/2-120, 500, 110, 44, '← กลับ', '#FFE0B2');
      this._drawBtn(ctx, WIDTH/2+10, 500, 110, 44, 'เข้า ✓', COL.PRIMARY);

    } else if (this.state === 'ready') {
      ctx.font = '22px '+FONT.MAIN; ctx.fillStyle = COL.GOLD;
      ctx.fillText('✨ เพื่อนเข้าร่วมแล้ว! ✨', WIDTH/2, 200);
      ctx.font = '14px '+FONT.BODY; ctx.fillStyle = COL.HUD_TEXT;
      ctx.fillText('ห้อง: '+this.roomCode, WIDTH/2, 235);
      // P1/P2 vertical layout
      ctx.font = '18px '+FONT.MAIN;
      ctx.fillStyle = '#F9A825';
      ctx.fillText('🟡 Player 1 — Left', WIDTH/2, 290);
      ctx.fillStyle = '#42A5F5';
      ctx.fillText('🔵 Player 2 — Right', WIDTH/2, 325);
      this._drawBtn(ctx, WIDTH/2-120, 380, 240, 56, '🎮 เริ่มเกม!', COL.PRIMARY);

    } else if (this.state === 'guest_ready') {
      ctx.font = '22px '+FONT.MAIN; ctx.fillStyle = COL.GOLD;
      ctx.fillText('✨ เข้าห้องสำเร็จ! ✨', WIDTH/2, 200);
      ctx.font = '14px '+FONT.BODY; ctx.fillStyle = COL.HUD_TEXT;
      ctx.fillText('ห้อง: '+this.roomCode, WIDTH/2, 235);
      // Show role
      ctx.font = '18px '+FONT.MAIN;
      ctx.fillStyle = '#F9A825';
      ctx.fillText('🟡 Player 1 — Left', WIDTH/2, 290);
      ctx.fillStyle = '#42A5F5';
      ctx.fillText('🔵 Player 2 — Right (คุณ)', WIDTH/2, 325);
      const dots = '.'.repeat(Math.floor(this.dotAnim*2) % 4);
      ctx.font = '14px '+FONT.BODY; ctx.fillStyle = COL.HUD_TEXT;
      ctx.fillText('รอ Host เริ่มเกม'+dots, WIDTH/2, 370);

    } else if (this.state === 'error') {
      ctx.font = '16px '+FONT.BODY; ctx.fillStyle = COL.HEART_ON;
      ctx.fillText(this.errorMsg, WIDTH/2, HEIGHT/2-20);
      this._drawBtn(ctx, WIDTH/2-80, HEIGHT/2+30, 160, 44, '← กลับ', '#FFE0B2');
    }
  }

  _drawBtn(ctx, x, y, w, h, text, col) {
    ctx.fillStyle = col; _rr(ctx, x, y, w, h, 12); ctx.fill();
    ctx.strokeStyle = COL.PRIMARY_D; ctx.lineWidth = 1.5; _rr(ctx, x, y, w, h, 12); ctx.stroke();
    ctx.font = '15px '+FONT.MAIN; ctx.fillStyle = COL.HUD_TEXT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x+w/2, y+h/2);
  }

  _drawCodeKB(ctx, startY) {
    const rows = [['A','B','C','D','E','F','G','H'],['J','K','L','M','N','P','Q','R'],['S','T','U','V','W','X','Y','Z'],['2','3','4','5','6','7','8','9','⌫']];
    const keyH = 36, keyGap = 3;
    this._kbData = { rows, startY, keyH, keyGap };
    rows.forEach((row, ri) => {
      const keyW = Math.floor((WIDTH-30)/row.length) - keyGap;
      const rowX = (WIDTH-(keyW+keyGap)*row.length)/2;
      row.forEach((k, ki) => {
        const kx = rowX+ki*(keyW+keyGap), ky = startY+ri*(keyH+keyGap);
        const isDel = k === '⌫';
        ctx.fillStyle = isDel ? '#FFCDD2' : 'rgba(255,236,179,0.7)';
        ctx.strokeStyle = isDel ? '#EF5350' : COL.PRIMARY; ctx.lineWidth = 1;
        _rr(ctx,kx,ky,keyW,keyH,5); ctx.fill(); ctx.stroke();
        ctx.fillStyle = isDel ? '#C62828' : COL.HUD_TEXT; ctx.font = '13px '+FONT.MAIN;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(k, kx+keyW/2, ky+keyH/2);
      });
    });
  }

  handleTouch(tx, ty, net) {
    if (this.state === 'menu') {
      if (ty >= 280 && ty <= 336) { return 'create'; }
      if (ty >= 360 && ty <= 416) { this.state = 'input_code'; this.inputCode = ''; return null; }
      if (ty >= 460 && ty <= 504) { return 'back'; }
    } else if (this.state === 'waiting') {
      if (ty >= 400 && ty <= 444) { return 'cancel'; }
    } else if (this.state === 'input_code') {
      // Back button
      if (tx >= WIDTH/2-120 && tx <= WIDTH/2-10 && ty >= 500 && ty <= 544) { this.state = 'menu'; return null; }
      // Join button
      if (tx >= WIDTH/2+10 && tx <= WIDTH/2+120 && ty >= 500 && ty <= 544) {
        if (this.inputCode.length >= 4) return 'join';
        return null;
      }
      // Keyboard
      if (this._kbData) {
        const { rows, startY, keyH, keyGap } = this._kbData;
        for (let ri=0; ri<rows.length; ri++) {
          const row = rows[ri];
          const keyW = Math.floor((WIDTH-30)/row.length) - keyGap;
          const rowX = (WIDTH-(keyW+keyGap)*row.length)/2;
          for (let ki=0; ki<row.length; ki++) {
            const kx = rowX+ki*(keyW+keyGap), ky = startY+ri*(keyH+keyGap);
            if (tx>=kx && tx<=kx+keyW && ty>=ky && ty<=ky+keyH) {
              if (row[ki] === '⌫') { this.inputCode = this.inputCode.slice(0,-1); }
              else if (this.inputCode.length < 4) this.inputCode += row[ki];
              return null;
            }
          }
        }
      }
    } else if (this.state === 'ready') {
      if (ty >= 380 && ty <= 436) { return 'start'; }
    } else if (this.state === 'error') {
      if (ty >= HEIGHT/2+30 && ty <= HEIGHT/2+74) { this.state = 'menu'; return null; }
    }
    return null;
  }

  handleKey(key) {
    if (this.state === 'input_code') {
      if (key === 'Backspace') { this.inputCode = this.inputCode.slice(0,-1); }
      else if (key === 'Enter' && this.inputCode.length >= 4) return 'join';
      else if (this.inputCode.length < 4 && /^[a-zA-Z0-9]$/.test(key)) this.inputCode += key.toUpperCase();
    }
    return null;
  }
}
