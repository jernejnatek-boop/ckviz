// CKViz - strežnik. Express za statične strani + WebSocket za igro.

import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { WebSocketServer } from 'ws';
import QRCode from 'qrcode';

import { RoomStore, AVATARS } from './src/rooms.js';
import { MODES, MODE_IDS, MAX_PLAYERS } from './src/game.js';
import { generateQuestions, aiAvailable } from './src/ai.js';
import { pickFromBank } from './src/questionBank.js';
import { Storage } from './src/storage.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const HOST_PASSWORD = process.env.HOST_PASSWORD || '';
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/+$/, '');
// Strežnik brez trajnega diska (npr. brezplačni načrt): shranjevanje deluje,
// a se ob ponovnem zagonu izgubi. Vmesnik naj to jasno pove.
const EPHEMERAL = process.env.CKVIZ_EPHEMERAL === '1';

const storage = await new Storage().init();
const store = new RoomStore(storage);

const app = express();
app.set('trust proxy', true);
app.use(express.json({ limit: '512kb' }));
app.use(express.static(path.join(here, 'public'), { maxAge: '1h' }));

function lanAddress() {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const iface of list || []) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return null;
}

/**
 * Naslov, ki ga telefoni dejansko lahko odprejo.
 * Na spletu je to javni naslov strežnika, doma pa naslov v lokalnem omrežju.
 */
function publicOrigin(req) {
  if (PUBLIC_URL) return PUBLIC_URL;
  const host = req?.headers?.host || '';
  const proto = String(req?.headers?.['x-forwarded-proto'] || '').split(',')[0].trim()
    || (req?.socket?.encrypted ? 'https' : 'http');
  const local = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/i.test(host);
  if (host && !local) return `${proto}://${host}`;
  const lan = lanAddress();
  return lan ? `http://${lan}:${PORT}` : `http://${host || `localhost:${PORT}`}`;
}

function passwordOk(given) {
  if (!HOST_PASSWORD) return true;
  const a = Buffer.from(String(given || ''));
  const b = Buffer.from(HOST_PASSWORD);
  return a.length === b.length && timingSafeEqual(a, b);
}

