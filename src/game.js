// Osrednja pravila igre CKViz.
//
// Vsako vprašanje ima dve plasti:
//   1. ODGOVOR   - kaj izbereš ti
//   2. NAPOVED   - kaj misliš, da je izbral tvoj par
// Iz druge plasti se rodi "kemija" - koliko se dejansko poznata.

export const MODES = {
  trivia: {
    id: 'trivia',
    label: 'Znanje',
    emoji: '🧠',
    tagline: 'En pravilen odgovor. Kdo ve več?',
    hasCorrect: true,
    multi: false,
    predicts: true,
    confidence: true,
  },
  multi: {
    id: 'multi',
    label: 'Več pravilnih',
    emoji: '✅',
    tagline: 'Izberi vse, kar drži. Napačna izbira boli.',
    hasCorrect: true,
    multi: true,
    predicts: false,
    confidence: true,
  },
  sync: {
    id: 'sync',
    label: 'Sinhronizacija',
    emoji: '🔗',
    tagline: 'Ni pravilnega odgovora. Izberita isto - brez pogovora.',
    hasCorrect: false,
    multi: false,
    predicts: true,
    confidence: false,
  },
  know: {
    id: 'know',
    label: 'Ali me poznaš?',
    emoji: '💘',
    tagline: 'Odgovori zase in ugani, kaj je izbral tvoj par.',
    hasCorrect: false,
    multi: false,
    predicts: true,
    confidence: false,
  },
  open: {
    id: 'open',
    label: 'Z besedami',
    emoji: '✍️',
    tagline: 'Odgovorita s svojimi besedami. Točke da ujemanje pomena, ne črk.',
    hasCorrect: false,
    multi: false,
    predicts: false,
    confidence: false,
    open: true,
  },
};

export const MODE_IDS = Object.keys(MODES);

export const POINTS = {
  correct: 100,          // pravilen odgovor (trivia)
  wrongRisk: 25,         // odbitek na vložek nad x1, če zgrešiš
  multiHit: 40,          // vsaka pravilno izbrana opcija
  multiMiss: 20,         // vsaka napačno izbrana opcija
  predict: 60,           // pravilna napoved partnerja
  syncMatch: 150,        // oba izbrala isto v sinhronizaciji
  knowHit: 150,          // pravilno ugibanje v "Ali me poznaš?"
  speedMax: 50,          // maksimalen bonus za hitrost
  soloBoost: 1.4,        // igralec brez para dobi pribitek na znanje
  hotMultiplier: 2,      // privzet množitelj vročega kroga
  openMax: 200,          // pri 100 % ujemanju opisnih odgovorov
  openSolo: 80,          // igralec brez para - nima se s kom ujeti
};

export const CONFIDENCE_LEVELS = [1, 2, 3];
export const WEIGHT_LEVELS = [1, 2, 3];

/** Množitelj vprašanja, omejen na dovoljene vrednosti. */
export function questionWeight(question) {
  const w = Math.round(Number(question?.weight) || 1);
  return WEIGHT_LEVELS.includes(w) ? w : 1;
}

export const DEFAULT_SETTINGS = {
  timeLimit: 30,       // vprašanja z izbiro
  openTimeLimit: 75,   // opisna vprašanja - pisanje traja dlje
  theme: 'Splošna razgledanost',
  hotRound: true,
};

/** Koliko časa ima igralec pri tem vprašanju. */
export function timeLimitFor(question, settings) {
  return MODES[question?.mode]?.open
    ? (settings.openTimeLimit || DEFAULT_SETTINGS.openTimeLimit)
    : (settings.timeLimit || DEFAULT_SETTINGS.timeLimit);
}

export const MAX_PLAYERS = 10;
export const MIN_QUESTIONS = 3;
export const MAX_QUESTIONS = 60;

const eq = (a, b) => a === b;

function arraysEqualSet(a, b) {
  const sa = new Set(a);
  const sb = new Set(b);
  if (sa.size !== sb.size) return false;
  for (const v of sa) if (!sb.has(v)) return false;
  return true;
}

/**
 * Ali je odgovor "pravilen" (samo za načina z resnico).
 */
export function isCorrect(question, choice) {
  const mode = MODES[question.mode];
  if (!mode?.hasCorrect) return null;
  if (mode.multi) {
    if (!Array.isArray(choice)) return false;
    return arraysEqualSet(choice, question.correct);
  }
  return eq(choice, question.correct);
}

