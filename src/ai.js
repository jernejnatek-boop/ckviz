// Generiranje vprašanj s Claude API (Anthropic).
//
// Ključ pride iz okolja: ANTHROPIC_API_KEY (ali `ant auth login` profil).
// Če ključa ni, server samodejno uporabi rezervni nabor iz questionBank.js.

import Anthropic from '@anthropic-ai/sdk';
import { MODE_IDS, MODES } from './game.js';

const MODEL = process.env.CKVIZ_MODEL || 'claude-opus-5';
const FALLBACK_MODEL = process.env.CKVIZ_FALLBACK_MODEL || 'claude-opus-4-8';
// Vprašanja se pišejo enkrat na krog, zato je kakovost pomembnejša od hitrosti.
// Z CKVIZ_EFFORT=low ali medium je generiranje hitrejše, a bolj plehko.
const EFFORT = process.env.CKVIZ_EFFORT || 'high';

let client = null;
export function aiAvailable() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

// Strukturiran izhod Claude API podpira samo osnovno podmnožico JSON Sheme:
// tipe, enum, const, anyOf, allOf, $ref in additionalProperties: false.
// Omejitve dolžin in števil (minItems, maxItems, minimum, minLength, pattern ...)
// vrnejo 400. Zato jih tu ni - "natanko štiri možnosti" zahtevamo v navodilu,
// preverimo pa v normalize().
const UNSUPPORTED_KEYWORDS = [
  'minItems', 'maxItems', 'uniqueItems', 'contains', 'minContains', 'maxContains',
  'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf',
  'minLength', 'maxLength', 'pattern', 'minProperties', 'maxProperties',
];

/** Varovalo: iz sheme odstrani vse, česar API ne sprejme. */
function sanitizeSchema(node) {
  if (Array.isArray(node)) return node.map(sanitizeSchema);
  if (!node || typeof node !== 'object') return node;
  const out = {};
  for (const [key, value] of Object.entries(node)) {
    if (UNSUPPORTED_KEYWORDS.includes(key)) continue;
    out[key] = sanitizeSchema(value);
  }
  return out;
}

const QUESTION_SCHEMA = sanitizeSchema({
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
          options: {
            type: 'array',
            items: { type: 'string' },
            description: 'Natanko štiri možnosti.',
          },
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
});

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

function buildPrompt({ theme, count, difficulty, modes, tone, avoid, topUp }) {
  const mix = modes.map((m) => `- "${m}" (${MODES[m].label}): ${MODES[m].tagline}`).join('\n');
  const avoidLine = avoid?.length
    ? `\n\nTA VPRAŠANJA SO ŽE UPORABLJENA. Ne ponovi jih niti po vsebini, niti z drugimi besedami:\n${avoid.map((t) => `- ${t}`).join('\n')}`
    : '';
  const topUpLine = topUp
    ? `\nTo je dopolnitev kroga - nekaj prejšnjih vprašanj ni bilo uporabnih. Bodi še posebej dosleden pri obliki: natanko štiri možnosti in pravilno izpolnjeno polje "correct".\n`
    : '';

  return `TEMATIKA KROGA: "${theme}"

Sestavi natanko ${count} vprašanj za en krog kviza za pare na to tematiko.
${topUpLine}
ZAHTEVA GLEDE TEMATIKE (najpomembnejša):
- Vsako posamezno vprašanje se mora navezovati na "${theme}". Nobenega splošnega vprašanja, ki bi lahko stalo v katerem koli drugem kvizu.
- To velja tudi za načina "sync" in "know", kjer ni pravilnega odgovora: tam sestavi osebno vprašanje, ki izhaja iz te tematike. (Primer: pri tematiki "potovanja" je dobro vprašanje "Kaj prvo spakiraš v kovček?", slabo pa "Kaj narediš, ko prideš domov?".)
- Če je tematika ozka, jo razširi na sosednja področja, a je ne zapusti.
- Polje "category" naj imenuje podpodročje znotraj tematike, ne splošne kategorije. (Pri tematiki "90. leta" npr. "glasba 90. let", ne "Glasba".)

Zahtevnost dejstvenih vprašanj: ${difficulty}
Ton: ${tone}

Uporabi samo te načine, čim bolj enakomerno premešane:
${mix}${avoidLine}

Odgovori IZKLJUČNO z JSON objektom v tej obliki, brez besedila okoli njega:
{"questions":[{"mode":"trivia","category":"...","text":"...","options":["...","...","...","..."],"correct":[0],"explanation":"..."}]}

Obvezno pri vsakem vprašanju:
- "options" ima natanko 4 elemente,
- "correct" ima pri "trivia" natanko 1 indeks, pri "multi" 2 ali 3, pri "sync" in "know" pa je prazen seznam,
- v odgovoru je natanko ${count} vprašanj.`;
}

