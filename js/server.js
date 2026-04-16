// ═══════════════════════════════════════════════════
//  server/server.js — Tiny Guardian Co-op Server
//  Relay WebSocket messages between 2 players in a room
// ═══════════════════════════════════════════════════

const { WebSocketServer } = require('ws');
const http = require('http');

const PORT = process.env.PORT || 3000;
const rooms = new Map(); // roomCode → { host, guest }

// Simple HTTP for health check
const httpServer = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
  res.end('Tiny Guardian Co-op Server OK | Rooms: ' + rooms.size);
});

const wss = new WebSocketServer({ server: httpServer });

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(code) ? genCode() : code;
}

function broadcast(room, msg, excludeWs) {
  const data = JSON.stringify(msg);
  if (room.host && room.host !== excludeWs && room.host.readyState === 1) room.host.send(data);
  if (room.guest && room.guest !== excludeWs && room.guest.readyState === 1) room.guest.send(data);
}

wss.on('connection', (ws) => {
  ws._roomCode = null;
  ws._role = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'create': {
        const code = genCode();
        rooms.set(code, { host: ws, guest: null });
        ws._roomCode = code;
        ws._role = 'host';
        ws.send(JSON.stringify({ type: 'created', code }));
        console.log(`[ROOM] ${code} created`);
        break;
      }

      case 'join': {
        const code = (msg.code || '').toUpperCase();
        const room = rooms.get(code);
        if (!room) {
          ws.send(JSON.stringify({ type: 'error', msg: 'ไม่พบห้อง ' + code }));
          return;
        }
        if (room.guest) {
          ws.send(JSON.stringify({ type: 'error', msg: 'ห้องเต็มแล้ว' }));
          return;
        }
        room.guest = ws;
        ws._roomCode = code;
        ws._role = 'guest';
        ws.send(JSON.stringify({ type: 'joined', code }));
        // Notify host
        if (room.host && room.host.readyState === 1) {
          room.host.send(JSON.stringify({ type: 'guest_joined' }));
        }
        console.log(`[ROOM] ${code} guest joined`);
        break;
      }

      case 'start': {
        // Host starts the game — relay full message including diff and chp
        const room = rooms.get(ws._roomCode);
        if (room) broadcast(room, { type: 'start', diff: msg.diff, chp: msg.chp });
        break;
      }

      case 'input':
      case 'state':
      case 'event': {
        // Relay to the other player
        const room = rooms.get(ws._roomCode);
        if (room) broadcast(room, msg, ws);
        break;
      }

      case 'leave': {
        cleanup(ws);
        break;
      }
    }
  });

  ws.on('close', () => cleanup(ws));
  ws.on('error', () => cleanup(ws));
});

function cleanup(ws) {
  const code = ws._roomCode;
  if (!code) return;
  const room = rooms.get(code);
  if (!room) return;

  // Notify other player
  broadcast(room, { type: 'peer_left' }, ws);

  if (room.host === ws) room.host = null;
  if (room.guest === ws) room.guest = null;

  // Remove empty room
  if (!room.host && !room.guest) {
    rooms.delete(code);
    console.log(`[ROOM] ${code} deleted`);
  }
  ws._roomCode = null;
}

httpServer.listen(PORT, () => {
  console.log(`🛡️ Tiny Guardian Server running on port ${PORT}`);
});