/**
 * Ali se ujemata odgovora dveh ljudi.
 */
export function sameAnswer(question, a, b) {
  if (a == null || b == null) return false;
  if (MODES[question.mode]?.multi) return arraysEqualSet(a, b);
  return eq(a, b);
}

function speedBonus(question, submission, timeLimit) {
  if (!submission || submission.ms == null) return 0;
  const frac = Math.max(0, 1 - submission.ms / (timeLimit * 1000));
  return Math.round(POINTS.speedMax * frac);
}

/**
 * Izračun točk za enega igralca pri enem vprašanju.
 * Vrne razčlenjen objekt, da lahko na zaslonu pokažemo, od kod točke.
 */
export function scoreSubmission({ question, submission, partnerSubmission, hasPartner, timeLimit }) {
  const mode = MODES[question.mode];
  const lines = [];
  let total = 0;

  const conf = mode.confidence ? (submission?.confidence || 1) : 1;
  const answered = submission && submission.choice != null;

  if (mode.hasCorrect && answered) {
    const ok = isCorrect(question, submission.choice);
    if (mode.multi) {
      const picked = Array.isArray(submission.choice) ? submission.choice : [];
      const correctSet = new Set(question.correct);
      let raw = 0;
      for (const p of picked) raw += correctSet.has(p) ? POINTS.multiHit : -POINTS.multiMiss;
      raw = Math.max(0, raw) * conf;
      if (raw > 0) lines.push({ key: 'multi', label: 'Pravilne izbire', value: raw });
      total += raw;
      if (ok) {
        const b = speedBonus(question, submission, timeLimit);
        if (b) { lines.push({ key: 'speed', label: 'Hitrost', value: b }); total += b; }
      }
    } else if (ok) {
      const base = POINTS.correct * conf;
      lines.push({ key: 'correct', label: `Pravilno${conf > 1 ? ` (vložek x${conf})` : ''}`, value: base });
      total += base;
      const b = speedBonus(question, submission, timeLimit);
      if (b) { lines.push({ key: 'speed', label: 'Hitrost', value: b }); total += b; }
    } else if (conf > 1) {
      const pen = -POINTS.wrongRisk * (conf - 1);
      lines.push({ key: 'risk', label: `Zgrešen vložek x${conf}`, value: pen });
      total += pen;
    }
    if (!hasPartner && total > 0) {
      const boost = Math.round(total * (POINTS.soloBoost - 1));
      if (boost) { lines.push({ key: 'solo', label: 'Solo pribitek', value: boost }); total += boost; }
    }
  }

  if (mode.predicts && hasPartner && submission?.predict != null && partnerSubmission?.choice != null) {
    const hit = sameAnswer(question, submission.predict, partnerSubmission.choice);
    if (hit) {
      const v = question.mode === 'know' ? POINTS.knowHit : POINTS.predict;
      lines.push({ key: 'predict', label: 'Ugani par 💘', value: v });
      total += v;
    }
  }

  if (mode.open) {
    const written = typeof submission?.text === 'string' && submission.text.trim().length > 0;
    if (written && hasPartner) {
      const sim = Math.max(0, Math.min(100, Number(submission.similarity) || 0));
      const value = Math.round((POINTS.openMax * sim) / 100);
      if (value > 0) {
        lines.push({ key: 'open', label: `Ujemanje ${sim} % ✍️`, value });
        total += value;
      }
    } else if (written) {
      lines.push({ key: 'openSolo', label: 'Zapisan odgovor ✍️', value: POINTS.openSolo });
      total += POINTS.openSolo;
    }
  }

  if (question.mode === 'sync' && hasPartner && answered && partnerSubmission?.choice != null) {
    if (sameAnswer(question, submission.choice, partnerSubmission.choice)) {
      lines.push({ key: 'sync', label: 'Ista misel 🔗', value: POINTS.syncMatch });
      total += POINTS.syncMatch;
    }
  }

  // Množitelj vprašanja - privzeto 1, voditelj ga lahko nastavi za vsako vprašanje.
  const weight = questionWeight(question);
  if (weight > 1 && total > 0) {
    const extra = total * (weight - 1);
    lines.push({ key: 'weight', label: `Vredno x${weight} 🔥`, value: extra });
    total += extra;
  }

  return { total: Math.round(total), lines };
}
