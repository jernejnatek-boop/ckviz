// Trajno shranjevanje na disk (JSON). Podatkov je malo - do 10 igralcev,
// nekaj deset kvizov in zgodovina iger - zato baza ni potrebna.
//
// Mapo določi CKVIZ_DATA_DIR (privzeto ./data). Zapisi so atomarni
// (zapis v .tmp + preimenovanje) in združeni, da pogosto osveževanje
// stanja sobe ne obremenjuje diska.

import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const MAX_GAMES = 100;
const MAX_PACKS = 200;
const FLUSH_MS = 600;

export class Storage {
  constructor(dir = process.env.CKVIZ_DATA_DIR || './data') {
    this.dir = path.resolve(dir);
    this.data = { packs: [], games: [], rooms: {} };
    this.pending = new Map(); // ime datoteke -> timeout
    this.enabled = true;
  }

  file(name) {
    return path.join(this.dir, `${name}.json`);
  }

  async init() {
    try {
      await fs.mkdir(this.dir, { recursive: true });
    } catch (err) {
      console.warn(`[shramba] mape ${this.dir} ni mogoče ustvariti (${err.message}) - tečem brez shranjevanja.`);
      this.enabled = false;
      return this;
    }
    for (const name of ['packs', 'games', 'rooms']) {
      try {
        const raw = await fs.readFile(this.file(name), 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') this.data[name] = parsed;
      } catch (err) {
        if (err.code !== 'ENOENT') console.warn(`[shramba] ${name}.json je poškodovan (${err.message}) - začenjam prazno.`);
      }
    }
    console.log(`[shramba] ${this.dir} · ${this.data.packs.length} kvizov · ${this.data.games.length} iger · ${Object.keys(this.data.rooms).length} sob`);
    return this;
  }

  /** Zapis z zakasnitvijo - več sprememb zapored se zloži v en zapis. */
  queue(name) {
    if (!this.enabled || this.pending.has(name)) return;
    this.pending.set(name, setTimeout(() => {
      this.pending.delete(name);
      this.flush(name).catch((err) => console.warn(`[shramba] zapis ${name} ni uspel: ${err.message}`));
    }, FLUSH_MS));
  }

  async flush(name) {
    if (!this.enabled) return;
    const target = this.file(name);
    const tmp = `${target}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(this.data[name]), 'utf8');
    await fs.rename(tmp, target);
  }

  async flushAll() {
    for (const [name, timer] of this.pending) {
      clearTimeout(timer);
      this.pending.delete(name);
    }
    for (const name of ['packs', 'games', 'rooms']) {
      await this.flush(name).catch(() => {});
    }
  }

  // ---------- shranjeni kvizi ----------

  listPacks() {
    return [...this.data.packs]
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((p) => ({
        id: p.id, name: p.name, theme: p.theme, createdAt: p.createdAt,
        count: p.questions.length,
        modes: [...new Set(p.questions.map((q) => q.mode))],
      }));
  }

  getPack(id) {
    return this.data.packs.find((p) => p.id === id) || null;
  }

  savePack({ name, theme, questions }) {
    const clean = (questions || []).map(({ mode, category, text, options, correct, explanation }) =>
      ({ mode, category, text, options, correct, explanation }));
    if (!clean.length) throw new Error('Ni vprašanj za shranjevanje.');
    const pack = {
      id: randomUUID(),
      name: String(name || theme || 'Kviz').trim().slice(0, 60) || 'Kviz',
      theme: String(theme || '').slice(0, 200),
      createdAt: Date.now(),
      questions: clean,
    };
    this.data.packs.push(pack);
    if (this.data.packs.length > MAX_PACKS) {
      this.data.packs.sort((a, b) => b.createdAt - a.createdAt);
      this.data.packs.length = MAX_PACKS;
    }
    this.queue('packs');
    return pack;
  }

  deletePack(id) {
    const before = this.data.packs.length;
    this.data.packs = this.data.packs.filter((p) => p.id !== id);
    if (this.data.packs.length !== before) this.queue('packs');
  }

  // ---------- zgodovina iger ----------

  listGames(limit = 25) {
    return [...this.data.games].sort((a, b) => b.playedAt - a.playedAt).slice(0, limit);
  }

  saveGame(record) {
    this.data.games.push({ id: randomUUID(), ...record });
    if (this.data.games.length > MAX_GAMES) {
      this.data.games.sort((a, b) => b.playedAt - a.playedAt);
      this.data.games.length = MAX_GAMES;
    }
    this.queue('games');
  }

  deleteGame(id) {
    const before = this.data.games.length;
    this.data.games = this.data.games.filter((g) => g.id !== id);
    if (this.data.games.length !== before) this.queue('games');
  }

  // ---------- žive sobe (preživetje ponovnega zagona) ----------

  saveRoom(snapshot) {
    this.data.rooms[snapshot.code] = snapshot;
    this.queue('rooms');
  }

  dropRoom(code) {
    if (this.data.rooms[code]) {
      delete this.data.rooms[code];
      this.queue('rooms');
    }
  }

  allRooms() {
    return Object.values(this.data.rooms);
  }
}