app.get('/api/info', (req, res) => {
  res.json({
    ai: aiAvailable(),
    modes: MODES,
    maxPlayers: MAX_PLAYERS,
    avatars: AVATARS,
    needsPassword: Boolean(HOST_PASSWORD),
    saving: storage.enabled,
    ephemeral: EPHEMERAL,
    origin: publicOrigin(req),
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

app.get('/healthz', (req, res) => res.json({ ok: true, rooms: store.rooms.size }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

/** @type {Map<import('ws').WebSocket, {roomCode:string, role:'host'|'player', playerId?:string, origin:string}>} */
const sockets = new Map();

function send(ws, msg) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

function broadcast(room) {
  storage.saveRoom(room.toJSON());
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

function fail(ws, message, code) {
  send(ws, { t: 'error', message: String(message || 'Nekaj je šlo narobe.'), code });
}

const restored = store.restore(broadcast);
if (restored) console.log(`[shramba] obnovljenih sob: ${restored}`);

wss.on('connection', (ws, req) => {
  sockets.set(ws, { roomCode: null, role: null, origin: publicOrigin(req) });

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

function sendLibrary(ws) {
  send(ws, {
    t: 'library',
    packs: storage.listPacks(),
    games: storage.listGames(),
    saving: storage.enabled,
    ephemeral: EPHEMERAL,
  });
}

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
  const requireHost = () => {
    if (meta.role !== 'host') throw new Error('Samo voditelj lahko to naredi.');
  };

  switch (msg.t) {
    case 'ping':
      return send(ws, { t: 'pong' });

    // ---------- voditelj ----------
    case 'host:create': {
      if (!passwordOk(msg.password)) return fail(ws, 'Napačno geslo voditelja.', 'auth');
      const room = store.create(broadcast);
      Object.assign(room.settings, sanitizeSettings(msg.settings));
      meta.roomCode = room.code;
      meta.role = 'host';
      send(ws, { t: 'hostToken', code: room.code, hostToken: room.hostToken, joinUrl: `${meta.origin}/p/${room.code}`, ai: aiAvailable() });
      sendLibrary(ws);
      return send(ws, room.hostState());
    }

    case 'host:resume': {
      if (!passwordOk(msg.password)) return fail(ws, 'Napačno geslo voditelja.', 'auth');
      const room = store.get(msg.code);
      if (!room || room.hostToken !== msg.hostToken) throw new Error('Te seje ni več. Ustvari novo sobo.');
      meta.roomCode = room.code;
      meta.role = 'host';
      send(ws, { t: 'hostToken', code: room.code, hostToken: room.hostToken, joinUrl: `${meta.origin}/p/${room.code}`, ai: aiAvailable() });
      sendLibrary(ws);
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
        const { questions, model, dropped, rounds } = await generateQuestions({
          theme,
          count,
          difficulty: String(msg.difficulty || 'srednja'),
          modes,
          tone: String(msg.tone || 'sproščen in duhovit'),
          avoid: msg.append ? room.questions.map((q) => q.text) : [],
        });
        if (msg.append) room.addQuestions(questions);
        else room.setQuestions(questions);

        if (dropped.length) {
          console.log(`[ai] "${theme}": ${questions.length}/${count} vprašanj v ${rounds} krogih, `
            + `zavrnjenih ${dropped.length} (${[...new Set(dropped.map((d) => d.why))].join(', ')})`);
        }
        const short = questions.length < count
          ? ` Model je vrnil ${questions.length} namesto ${count} - dodaj jih z "Dodaj še".`
          : '';
        relayToHost(room, {
          t: 'toast',
          kind: questions.length < count ? 'warn' : 'ok',
          message: `Claude je na temo "${theme}" pripravil ${questions.length} vprašanj.${short}`,
        });
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

    case 'host:weight': {
      const room = hostRoom();
      return room.setWeight(msg.id, msg.weight);
    }

    case 'host:removeQuestion': {
      const room = hostRoom();
      const rest = room.questions.filter((q) => q.id !== msg.id).map(({ id, index, ...r }) => r);
      return room.setQuestions(rest);
    }

    // ---------- knjižnica: shranjeni kvizi in odigrane igre ----------
    case 'host:library':
      requireHost();
      return sendLibrary(ws);

    case 'host:savePack': {
      const room = hostRoom();
      if (!storage.enabled) throw new Error('Shranjevanje na tem strežniku ni na voljo.');
      const pack = storage.savePack({ name: msg.name, theme: room.settings.theme, questions: room.questions });
      sendLibrary(ws);
      return send(ws, { t: 'toast', kind: 'ok', message: `Shranjeno kot "${pack.name}".` });
    }

    case 'host:loadPack': {
      const room = hostRoom();
      const pack = storage.getPack(msg.id);
      if (!pack) throw new Error('Tega kviza ni več.');
      if (msg.append) room.addQuestions(pack.questions);
      else room.setQuestions(pack.questions);
      room.settings.theme = pack.theme || pack.name;
      room.changed();
      return send(ws, { t: 'toast', kind: 'ok', message: `Naložen kviz "${pack.name}".` });
    }

    case 'host:importPack': {
      const room = hostRoom();
      const questions = Array.isArray(msg.questions) ? msg.questions : [];
      if (!questions.length) throw new Error('Datoteka ne vsebuje vprašanj.');
      room.setQuestions(questions.map(({ mode, category, text, options, correct, explanation }) =>
        ({ mode, category, text, options, correct, explanation })));
      if (msg.theme) room.settings.theme = String(msg.theme).slice(0, 200);
      room.changed();
      if (storage.enabled && msg.keep) {
        storage.savePack({ name: msg.name, theme: msg.theme, questions: room.questions });
        sendLibrary(ws);
      }
      return send(ws, { t: 'toast', kind: 'ok', message: `Uvoženih ${room.questions.length} vprašanj.` });
    }

    case 'host:deletePack':
      requireHost();
      storage.deletePack(msg.id);
      return sendLibrary(ws);

    case 'host:deleteGame':
      requireHost();
      storage.deleteGame(msg.id);
      return sendLibrary(ws);

    // ---------- potek igre ----------
    case 'host:autopair':
      return hostRoom().autoPair();

    case 'host:unpair':
      return hostRoom().unpair(msg.playerId);

    case 'host:kick':
      return hostRoom().removePlayer(msg.playerId);

    case 'host:start':
      return hostRoom().start();

    case 'host:next': {
      const room = hostRoom();
      const wasLast = room.index + 1 >= room.questions.length;
      room.next();
      if (wasLast && room.phase === 'ended') archive(room, ws);
      return;
    }

    case 'host:reveal':
      return hostRoom().reveal();

    case 'host:end': {
      const room = hostRoom();
      const hadGame = room.history.length > 0;
      room.end();
      if (hadGame) archive(room, ws);
      return;
    }

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

/** Odigrano igro zapišemo v zgodovino - a le enkrat. */
function archive(room, ws) {
  if (room.archived || !room.history.length) return;
  room.archived = true;
  try {
    storage.saveGame(room.archive());
    sendLibrary(ws);
  } catch (err) {
    console.warn(`[shramba] igre ni bilo mogoče shraniti: ${err.message}`);
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

// Ob ugašanju zapišemo vse na disk - ponudniki dajo nekaj sekund časa.
let closing = false;
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, async () => {
    if (closing) process.exit(0);
    closing = true;
    console.log(`\n${sig} - shranjujem in zapiram ...`);
    await storage.flushAll();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref?.();
  });
}

server.listen(PORT, () => {
  const lan = lanAddress();
  console.log(`\n  CKViz teče na http://localhost:${PORT}`);
  console.log(`  Velik zaslon (PC): ${PUBLIC_URL || `http://localhost:${PORT}`}/host.html`);
  console.log(`  Telefoni:          ${PUBLIC_URL || (lan ? `http://${lan}:${PORT}` : `http://localhost:${PORT}`)}`);
  console.log(`  Claude API:        ${aiAvailable() ? 'na voljo ✅' : 'ni ključa - vgrajena vprašanja ⚠️'}`);
  console.log(`  Shranjevanje:      ${storage.enabled ? `${storage.dir}${EPHEMERAL ? ' (ni trajno ⚠️)' : ''}` : 'izklopljeno ⚠️'}`);
  console.log(`  Geslo voditelja:   ${HOST_PASSWORD ? 'nastavljeno 🔒' : 'ni nastavljeno - kdorkoli lahko odpre velik zaslon ⚠️'}\n`);
});