function normalize(raw, allowedModes, seen) {
  const out = [];
  const dropped = [];
  for (const q of raw || []) {
    const drop = (why) => dropped.push({ why, text: String(q?.text || '').slice(0, 60) });
    if (!q || typeof q.text !== 'string' || !q.text.trim()) { drop('brez besedila'); continue; }
    const mode = allowedModes.includes(q.mode) ? q.mode : allowedModes[0];
    const options = (q.options || []).map((o) => String(o).trim()).filter(Boolean);
    if (options.length !== 4) { drop(`${options.length} možnosti namesto 4`); continue; }
    const key = q.text.trim().toLowerCase();
    if (seen.has(key)) { drop('podvojeno'); continue; }

    const def = MODES[mode];
    let correct = [...new Set((q.correct || []).filter((i) => Number.isInteger(i) && i >= 0 && i < 4))];
    if (def.hasCorrect) {
      if (correct.length === 0) { drop('manjka pravilni odgovor'); continue; }
      if (!def.multi) correct = [correct[0]];
      if (def.multi && correct.length === 4) { drop('vsi odgovori označeni pravilni'); continue; }
    } else {
      correct = [];
    }

    seen.add(key);
    out.push({
      mode,
      category: String(q.category || '').trim() || 'Splošno',
      text: q.text.trim(),
      options,
      correct: def.hasCorrect ? (def.multi ? correct.sort((a, b) => a - b) : correct[0]) : null,
      explanation: String(q.explanation || '').trim(),
    });
  }
  return { questions: out, dropped };
}

/** Iz napake SDK potegne berljivo sporočilo namesto celotnega JSON telesa. */
function apiMessage(err) {
  const inner = err?.error?.error?.message || err?.error?.message;
  return String(inner || err?.message || err).replace(/\s+/g, ' ').slice(0, 180);
}

/** Ali gre za 400, ki se pritožuje nad shemo (ne nad vsebino zahteve)? */
function isSchemaError(err) {
  const msg = String(err?.message || '');
  return err?.status === 400 && /output_config|schema/i.test(msg);
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
 * En klic modela. Če strežnik zavrne shemo, poskusi brez nje; če varnostni
 * klasifikator zavrne temo, poskusi z rezervnim modelom.
 */
async function askModel(client, promptArgs) {
  const base = {
    max_tokens: 16000,
    system: SYSTEM,
    messages: [{ role: 'user', content: buildPrompt(promptArgs) }],
  };
  const withSchema = {
    ...base,
    output_config: { effort: EFFORT, format: { type: 'json_schema', schema: QUESTION_SCHEMA } },
  };
  const withoutSchema = { ...base, output_config: { effort: EFFORT } };

  let request = withSchema;
  let message;
  try {
    message = await client.messages.create({ ...request, model: MODEL });
  } catch (err) {
    // Če strežnik zavrne samo shemo, vprašanja vseeno dobimo - obliko zahteva
    // že navodilo, pravilnost pa preveri normalize().
    if (!isSchemaError(err)) throw new Error(`Klic Claude API ni uspel: ${apiMessage(err)}`);
    console.warn(`[ai] strežnik je zavrnil JSON shemo (${apiMessage(err)}) - nadaljujem brez nje.`);
    request = withoutSchema;
    try {
      message = await client.messages.create({ ...request, model: MODEL });
    } catch (err2) {
      throw new Error(`Klic Claude API ni uspel: ${apiMessage(err2)}`);
    }
  }

  if (message.stop_reason === 'refusal') {
    message = await client.messages.create({ ...request, model: FALLBACK_MODEL });
    if (message.stop_reason === 'refusal') {
      throw new Error('Model je zavrnil to tematiko. Poskusi z drugačno temo.');
    }
  }
  if (message.stop_reason === 'max_tokens') {
    console.warn('[ai] odgovor je bil odrezan pri max_tokens - zmanjšaj število vprašanj.');
  }
  return message;
}

/**
 * Generira vprašanja s Claudom. Model včasih vrne manj vprašanj, kot smo
 * zahtevali, nekaj pa jih zavrne tudi preverjanje oblike - zato krog po
 * potrebi dopolnimo z dodatnimi klici.
 */
export async function generateQuestions({
  theme,
  count = 12,
  difficulty = 'srednja',
  modes = MODE_IDS,
  tone = 'sproščen in duhovit',
  avoid = [],
  maxRounds = 3,
} = {}) {
  const allowed = modes.filter((m) => MODE_IDS.includes(m));
  const useModes = allowed.length ? allowed : MODE_IDS;
  const client = getClient();

  const collected = [];
  const seen = new Set(avoid.map((t) => String(t).trim().toLowerCase()));
  const droppedAll = [];
  let model = MODEL;
  let rounds = 0;

  while (collected.length < count && rounds < maxRounds) {
    const missing = count - collected.length;
    const message = await askModel(client, {
      theme,
      // Ob dopolnjevanju prosimo za nekaj rezerve, da ne rabimo še enega kroga.
      count: rounds === 0 ? count : Math.min(missing + 2, 10),
      difficulty,
      modes: useModes,
      tone,
      avoid: [...avoid, ...collected.map((q) => q.text)],
      topUp: rounds > 0,
    });
    model = message.model || model;

    const parsed = extractJson(message);
    const { questions, dropped } = normalize(parsed.questions, useModes, seen);
    droppedAll.push(...dropped);
    for (const q of questions) {
      if (collected.length >= count) break;
      collected.push(q);
    }
    rounds++;

    // Če krog ni prinesel ničesar uporabnega, nadaljnji poskusi nimajo smisla.
    if (!questions.length) break;
  }

  if (!collected.length) throw new Error('Claude ni vrnil uporabnih vprašanj. Poskusi znova.');

  return {
    questions: collected.slice(0, count),
    model,
    requested: count,
    rounds,
    dropped: droppedAll,
  };
}
