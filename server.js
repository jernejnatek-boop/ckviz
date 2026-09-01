// CKViz - strežnik. Express za statične strani + WebSocket za igro.

import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { WebSocketServer } from 'ws';
import QRCode from 'qrcode';

import { RoomStore, AVATARS } from './src/rooms.js';
import { MODES, MODE_IDS, MAX_PLAYERS } from './src/game.js';
import { generateQuestions, aiAvailable } from './src/ai.js';
import { pickFromBank } from './src/questionBank.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);

const app = express();
app.use(express.json({ limit: '256kb' }));
app.use(express.static(path.join(here, 'public'), { maxAge: '1h' }));

const store = new RoomStore();

function lanAddress() {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const iface of list || []) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return null;
}

app.get('/api/info', (req, res) => {
  res.json({
    ai: aiAvailable(),
    modes: MODES,
    maxPlayers: MAX_PLAYERS,
    avatars: AVATARS,
    lan: lanAddress(),
    port: PORT,
  });
});

app.get('/qr.png', async (req, res) => {
  const data = String(req.query.d || '').slice(0, 512);
  if (!data) return res.status(400).end();
  try {
    const buf = await QRCode.toBuffer(data, { width: 520, margin: 1, color: { dark: '#0b0d17', light: '#ffffff' } });
    res.type('png').send(buf);
  } catch {
    res.status(500).end();
  }
});

// Kratka povezava za telefone: /p/ABCD
app.get('/p/:code', (req, res) => res.sendFile(path.join(here, 'public', 'play.html')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

/** @type {Map<import('ws').WebSocket, {roomCode:string, role:'host'|'player', playerId?:string}>} */
const sockets = new Map();

function send(ws, msg) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

function broadcast(room) {
  for (const [ws, meta] of sockets) {
    if (meta.roomCode !== room.code) continue;
    if (meta.role === 'host') send(ws, room.hostState());
    else if (meta.playerId) send(ws, room.playerState(meta.playerId));
  }
}

function relayToHost(room, msg) {
  for (const [ws, meta] of sockets) {
    if (meta.roomCode === room.code && meta.role === 'host') send(ws, msg);
  }
}

function fail(ws, message) {
  send(ws, { t: 'error', message: String(message || 'Nekaj je šlo narobe.') });
}

wss.on('connection', (ws) => {
  sockets.set(ws, { roomCode: null, role: null });

  ws.on('message', async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return fail(ws, 'Neveljavno sporočilo.');
    }
    try {
      await handle(ws, msg);
    } catch (err) {
      fail(ws, err?.message);
    }
  });

  ws.on('close', () => {
    const meta = sockets.get(ws);
    sockets.delete(ws);
    if (meta?.roomCode && meta.role === 'player' && meta.playerId) {
      const room = store.get(meta.roomCode);
      const p = room?.players.get(meta.playerId);
      if (p) {
        p.connected = false;
        room.changed();
      }
    }
  });

  ws.on('error', () => {});
});

