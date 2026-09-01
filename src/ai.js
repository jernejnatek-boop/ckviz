// Generiranje vprašanj s Claude API (Anthropic).
//
// Ključ pride iz okolja: ANTHROPIC_API_KEY (ali `ant auth login` profil).
// Če ključa ni, server samodejno uporabi rezervni nabor iz questionBank.js.

import Anthropic from '@anthropic-ai/sdk';
import { MODE_IDS, MODES } from './game.js';

const MODEL = process.env.CKVIZ_MODEL || 'claude-opus-5';
const FALLBACK_MODEL = process.env.CKVIZ_FALLBACK_MODEL || 'claude-opus-4-8';
const EFFORT = process.env.CKVIZ_EFFORT || 'medium';

let client = null;
export function aiAvailable() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

const QUESTION_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          mode: { type: 'string', enum: MODE_IDS },
          category: { type: 'string' },
          text: { type: 'string' },
          options: { type: 'array', items: { type: 'string' }, minItems: 4, maxItems: 4 },
          correct: {
            type: 'array',
            items: { type: 'integer', enum: [0, 1, 2, 3] },
            description: 'Indeksi pravilnih odgovorov. Prazno za načina sync in know.',
          },
          explanation: { type: 'string' },
        },
        required: ['mode', 'category', 'text', 'options', 'correct', 'explanation'],
        additionalProperties: false,
      },
    },
  },
  required: ['questions'],
  additionalProperties: false,
};

const SYSTEM = `Si avtor vprašanj za CKViz - kviz za pare, kjer vsak igralec odgovarja na svojem telefonu, rezultati pa se prikazujejo na velikem zaslonu.

Piši IZKLJUČNO v slovenščini, s pravilnimi šumniki in naravnim, pogovorno sproščenim tonom. Nikoli ne uporabi angleških izrazov, kjer obstaja slovenski.

Vsako vprašanje ima natanko 4 možnosti. Na voljo so štirje načini:

- "trivia" (${MODES.trivia.label}): vprašanje z enim samim nedvoumno pravilnim odgovorom. "correct" vsebuje natanko en indeks. Ostale tri možnosti morajo biti verjetne, ne smešno napačne. "explanation" je ena kratka poved, ki pojasni pravilni odgovor.
- "multi" (${MODES.multi.label}): dejstveno vprašanje, kjer sta pravilna dva ali trije odgovori. "correct" vsebuje 2 ali 3 indekse. "explanation" na kratko pove, zakaj so ostale možnosti napačne.
- "sync" (${MODES.sync.label}): NI pravilnega odgovora. Par mora brez pogovarjanja izbrati isto možnost. Vprašanje naslavlja oba hkrati in se začne s "Izberita isto:". Vse štiri možnosti morajo biti enako mikavne, da izbira ni očitna. "correct" je prazen seznam, "explanation" prazen niz.
- "know" (${MODES.know.label}): NI pravilnega odgovora. Vsak odgovori zase, partner pa ugiba, kaj je izbral. Vprašanje je v drugi osebi ednine ("Kaj bi ti raje ...?") in mora razkriti nekaj o osebnosti, navadah ali okusu. Možnosti so štirje resnično različni tipi ljudi. "correct" je prazen seznam, "explanation" prazen niz.

Pravila kakovosti:
- Nobeno vprašanje se ne sme podvajati po vsebini.
- Možnosti naj bodo kratke (največ 6 besed) in približno enako dolge.
- Pravilni odgovori naj bodo enakomerno razporejeni po vseh štirih mestih.
- Vprašanja za pare naj bodo topla in zabavna, nikoli žaljiva, spolno eksplicitna ali taka, ki bi lahko sprožila resen prepir.
- Dejstva v načinih trivia in multi morajo biti preverljivo resnična.`;

function buildPrompt({ theme, count, difficulty, modes, tone, avoid }) {
  const mix = modes.map((m) => `- ${m} (${MODES[m].label}): ${MODES[m].tagline}`).join('\n');
  const avoidLine = avoid?.length
    ? `\n\nTa vprašanja so že bila uporabljena, ne ponavljaj jih niti po vsebini:\n${avoid.map((t) => `- ${t}`).join('\n')}`
    : '';
  return `Sestavi ${count} vprašanj za en krog kviza.

Tematika: ${theme}
Zahtevnost dejstvenih vprašanj: ${difficulty}
Ton: ${tone}

Uporabi samo te načine, čim bolj enakomerno premešane:
${mix}

Vprašanja naj sledijo tematiki tudi v načinih sync in know - če je tema npr. "potovanja", naj bodo osebna vprašanja o potovanjih.${avoidLine}`;
}

function normalize(raw, allowedModes) {
  const out = [];
  const seen = new Set();
  for (const q of raw || []) {
    if (!q || typeof q.text !== 'string') continue;
    const mode = allowedModes.includes(q.mode) ? q.mode : allowedModes[0];
    const options = (q.options || []).map((o) => String(o).trim()).filter(Boolean);
    if (options.length !== 4) continue;
    const key = q.text.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const def = MODES[mode];
    let correct = (q.correct || []).filter((i) => Number.isInteger(i) && i >= 0 && i < 4);
    correct = [...new Set(correct)];
    if (def.hasCorrect) {
      if (correct.length === 0) continue;
      if (!def.multi) correct = [correct[0]];
      if (def.multi && correct.length === 4) continue;
    } else {
      correct = [];
    }

    out.push({
      mode,
      category: String(q.category || '').trim() || 'Splošno',
      text: q.text.trim(),
      options,
      correct: def.hasCorrect ? (def.multi ? correct.sort((a, b) => a - b) : correct[0]) : null,
      explanation: String(q.explanation || '').trim(),
    });
  }
  return out;
}

function extractJson(message) {
  const text = (message.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('Claude ni vrnil veljavnega JSON.');
    return JSON.parse(text.slice(start, end + 1));
  }
}

/**
 * Generira vprašanja s Claudom. Vrne {questions, source}.
 * Ob napaki vrže Error s sporočilom v slovenščini.
 */
export async function generateQuestions({
  theme,
  count = 12,
  difficulty = 'srednja',
  modes = MODE_IDS,
  tone = 'sproščen in duhovit',
  avoid = [],
} = {}) {
  const allowed = modes.filter((m) => MODE_IDS.includes(m));
  const useModes = allowed.length ? allowed : MODE_IDS;
  const c = getClient();

  const request = {
    max_tokens: 16000,
    system: SYSTEM,
    messages: [{ role: 'user', content: buildPrompt({ theme, count, difficulty, modes: useModes, tone, avoid }) }],
    output_config: {
      effort: EFFORT,
      format: { type: 'json_schema', schema: QUESTION_SCHEMA },
    },
  };

  let message;
  try {
    message = await c.messages.create({ ...request, model: MODEL });
  } catch (err) {
    throw new Error(`Klic Claude API ni uspel: ${err?.message || err}`);
  }

  // Varnostni klasifikator lahko zavrne zahtevo - takrat poskusimo z drugim modelom.
  if (message.stop_reason === 'refusal') {
    message = await c.messages.create({ ...request, model: FALLBACK_MODEL });
    if (message.stop_reason === 'refusal') {
      throw new Error('Model je zavrnil to tematiko. Poskusi z drugačno temo.');
    }
  }

  const parsed = extractJson(message);
  const questions = normalize(parsed.questions, useModes);
  if (!questions.length) throw new Error('Claude ni vrnil uporabnih vprašanj. Poskusi znova.');

  return {
    questions: questions.slice(0, count),
    usage: message.usage,
    model: message.model,
  };
}
