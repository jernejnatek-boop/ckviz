// Stanje sobe in potek igre. Vse je v pomnilniku - do 10 igralcev na sobo.

import { randomUUID } from 'node:crypto';
import { MODES, DEFAULT_SETTINGS, MAX_PLAYERS, scoreSubmission, isCorrect, sameAnswer } from './game.js';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // brez I, O, 0, 1
const REVEAL_DELAY_MS = 1200;
const ROOM_TTL_MS = 1000 * 60 * 60 * 6;

export const AVATARS = ['🦊', '🐼', '🐙', '🦄', '🐝', '🐧', '🦁', '🐸', '🦉', '🐬', '🦖', '🐢'];

function code(len = 4) {
  let s = '';
  for (let i = 0; i < len; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return s;
}

/**
 * Slovensko ujemanje s števnikom: 1 pravilen, 2 pravilna, 3 pravilni, 5 pravilnih.
 * forms = [ednina, dvojina, 3-4, ostalo]
 */
export function sloCount(n, forms) {
  const r100 = Math.abs(n) % 100;
  const r10 = Math.abs(n) % 10;
  const idx = r100 >= 11 && r100 <= 14 ? 3 : r10 === 1 ? 0 : r10 === 2 ? 1 : (r10 === 3 || r10 === 4) ? 2 : 3;
  return `${n} ${forms[idx]}`;
}

function emptyStats() {
  return {
    answered: 0,
    factQuestions: 0,
    correct: 0,
    predictOpps: 0,
    predictHits: 0,
    syncOpps: 0,
    syncHits: 0,
    msTotal: 0,
    msCount: 0,
    confidenceTotal: 0,
    confidenceCount: 0,
  };
}

export class Room {
  constructor(onChange) {
    this.code = code();
    this.hostToken = randomUUID();
    this.createdAt = Date.now();
    this.settings = { ...DEFAULT_SETTINGS };
    this.players = new Map();
    this.questions = [];
    this.phase = 'lobby'; // lobby | question | reveal | ended
    this.index = -1;
    this.submissions = new Map(); // questionIndex -> Map(playerId -> submission)
    this.history = [];
    this.questionStartedAt = null;
    this.timer = null;
    this.revealTimer = null;
    this.generating = false;
    this.genError = null;
    this.onChange = onChange || (() => {});
    this.touched = Date.now();
  }

  touch() {
    this.touched = Date.now();
  }

  expired() {
    return Date.now() - this.touched > ROOM_TTL_MS;
  }

  changed() {
    this.touch();
    this.onChange(this);
  }

  // ---------- igralci ----------

  addPlayer({ name, emoji }) {
    if (this.players.size >= MAX_PLAYERS) throw new Error(`Soba je polna (največ ${MAX_PLAYERS} igralcev).`);
    const clean = String(name || '').trim().slice(0, 16);
    if (!clean) throw new Error('Vpiši svoje ime.');
    const taken = new Set([...this.players.values()].map((p) => p.name.toLowerCase()));
    if (taken.has(clean.toLowerCase())) throw new Error('To ime je že zasedeno.');
    const usedEmoji = new Set([...this.players.values()].map((p) => p.emoji));
    const player = {
      id: randomUUID(),
      token: randomUUID(),
      name: clean,
      emoji: emoji && !usedEmoji.has(emoji) ? emoji : AVATARS.find((a) => !usedEmoji.has(a)) || '🎈',
      partnerId: null,
      pendingPartner: null,
      score: 0,
      connected: true,
      lastGain: null,
      stats: emptyStats(),
      joinedAt: Date.now(),
    };
    this.players.set(player.id, player);
    this.changed();
    return player;
  }

  byToken(token) {
    return [...this.players.values()].find((p) => p.token === token) || null;
  }

  removePlayer(id) {
    const p = this.players.get(id);
    if (!p) return;
    this.unpair(id);
    this.players.delete(id);
    this.changed();
  }

  partnerOf(id) {
    const p = this.players.get(id);
    return p?.partnerId ? this.players.get(p.partnerId) || null : null;
  }

  requestPair(fromId, targetId) {
    const a = this.players.get(fromId);
    const b = this.players.get(targetId);
    if (!a || !b || a.id === b.id) throw new Error('Tega igralca ni.');
    if (this.phase !== 'lobby') throw new Error('Pare lahko sestavite samo pred začetkom.');
    if (a.partnerId || b.partnerId) throw new Error('Eden od vaju je že v paru.');
    if (b.pendingPartner === a.id) {
      a.partnerId = b.id;
      b.partnerId = a.id;
      a.pendingPartner = null;
      b.pendingPartner = null;
    } else {
      a.pendingPartner = b.id;
    }
    this.changed();
  }

  unpair(id) {
    const a = this.players.get(id);
    if (!a) return;
    if (a.partnerId) {
      const b = this.players.get(a.partnerId);
      if (b) b.partnerId = null;
      a.partnerId = null;
    }
    a.pendingPartner = null;
    for (const p of this.players.values()) if (p.pendingPartner === id) p.pendingPartner = null;
    this.changed();
  }

  autoPair() {
    if (this.phase !== 'lobby') throw new Error('Pare lahko sestavite samo pred začetkom.');
    const singles = [...this.players.values()].filter((p) => !p.partnerId).sort((x, y) => x.joinedAt - y.joinedAt);
    while (singles.length >= 2) {
      const a = singles.shift();
      const b = singles.shift();
      a.partnerId = b.id;
      b.partnerId = a.id;
      a.pendingPartner = null;
      b.pendingPartner = null;
    }
    this.changed();
  }

  couples() {
    const seen = new Set();
    const out = [];
    for (const p of this.players.values()) {
      if (seen.has(p.id)) continue;
      const partner = this.partnerOf(p.id);
      if (partner) {
        seen.add(p.id);
        seen.add(partner.id);
        out.push({ id: [p.id, partner.id].sort().join(':'), members: [p, partner] });
      } else {
        seen.add(p.id);
        out.push({ id: p.id, members: [p], solo: true });
      }
    }
    return out;
  }

  coupleScores() {
    return this.couples()
      .map((c) => {
        const score = c.members.reduce((s, m) => s + m.score, 0);
        const predictOpps = c.members.reduce((s, m) => s + m.stats.predictOpps, 0);
        const predictHits = c.members.reduce((s, m) => s + m.stats.predictHits, 0);
        const syncOpps = c.members.reduce((s, m) => s + m.stats.syncOpps, 0);
        const syncHits = c.members.reduce((s, m) => s + m.stats.syncHits, 0);
        const opps = predictOpps + syncOpps;
        const hits = predictHits + syncHits;
        return {
          id: c.id,
          solo: Boolean(c.solo),
          name: c.members.map((m) => m.name).join(' & '),
          emojis: c.members.map((m) => m.emoji),
          members: c.members.map((m) => ({ id: m.id, name: m.name, emoji: m.emoji, score: m.score })),
          score,
          chemistry: opps ? Math.round((hits / opps) * 100) : null,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  // ---------- vprašanja ----------

  setQuestions(list) {
    const total = list.length;
    this.questions = list.map((q, i) => ({
      ...q,
      id: `q${i}`,
      index: i,
      hot: this.settings.hotRound && total >= 5 && i >= total - Math.max(1, Math.round(total * 0.2)),
    }));
    this.changed();
  }

  addQuestions(list) {
    this.setQuestions([...this.questions.map(stripMeta), ...list]);
  }

  get current() {
    return this.index >= 0 ? this.questions[this.index] || null : null;
  }

  start() {
    if (!this.questions.length) throw new Error('Najprej pripravi vprašanja.');
    if (this.players.size < 1) throw new Error('Nihče še ni v sobi.');
    for (const p of this.players.values()) {
      p.score = 0;
      p.stats = emptyStats();
      p.lastGain = null;
    }
    this.history = [];
    this.submissions = new Map();
    this.index = -1;
    this.next();
  }

  next() {
    this.clearTimers();
    if (this.index + 1 >= this.questions.length) return this.end();
    this.index += 1;
    this.phase = 'question';
    this.questionStartedAt = Date.now();
    this.submissions.set(this.index, new Map());
    this.timer = setTimeout(() => this.reveal(), this.settings.timeLimit * 1000 + 500);
    this.changed();
  }

  clearTimers() {
    if (this.timer) clearTimeout(this.timer);
    if (this.revealTimer) clearTimeout(this.revealTimer);
    this.timer = null;
    this.revealTimer = null;
  }

  submit(playerId, payload) {
    if (this.phase !== 'question') throw new Error('Trenutno ni odprtega vprašanja.');
    const q = this.current;
    const player = this.players.get(playerId);
    if (!q || !player) throw new Error('Napaka pri oddaji.');
    const def = MODES[q.mode];
    const map = this.submissions.get(this.index);

    let choice = payload.choice;
    if (def.multi) {
      choice = Array.isArray(choice) ? [...new Set(choice.filter((i) => Number.isInteger(i) && i >= 0 && i < q.options.length))].sort() : [];
    } else if (!Number.isInteger(choice) || choice < 0 || choice >= q.options.length) {
      choice = null;
    }

    let predict = null;
    const partner = this.partnerOf(playerId);
    if (def.predicts && partner) {
      predict = Number.isInteger(payload.predict) && payload.predict >= 0 && payload.predict < q.options.length ? payload.predict : null;
    }

    const confidence = def.confidence ? Math.min(3, Math.max(1, Number(payload.confidence) || 1)) : 1;

    const existing = map.get(playerId);
    map.set(playerId, {
      choice,
      predict,
      confidence,
      ms: existing?.ms ?? Date.now() - this.questionStartedAt,
      locked: Boolean(payload.locked),
    });

    this.changed();
    if (this.everyoneLocked()) {
      this.clearTimers();
      this.revealTimer = setTimeout(() => this.reveal(), REVEAL_DELAY_MS);
    }
  }

  everyoneLocked() {
    const q = this.current;
    if (!q) return false;
    const map = this.submissions.get(this.index) || new Map();
    const active = [...this.players.values()].filter((p) => p.connected);
    if (!active.length) return false;
    return active.every((p) => map.get(p.id)?.locked);
  }

  answeredCount() {
    const map = this.submissions.get(this.index) || new Map();
    return [...map.values()].filter((s) => s.locked).length;
  }

  reveal() {
    if (this.phase !== 'question') return;
    this.clearTimers();
    const q = this.current;
    const map = this.submissions.get(this.index) || new Map();
    const def = MODES[q.mode];

    const perPlayer = [];
    for (const p of this.players.values()) {
      const sub = map.get(p.id) || null;
      const partner = this.partnerOf(p.id);
      const partnerSub = partner ? map.get(partner.id) || null : null;
      const { total, lines } = scoreSubmission({
        question: q,
        submission: sub,
        partnerSubmission: partnerSub,
        hasPartner: Boolean(partner),
        timeLimit: this.settings.timeLimit,
      });

      p.score = Math.max(0, p.score + total);
      p.lastGain = { total, lines };

      // statistika
      if (sub?.choice != null) {
        p.stats.answered += 1;
        if (sub.ms != null) { p.stats.msTotal += sub.ms; p.stats.msCount += 1; }
        if (def.confidence) { p.stats.confidenceTotal += sub.confidence || 1; p.stats.confidenceCount += 1; }
      }
      if (def.hasCorrect) {
        p.stats.factQuestions += 1;
        if (sub?.choice != null && isCorrect(q, sub.choice)) p.stats.correct += 1;
      }
      if (def.predicts && partner && sub?.predict != null && partnerSub?.choice != null) {
        p.stats.predictOpps += 1;
        if (sameAnswer(q, sub.predict, partnerSub.choice)) p.stats.predictHits += 1;
      }
      if (q.mode === 'sync' && partner && sub?.choice != null && partnerSub?.choice != null) {
        p.stats.syncOpps += 1;
        if (sameAnswer(q, sub.choice, partnerSub.choice)) p.stats.syncHits += 1;
      }

      perPlayer.push({
        id: p.id,
        name: p.name,
        emoji: p.emoji,
        choice: sub?.choice ?? null,
        predict: sub?.predict ?? null,
        confidence: sub?.confidence ?? 1,
        ms: sub?.ms ?? null,
        gain: total,
        lines,
        correct: def.hasCorrect && sub?.choice != null ? isCorrect(q, sub.choice) : null,
        partnerId: partner?.id || null,
      });
    }

    const distribution = q.options.map((_, i) =>
      perPlayer.filter((r) => (Array.isArray(r.choice) ? r.choice.includes(i) : r.choice === i)).length);

    const pairs = this.couples()
      .filter((c) => !c.solo)
      .map((c) => {
        const [a, b] = c.members;
        const ra = perPlayer.find((r) => r.id === a.id);
        const rb = perPlayer.find((r) => r.id === b.id);
        const match = sameAnswer(q, ra?.choice, rb?.choice);
        const aGuessedB = def.predicts && ra?.predict != null && rb?.choice != null && sameAnswer(q, ra.predict, rb.choice);
        const bGuessedA = def.predicts && rb?.predict != null && ra?.choice != null && sameAnswer(q, rb.predict, ra.choice);
        return {
          id: c.id,
          name: c.members.map((m) => m.name).join(' & '),
          a: ra, b: rb,
          match,
          aGuessedB: Boolean(aGuessedB),
          bGuessedA: Boolean(bGuessedA),
          gain: (ra?.gain || 0) + (rb?.gain || 0),
        };
      });

    this.history.push({
      index: this.index,
      question: { ...q },
      distribution,
      perPlayer,
      pairs,
    });

    this.phase = 'reveal';
    this.changed();
  }

  end() {
    this.clearTimers();
    this.phase = 'ended';
    this.changed();
  }

  backToLobby() {
    this.clearTimers();
    this.phase = 'lobby';
    this.index = -1;
    this.submissions = new Map();
    this.history = [];
    for (const p of this.players.values()) {
      p.score = 0;
      p.stats = emptyStats();
      p.lastGain = null;
    }
    this.changed();
  }

  // ---------- nagrade ----------

  awards() {
    const list = [...this.players.values()];
    const out = [];
    const pick = (label, emoji, arr, fmt) => {
      if (!arr.length) return;
      const best = arr[0];
      out.push({ label, emoji, name: best.p.name, playerEmoji: best.p.emoji, value: fmt(best) });
    };

    pick('Najboljši poznavalec', '💘',
      list.filter((p) => p.stats.predictOpps >= 2)
        .map((p) => ({ p, v: p.stats.predictHits / p.stats.predictOpps }))
        .sort((a, b) => b.v - a.v),
      (b) => `${Math.round(b.v * 100)} % zadetih napovedi`);

    pick('Hodeča enciklopedija', '🧠',
      list.filter((p) => p.stats.factQuestions > 0 && p.stats.correct > 0)
        .map((p) => ({ p, v: p.stats.correct / p.stats.factQuestions, n: p.stats.correct }))
        .sort((a, b) => b.v - a.v || b.n - a.n),
      (b) => `${sloCount(b.n, ['pravilen odgovor', 'pravilna odgovora', 'pravilni odgovori', 'pravilnih odgovorov'])} (${Math.round(b.v * 100)} %)`);

    pick('Najhitrejši prst', '⚡',
      list.filter((p) => p.stats.msCount >= 2)
        .map((p) => ({ p, v: p.stats.msTotal / p.stats.msCount }))
        .sort((a, b) => a.v - b.v),
      (b) => `${(b.v / 1000).toFixed(1)} s v povprečju`);

    pick('Največji hazarder', '🎲',
      list.filter((p) => p.stats.confidenceCount > 0)
        .map((p) => ({ p, v: p.stats.confidenceTotal / p.stats.confidenceCount }))
        .sort((a, b) => b.v - a.v)
        .filter((x) => x.v > 1),
      (b) => `povprečen vložek x${b.v.toFixed(1)}`);

    const chem = this.coupleScores().filter((c) => !c.solo && c.chemistry != null).sort((a, b) => b.chemistry - a.chemistry);
    if (chem.length) {
      out.push({ label: 'Najbolj usklajena', emoji: '🔗', name: chem[0].name, playerEmoji: chem[0].emojis.join(''), value: `${chem[0].chemistry} % kemije` });
    }
    if (chem.length > 1 && chem[chem.length - 1].chemistry < chem[0].chemistry) {
      const last = chem[chem.length - 1];
      out.push({ label: 'Dva svetova', emoji: '🌗', name: last.name, playerEmoji: last.emojis.join(''), value: `${last.chemistry} % kemije - je še prostor za rast` });
    }
    return out;
  }

  // ---------- pogledi ----------

  hostState() {
    const q = this.current;
    return {
      t: 'room',
      code: this.code,
      phase: this.phase,
      settings: this.settings,
      generating: this.generating,
      genError: this.genError,
      questionCount: this.questions.length,
      index: this.index,
      players: [...this.players.values()].map((p) => ({
        id: p.id, name: p.name, emoji: p.emoji, score: p.score,
        partnerId: p.partnerId, pendingPartner: p.pendingPartner, connected: p.connected,
      })),
      couples: this.coupleScores(),
      answered: this.phase === 'question' ? this.answeredCount() : 0,
      expected: [...this.players.values()].filter((p) => p.connected).length,
      question: q && this.phase !== 'lobby' ? {
        id: q.id, index: q.index, mode: q.mode, category: q.category, text: q.text,
        options: q.options, hot: q.hot,
        correct: this.phase === 'reveal' ? q.correct : undefined,
        explanation: this.phase === 'reveal' ? q.explanation : undefined,
      } : null,
      timeLimit: this.settings.timeLimit,
      startedAt: this.questionStartedAt,
      reveal: this.phase === 'reveal' ? this.history[this.history.length - 1] : null,
      awards: this.phase === 'ended' ? this.awards() : null,
      history: this.phase === 'ended' ? this.history : null,
      preview: this.phase === 'lobby' ? this.questions.map((x) => ({
        id: x.id, mode: x.mode, category: x.category, text: x.text, options: x.options,
        correct: x.correct, explanation: x.explanation, hot: x.hot,
      })) : null,
    };
  }

  playerState(playerId) {
    const p = this.players.get(playerId);
    if (!p) return { t: 'gone' };
    const partner = this.partnerOf(playerId);
    const q = this.current;
    const map = this.submissions.get(this.index) || new Map();
    const mine = map.get(playerId) || null;

    const base = {
      t: 'you',
      code: this.code,
      phase: this.phase,
      me: { id: p.id, name: p.name, emoji: p.emoji, score: p.score },
      partner: partner ? { id: partner.id, name: partner.name, emoji: partner.emoji, score: partner.score } : null,
      pendingPartner: p.pendingPartner,
      lobby: this.phase === 'lobby' ? [...this.players.values()]
        .filter((x) => x.id !== p.id)
        .map((x) => ({ id: x.id, name: x.name, emoji: x.emoji, paired: Boolean(x.partnerId), wantsMe: x.pendingPartner === p.id })) : null,
      questionCount: this.questions.length,
      index: this.index,
      timeLimit: this.settings.timeLimit,
      startedAt: this.questionStartedAt,
      standings: this.coupleScores().slice(0, 5),
    };

    if (this.phase === 'question' && q) {
      const def = MODES[q.mode];
      base.question = {
        id: q.id, index: q.index, mode: q.mode, modeLabel: def.label, modeEmoji: def.emoji,
        tagline: def.tagline, category: q.category, text: q.text, options: q.options,
        multi: def.multi, hot: q.hot,
        asksPredict: Boolean(def.predicts && partner),
        asksConfidence: Boolean(def.confidence),
        partnerName: partner?.name || null,
      };
      base.mine = mine;
      base.partnerLocked = partner ? Boolean(map.get(partner.id)?.locked) : false;
    }

    if (this.phase === 'reveal') {
      const h = this.history[this.history.length - 1];
      const mineRow = h?.perPlayer.find((r) => r.id === p.id) || null;
      const partnerRow = partner ? h?.perPlayer.find((r) => r.id === partner.id) || null : null;
      base.reveal = h ? {
        question: h.question,
        me: mineRow,
        partner: partnerRow,
        distribution: h.distribution,
      } : null;
    }

    if (this.phase === 'ended') {
      base.final = {
        couples: this.coupleScores(),
        awards: this.awards(),
        me: { ...p.stats, score: p.score },
      };
    }

    return base;
  }
}

function stripMeta(q) {
  const { id, index, hot, ...rest } = q;
  return rest;
}

export class RoomStore {
  constructor() {
    this.rooms = new Map();
    setInterval(() => this.sweep(), 1000 * 60 * 10).unref?.();
  }
  create(onChange) {
    let room = new Room(onChange);
    while (this.rooms.has(room.code)) room = new Room(onChange);
    this.rooms.set(room.code, room);
    return room;
  }
  get(code) {
    return this.rooms.get(String(code || '').toUpperCase().trim()) || null;
  }
  sweep() {
    for (const [code, room] of this.rooms) {
      if (room.expired()) {
        room.clearTimers();
        this.rooms.delete(code);
      }
    }
  }
}