async function handle(ws, msg) {
  const meta = sockets.get(ws);
  const roomOf = () => {
    const room = store.get(meta.roomCode);
    if (!room) throw new Error('Soba ne obstaja več.');
    return room;
  };
  const playerRoom = () => {
    const room = roomOf();
    const player = room.players.get(meta.playerId);
    if (!player) throw new Error('Nisi več v sobi.');
    return { room, player };
  };
  const hostRoom = () => {
    if (meta.role !== 'host') throw new Error('Samo voditelj lahko to naredi.');
    return roomOf();
  };

  switch (msg.t) {
    case 'ping':
      return send(ws, { t: 'pong' });

    // ---------- voditelj ----------
    case 'host:create': {
      const room = store.create(broadcast);
      Object.assign(room.settings, sanitizeSettings(msg.settings));
      meta.roomCode = room.code;
      meta.role = 'host';
      send(ws, { t: 'hostToken', code: room.code, hostToken: room.hostToken, ai: aiAvailable() });
      return send(ws, room.hostState());
    }

    case 'host:resume': {
      const room = store.get(msg.code);
      if (!room || room.hostToken !== msg.hostToken) throw new Error('Te seje ni več. Ustvari novo sobo.');
      meta.roomCode = room.code;
      meta.role = 'host';
      send(ws, { t: 'hostToken', code: room.code, hostToken: room.hostToken, ai: aiAvailable() });
      return send(ws, room.hostState());
    }

    case 'host:settings': {
      const room = hostRoom();
      Object.assign(room.settings, sanitizeSettings(msg.settings));
      return room.changed();
    }

    case 'host:generate': {
      const room = hostRoom();
      if (room.generating) throw new Error('Vprašanja se še pripravljajo.');
      const count = Math.min(30, Math.max(3, Number(msg.count) || 12));
      const modes = Array.isArray(msg.modes) && msg.modes.length ? msg.modes.filter((m) => MODE_IDS.includes(m)) : MODE_IDS;
      const theme = String(msg.theme || room.settings.theme || 'Splošna razgledanost').slice(0, 200);
      room.settings.theme = theme;
      room.generating = true;
      room.genError = null;
      room.changed();
      try {
        if (!aiAvailable()) throw new Error('NO_KEY');
        const { questions, model } = await generateQuestions({
          theme,
          count,
          difficulty: String(msg.difficulty || 'srednja'),
          modes,
          tone: String(msg.tone || 'sproščen in duhovit'),
          avoid: msg.append ? room.questions.map((q) => q.text) : [],
        });
        if (msg.append) room.addQuestions(questions);
        else room.setQuestions(questions);
        relayToHost(room, { t: 'toast', kind: 'ok', message: `Claude (${model}) je pripravil ${questions.length} vprašanj.` });
      } catch (err) {
        const noKey = err?.message === 'NO_KEY';
        const fallback = pickFromBank(count, modes);
        if (msg.append) room.addQuestions(fallback);
        else room.setQuestions(fallback);
        room.genError = noKey
          ? 'Ni ključa ANTHROPIC_API_KEY - uporabljena so vgrajena vprašanja.'
          : `Generiranje ni uspelo (${err.message}). Uporabljena so vgrajena vprašanja.`;
        relayToHost(room, { t: 'toast', kind: 'warn', message: room.genError });
      } finally {
        room.generating = false;
        room.changed();
      }
      return;
    }

    case 'host:bank': {
      const room = hostRoom();
      const count = Math.min(30, Math.max(3, Number(msg.count) || 12));
      const modes = Array.isArray(msg.modes) && msg.modes.length ? msg.modes.filter((m) => MODE_IDS.includes(m)) : MODE_IDS;
      room.setQuestions(pickFromBank(count, modes));
      room.settings.theme = 'Vgrajen nabor';
      return room.changed();
    }

    case 'host:removeQuestion': {
      const room = hostRoom();
      const rest = room.questions.filter((q) => q.id !== msg.id).map(({ id, index, hot, ...r }) => r);
      return room.setQuestions(rest);
    }

    case 'host:autopair':
      return hostRoom().autoPair();

    case 'host:unpair':
      return hostRoom().unpair(msg.playerId);

    case 'host:kick':
      return hostRoom().removePlayer(msg.playerId);

    case 'host:start':
      return hostRoom().start();

    case 'host:next':
      return hostRoom().next();

    case 'host:reveal':
      return hostRoom().reveal();

    case 'host:end':
      return hostRoom().end();

    case 'host:lobby':
      return hostRoom().backToLobby();

    // ---------- igralec ----------
    case 'join': {
      const room = store.get(msg.code);
      if (!room) throw new Error('Napačna koda sobe.');
      let player = msg.token ? room.byToken(msg.token) : null;
      if (player) {
        player.connected = true;
      } else {
        if (room.phase !== 'lobby') throw new Error('Igra že poteka. Počakaj na naslednji krog.');
        player = room.addPlayer({ name: msg.name, emoji: msg.emoji });
      }
      meta.roomCode = room.code;
      meta.role = 'player';
      meta.playerId = player.id;
      send(ws, { t: 'joined', token: player.token, id: player.id, code: room.code });
      room.changed();
      return;
    }

    case 'pair': {
      const { room, player } = playerRoom();
      room.requestPair(player.id, msg.targetId);
      return;
    }

    case 'unpair': {
      const { room, player } = playerRoom();
      room.unpair(player.id);
      return;
    }

    case 'answer': {
      const { room, player } = playerRoom();
      room.submit(player.id, msg);
      return;
    }

    case 'reaction': {
      const { room, player } = playerRoom();
      const emoji = String(msg.emoji || '').slice(0, 4);
      if (!emoji) return;
      relayToHost(room, { t: 'reaction', emoji, from: player.name, playerEmoji: player.emoji });
      return;
    }

    case 'leave': {
      const { room, player } = playerRoom();
      room.removePlayer(player.id);
      meta.playerId = null;
      return;
    }

    default:
      throw new Error(`Neznan ukaz: ${msg.t}`);
  }
}

function sanitizeSettings(s = {}) {
  const out = {};
  if (s.timeLimit != null) out.timeLimit = Math.min(120, Math.max(10, Number(s.timeLimit) || 30));
  if (s.theme != null) out.theme = String(s.theme).slice(0, 200);
  if (s.hotRound != null) out.hotRound = Boolean(s.hotRound);
  return out;
}

// Ohranjanje povezav pri življenju (mobilni brskalniki radi zaspijo).
setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.readyState === ws.OPEN) ws.ping();
  }
}, 25000).unref?.();

server.listen(PORT, () => {
  console.log(`\n  CKViz teče na http://localhost:${PORT}`);
  console.log(`  Velik zaslon (PC): http://localhost:${PORT}/host.html`);
  console.log(`  Telefoni:          http://<IP-tvojega-racunalnika>:${PORT}/`);
  console.log(`  Claude API:        ${aiAvailable() ? 'na voljo ✅' : 'ni ključa - vgrajena vprašanja ⚠️'}\n`);
});
