// Odjemalec za velik zaslon (PC): priprava kviza, potek in statistika.

import { el, h, clear, Wire, toast, burst, store, OPT_GLYPHS, pct } from '/js/common.js';

const app = el('#app');
const ctrl = el('#ctrl');

let info = { ai: false, lan: null, port: 3000 };
let state = null;
let joinUrl = '';
let ticker = null;

const setup = store('ckviz:setup') || {
  theme: 'Splošna razgledanost',
  count: 12,
  difficulty: 'srednja',
  tone: 'sproščen in duhovit',
  timeLimit: 30,
  hotRound: true,
  modes: ['trivia', 'multi', 'sync', 'know'],
};

fetch('/api/info').then((r) => r.json()).then((i) => { info = i; render(); }).catch(() => {});

const wire = new Wire({
  onOpen: () => {
    const saved = store('ckviz:host');
    if (saved?.code) wire.send({ t: 'host:resume', code: saved.code, hostToken: saved.hostToken });
    else wire.send({ t: 'host:create', settings: { timeLimit: setup.timeLimit, theme: setup.theme, hotRound: setup.hotRound } });
  },
  onStatus: () => {},
  onMessage: (msg) => {
    if (msg.t === 'error') {
      if (/seje ni več/i.test(msg.message)) {
        store('ckviz:host', null);
        wire.send({ t: 'host:create', settings: { timeLimit: setup.timeLimit, theme: setup.theme, hotRound: setup.hotRound } });
        return;
      }
      return toast(msg.message, 'err');
    }
    if (msg.t === 'toast') return toast(msg.message, msg.kind === 'ok' ? 'ok' : 'warn');
    if (msg.t === 'reaction') return burst(msg.emoji, 3);
    if (msg.t === 'hostToken') {
      store('ckviz:host', { code: msg.code, hostToken: msg.hostToken });
      const base = info.lan ? `http://${info.lan}:${info.port}` : location.origin;
      joinUrl = `${base}/p/${msg.code}`;
      return;
    }
    if (msg.t === 'room') {
      const prev = state;
      state = msg;
      if (!joinUrl) joinUrl = `${info.lan ? `http://${info.lan}:${info.port}` : location.origin}/p/${msg.code}`;
      if (prev?.phase === 'question' && msg.phase === 'reveal') celebrate(msg);
      render();
    }
  },
});

function celebrate(s) {
  const best = s.reveal?.pairs?.filter((p) => p.match) || [];
  if (best.length) burst('💞', Math.min(6, best.length * 2));
}

// ---------------------------------------------------------------- risanje

function render() {
  clear(app);
  clear(ctrl);
  if (!state) {
    app.append(h('div', { class: 'card center' }, h('h2', {}, 'Povezujem ...')));
    return;
  }
  if (state.phase === 'lobby') { app.append(viewLobby()); controlsLobby(); }
  else if (state.phase === 'question') { app.append(viewQuestion()); controlsQuestion(); }
  else if (state.phase === 'reveal') { app.append(viewReveal()); controlsReveal(); }
  else if (state.phase === 'ended') { app.append(viewEnd()); controlsEnd(); }
}

function header(right) {
  return h('div', { class: 'row spread', style: 'margin-bottom:20px' },
    h('div', { class: 'brand' },
      h('div', { class: 'brand-mark' }, '💘'),
      h('div', {},
        h('div', { class: 'brand-name' }, 'CKViz'),
        h('div', { class: 'brand-sub' }, state.settings.theme))),
    right || null);
}

// ---------- čakalnica / priprava ----------

function viewLobby() {
  const joinCard = h('div', { class: 'card' },
    h('div', { class: 'row', style: 'gap:26px; align-items:center; flex-wrap:wrap' },
      h('div', { class: 'qr' }, joinUrl ? h('img', { src: `/qr.png?d=${encodeURIComponent(joinUrl)}`, alt: 'QR koda' }) : null),
      h('div', { class: 'grow' },
        h('div', { class: 'tiny' }, 'Koda sobe'),
        h('div', { class: 'code-big' }, state.code),
        h('p', { class: 'muted', style: 'margin-top:10px; font-size:16px' },
          'Skeniraj QR ali odpri ', h('b', { style: 'color:var(--txt)' }, joinUrl.replace(/^https?:\/\//, ''))),
        info.lan ? null : h('p', { class: 'small', style: 'margin-top:6px; color:var(--amber)' },
          'Opozorilo: nisem našel naslova v omrežju - telefoni morajo biti na istem WiFi kot ta računalnik.'))));

  const players = h('div', { class: 'card' },
    h('div', { class: 'row spread' },
      h('div', { class: 'tiny' }, `Igralci (${state.players.length} / ${info.maxPlayers || 10})`),
      h('button', { class: 'btn sm', onclick: () => wire.send({ t: 'host:autopair' }) }, 'Samodejno sestavi pare')),
    h('div', { class: 'player-grid', style: 'margin-top:14px' },
      state.players.length
        ? state.players.map((p) => {
            const partner = state.players.find((x) => x.id === p.partnerId);
            return h('div', { class: `pchip ${p.partnerId ? 'paired' : ''} ${p.connected ? '' : 'off'}` },
              h('span', { style: 'font-size:20px' }, p.emoji),
              h('span', {}, p.name),
              partner ? h('span', { class: 'muted small' }, `💘 ${partner.name}`) : h('span', { class: 'muted small' }, 'brez para'),
              h('span', { class: 'x', title: 'Odstrani', onclick: () => wire.send({ t: 'host:kick', playerId: p.id }) }, '✕'));
          })
        : h('p', { class: 'muted pulse' }, 'Čakam, da se pridružijo igralci ...')));

  const modeBtn = (id, label, emoji) => h('button', {
    class: setup.modes.includes(id) ? 'on' : '',
    onclick: () => {
      setup.modes = setup.modes.includes(id) ? setup.modes.filter((m) => m !== id) : [...setup.modes, id];
      if (!setup.modes.length) setup.modes = [id];
      store('ckviz:setup', setup);
      render();
    },
  }, `${emoji} ${label}`);

  const gen = h('div', { class: 'card' },
    h('div', { class: 'row spread' },
      h('div', { class: 'tiny' }, 'Priprava vprašanj'),
      h('span', { class: 'chip' }, info.ai ? '🤖 Claude povezan' : '⚠️ brez ključa - vgrajena vprašanja')),
    h('div', { class: 'setup-grid', style: 'margin-top:14px' },
      field('Tematika', h('input', {
        type: 'text', value: setup.theme, placeholder: 'npr. 90. leta, potovanja, hrana ...',
        oninput: (e) => { setup.theme = e.target.value; store('ckviz:setup', setup); },
      })),
      field('Št. vprašanj', h('input', {
        type: 'number', min: '3', max: '30', value: setup.count,
        oninput: (e) => { setup.count = Number(e.target.value); store('ckviz:setup', setup); },
      })),
      field('Zahtevnost', select(['lahka', 'srednja', 'težka', 'brutalna'], setup.difficulty, (v) => { setup.difficulty = v; store('ckviz:setup', setup); })),
      field('Ton', select(['sproščen in duhovit', 'romantičen', 'nagajiv', 'resen in poučen'], setup.tone, (v) => { setup.tone = v; store('ckviz:setup', setup); })),
      field('Čas na vprašanje (s)', h('input', {
        type: 'number', min: '10', max: '120', value: setup.timeLimit,
        oninput: (e) => {
          setup.timeLimit = Number(e.target.value); store('ckviz:setup', setup);
          wire.send({ t: 'host:settings', settings: { timeLimit: setup.timeLimit } });
        },
      })),
      field('Vroči krog na koncu', h('button', {
        class: `btn ${setup.hotRound ? 'primary' : ''}`, style: 'width:100%',
        onclick: () => {
          setup.hotRound = !setup.hotRound; store('ckviz:setup', setup);
          wire.send({ t: 'host:settings', settings: { hotRound: setup.hotRound } });
          render();
        },
      }, setup.hotRound ? '🔥 vklopljen' : 'izklopljen'))),
    h('div', { style: 'margin-top:14px' },
      h('div', { class: 'tiny', style: 'margin-bottom:8px' }, 'Načini v tem krogu'),
      h('div', { class: 'mode-toggle' },
        modeBtn('trivia', 'Znanje', '🧠'), modeBtn('multi', 'Več pravilnih', '✅'),
        modeBtn('sync', 'Sinhronizacija', '🔗'), modeBtn('know', 'Ali me poznaš?', '💘'))),
    h('div', { class: 'row', style: 'margin-top:16px; flex-wrap:wrap' },
      h('button', {
        class: 'btn primary', disabled: state.generating,
        onclick: () => wire.send({ t: 'host:generate', ...genPayload(), append: false }),
      }, state.generating ? 'Claude piše ...' : '✨ Ustvari vprašanja'),
      h('button', {
        class: 'btn', disabled: state.generating,
        onclick: () => wire.send({ t: 'host:generate', ...genPayload(), append: true }),
      }, '+ Dodaj še'),
      h('button', {
        class: 'btn ghost', onclick: () => wire.send({ t: 'host:bank', count: setup.count, modes: setup.modes }),
      }, 'Uporabi vgrajena')),
    state.genError ? h('p', { class: 'small', style: 'margin-top:12px; color:var(--amber)' }, state.genError) : null);

  const preview = h('div', { class: 'card' },
    h('div', { class: 'row spread' },
      h('div', { class: 'tiny' }, `Vprašanja (${state.questionCount})`),
      state.questionCount ? h('span', { class: 'muted small' }, 'zadnjih 20 % je vroči krog') : null),
    h('div', { class: 'qlist', style: 'margin-top:12px' },
      state.preview?.length
        ? state.preview.map((q, i) => h('div', { class: 'qrow' },
            h('span', { class: 'muted', style: 'min-width:22px' }, `${i + 1}.`),
            h('div', {},
              h('div', { class: 'row', style: 'gap:6px; margin-bottom:4px; flex-wrap:wrap' },
                h('span', { class: `chip mode-${q.mode}`, style: 'font-size:10px; padding:3px 8px' }, modeName(q.mode)),
                q.hot ? h('span', { class: 'chip hot', style: 'font-size:10px; padding:3px 8px' }, '🔥') : null,
                h('span', { class: 'muted', style: 'font-size:11px' }, q.category)),
              h('div', {}, q.text),
              h('div', { class: 'muted', style: 'font-size:12px; margin-top:4px' },
                q.options.map((o, oi) => {
                  const ok = q.correct == null ? false : Array.isArray(q.correct) ? q.correct.includes(oi) : q.correct === oi;
                  return `${ok ? '✔ ' : ''}${o}`;
                }).join('  ·  '))),
            h('span', { class: 'del', onclick: () => wire.send({ t: 'host:removeQuestion', id: q.id }) }, '✕')))
        : h('p', { class: 'muted' }, 'Še ni vprašanj. Vpiši tematiko in klikni "Ustvari vprašanja".')));

  return h('div', {},
    header(h('span', { class: 'chip' }, `🕒 ${state.settings.timeLimit} s`)),
    h('div', { class: 'grid cols-2' }, joinCard, players),
    h('div', { class: 'grid cols-2', style: 'margin-top:18px' }, gen, preview));
}

function genPayload() {
  return { theme: setup.theme, count: setup.count, difficulty: setup.difficulty, tone: setup.tone, modes: setup.modes };
}

function field(label, input) {
  return h('label', { class: 'field' }, h('span', { class: 'tiny' }, label), input);
}

function select(options, value, onchange) {
  return h('select', { onchange: (e) => onchange(e.target.value) },
    options.map((o) => h('option', { value: o, selected: o === value }, o)));
}

function modeName(m) {
  return { trivia: '🧠 Znanje', multi: '✅ Več pravilnih', sync: '🔗 Sinhro', know: '💘 Poznaš?' }[m] || m;
}

// ---------- med vprašanjem ----------

function viewQuestion() {
  const q = state.question;
  const answered = state.answered;
  const expected = state.expected;

  const left = h('div', { class: 'card' },
    h('div', { class: 'row spread' },
      h('div', { class: 'row', style: 'gap:10px' },
        h('span', { class: `chip mode-${q.mode}` }, modeName(q.mode)),
        h('span', { class: 'chip' }, q.category),
        q.hot ? h('span', { class: 'chip hot' }, '🔥 dvojne točke') : null),
      h('span', { class: 'muted' }, `${q.index + 1} / ${state.questionCount}`)),
    h('h1', { class: 'qtext', style: 'margin-top:22px' }, q.text),
    h('div', { class: 'options', style: 'margin-top:28px' },
      q.options.map((text, i) => h('div', { class: `opt opt-big i${i}` },
        h('span', { class: 'glyph' }, OPT_GLYPHS[i]), h('span', {}, text)))));

  const right = h('div', { class: 'stack' },
    h('div', { class: 'card center' },
      ring(),
      h('div', { style: 'font-size:36px; font-weight:900; margin-top:14px' }, `${answered} / ${expected}`),
      h('div', { class: 'tiny' }, 'oddanih odgovorov')),
    h('div', { class: 'card' },
      h('div', { class: 'tiny', style: 'margin-bottom:12px' }, 'Igralci'),
      h('div', { class: 'player-grid' }, state.players.map((p) => h('div', { class: `pchip ${p.connected ? '' : 'off'}` },
        h('span', { style: 'font-size:18px' }, p.emoji), h('span', {}, p.name))))),
    h('div', { class: 'card' },
      h('div', { class: 'tiny', style: 'margin-bottom:12px' }, 'Vrstni red'),
      h('div', { class: 'pill-list' }, state.couples.slice(0, 6).map((c, i) => rankRow(c, i)))));

  return h('div', {}, header(), h('div', { class: 'grid cols-2' }, left, right));
}

function ring() {
  const size = 132, r = 56, circ = 2 * Math.PI * r;
  const wrap = h('div', { class: 'timer-ring', style: `width:${size}px;height:${size}px;margin:0 auto` });
  wrap.innerHTML = `
    <svg width="${size}" height="${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="rgba(255,255,255,.09)" stroke-width="11" fill="none"/>
      <circle class="prog" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="url(#g)" stroke-width="11" fill="none"
              stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="0"/>
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ff4d94"/><stop offset="100%" stop-color="#8b5cf6"/>
      </linearGradient></defs>
    </svg><div class="t">--</div>`;
  const prog = wrap.querySelector('.prog');
  const label = wrap.querySelector('.t');
  const tick = () => {
    if (!state || state.phase !== 'question' || !state.startedAt) return;
    const elapsed = (Date.now() - state.startedAt) / 1000;
    const left = Math.max(0, state.timeLimit - elapsed);
    label.textContent = Math.ceil(left);
    label.style.color = left <= 5 ? 'var(--red)' : 'var(--txt)';
    prog.setAttribute('stroke-dashoffset', String(circ * (1 - left / state.timeLimit)));
  };
  clearInterval(ticker);
  tick();
  ticker = setInterval(tick, 100);
  return wrap;
}

// ---------- razkritje ----------

function viewReveal() {
  const r = state.reveal;
  const q = state.question;
  if (!r) return h('div', { class: 'card' }, 'Računam ...');

  const total = Math.max(1, r.perPlayer.filter((p) => p.choice != null).length);

  const left = h('div', { class: 'card' },
    h('div', { class: 'row', style: 'gap:10px' },
      h('span', { class: `chip mode-${q.mode}` }, modeName(q.mode)),
      q.hot ? h('span', { class: 'chip hot' }, '🔥') : null,
      h('span', { class: 'muted' }, `${q.index + 1} / ${state.questionCount}`)),
    h('h1', { class: 'qtext', style: 'margin-top:18px; font-size:clamp(22px,2.6vw,40px)' }, q.text),
    h('div', { style: 'margin-top:22px' }, q.options.map((text, i) => {
      const n = r.distribution[i];
      const ok = q.correct == null ? false : Array.isArray(q.correct) ? q.correct.includes(i) : q.correct === i;
      const who = r.perPlayer.filter((p) => Array.isArray(p.choice) ? p.choice.includes(i) : p.choice === i);
      return h('div', { style: 'margin-bottom:14px' },
        h('div', { class: `opt i${i} ${ok ? 'correct' : ''} ${q.correct != null && !ok ? 'dim' : ''}` },
          h('span', { class: 'glyph' }, OPT_GLYPHS[i]),
          h('span', {}, text),
          ok ? h('span', { class: 'tag' }, '✔ pravilno') : null),
        h('div', { class: 'dist' },
          h('span', { class: 'muted small' }, `${pct(n, total)}%`),
          h('div', { class: 'bar-track' }, h('div', {
            class: 'bar-fill',
            style: `width:${pct(n, total)}%; background:var(--o${i})`,
          })),
          h('span', { class: 'n' }, who.map((p) => p.emoji).join('') || '–')));
    })),
    q.explanation ? h('p', { class: 'muted', style: 'margin-top:6px; font-size:15px' }, `💡 ${q.explanation}`) : null);

  const right = h('div', { class: 'stack' },
    r.pairs.length ? h('div', { class: 'card' },
      h('div', { class: 'tiny', style: 'margin-bottom:12px' }, 'Zrcalo parov'),
      h('div', { class: 'pairs' }, r.pairs.map((p) => h('div', { class: `pair-card ${p.match ? 'match' : ''}` },
        h('div', { class: 'row spread' },
          h('b', {}, p.name),
          h('span', { style: 'font-weight:900' }, `+${p.gain}`)),
        h('div', { class: 'two' },
          h('span', { class: 'g' }, answerLabel(q, p.a?.choice)),
          h('span', { style: 'font-size:20px' }, p.match ? '💞' : '🪞'),
          h('span', { class: 'g' }, answerLabel(q, p.b?.choice))),
        h('div', { class: 'muted', style: 'font-size:12px; margin-top:8px; text-align:center' },
          p.aGuessedB || p.bGuessedA
            ? `🎯 ${[p.aGuessedB ? p.a.name : null, p.bGuessedA ? p.b.name : null].filter(Boolean).join(' in ')} uganil/a`
            : (q.mode === 'sync' || q.mode === 'know' ? 'brez zadetka' : '')))))) : null,
    h('div', { class: 'card' },
      h('div', { class: 'tiny', style: 'margin-bottom:12px' }, 'Lestvica'),
      h('div', { class: 'pill-list' }, state.couples.map((c, i) => rankRow(c, i, r)))));

  return h('div', {}, header(), h('div', { class: 'grid cols-2' }, left, right));
}

function answerLabel(q, choice) {
  if (choice == null) return '—';
  if (Array.isArray(choice)) return choice.length ? choice.map((i) => OPT_GLYPHS[i]).join(' ') : '—';
  return q.options[choice] ?? '—';
}

function rankRow(c, i, reveal) {
  const gain = reveal ? c.members.reduce((s, m) => s + (reveal.perPlayer.find((p) => p.id === m.id)?.gain || 0), 0) : 0;
  return h('div', { class: `rank ${i === 0 ? 'top' : ''}` },
    h('span', { class: 'pos' }, `${i + 1}.`),
    h('span', { class: 'who' }, `${c.emojis.join('')} ${c.name}`),
    c.chemistry != null ? h('span', { class: 'chip', style: 'font-size:11px' }, `🔗 ${c.chemistry}%`) : null,
    h('span', { class: 'pts' }, c.score),
    gain ? h('span', { style: 'color:var(--ok); font-weight:800; font-size:13px; min-width:44px; text-align:right' }, `+${gain}`) : null);
}

// ---------- konec ----------

function viewEnd() {
  const cs = state.couples;
  const [first, second, third] = cs;
  setTimeout(() => burst('🎊', 8), 150);

  const box = (c, cls, medal) => c ? h('div', { class: `step-box ${cls}` },
    h('div', { style: 'font-size:36px' }, medal),
    h('div', { style: 'font-size:26px; margin-top:6px' }, c.emojis.join('')),
    h('div', { style: 'font-weight:900; font-size:19px; margin-top:6px' }, c.name),
    h('div', { style: 'font-size:30px; font-weight:900; margin-top:8px' }, c.score),
    c.chemistry != null ? h('div', { class: 'muted small', style: 'margin-top:4px' }, `kemija ${c.chemistry} %`) : null) : h('div');

  // pri manj kot treh ekipah stopničke poravnamo na sredino
  const boxes = cs.length >= 3 ? [box(second, 'p2', '🥈'), box(first, 'p1', '🥇'), box(third, '', '🥉')]
    : cs.length === 2 ? [box(first, 'p1', '🥇'), box(second, 'p2', '🥈')]
    : [box(first, 'p1', '🏆')];

  const podium = h('div', { class: 'card' },
    h('h2', { style: 'font-size:30px; margin-bottom:20px' }, '🏁 Končni rezultat'),
    h('div', {
      class: 'podium',
      style: `grid-template-columns: repeat(${boxes.length}, 1fr); max-width:${boxes.length * 260}px; margin:0 auto`,
    }, boxes),
    cs.length > 3 ? h('div', { class: 'pill-list', style: 'margin-top:18px' }, cs.slice(3).map((c, i) => rankRow(c, i + 3))) : null,
    h('div', { class: 'tiny', style: 'margin:24px 0 10px' }, 'Posamezniki'),
    h('div', { class: 'pill-list' },
      cs.flatMap((c) => c.members).sort((a, b) => b.score - a.score).map((m, i) => h('div', { class: 'rank' },
        h('span', { class: 'pos' }, `${i + 1}.`),
        h('span', { class: 'who' }, `${m.emoji} ${m.name}`),
        h('span', { class: 'pts' }, m.score)))));

  const awards = h('div', { class: 'card' },
    h('div', { class: 'tiny', style: 'margin-bottom:14px' }, 'Nagrade večera'),
    h('div', { class: 'awards' }, (state.awards || []).map((a) => h('div', { class: 'award' },
      h('div', { style: 'font-size:26px' }, a.emoji),
      h('div', { style: 'font-weight:800; margin-top:6px' }, a.label),
      h('div', { style: 'font-size:17px; margin-top:4px' }, `${a.playerEmoji} ${a.name}`),
      h('div', { class: 'muted small', style: 'margin-top:2px' }, a.value)))));

  const chem = cs.filter((c) => c.chemistry != null);
  const chemCard = chem.length ? h('div', { class: 'card' },
    h('div', { class: 'tiny', style: 'margin-bottom:14px' }, 'Kemijomer - kako dobro se poznata'),
    h('div', { class: 'stack' }, chem.map((c) => h('div', {},
      h('div', { class: 'row spread', style: 'margin-bottom:6px' },
        h('span', { style: 'font-weight:700' }, `${c.emojis.join('')} ${c.name}`),
        h('span', { style: 'font-weight:900' }, `${c.chemistry} %`)),
      h('div', { class: 'bar-track', style: 'height:14px' },
        h('div', { class: 'bar-fill', style: `width:${c.chemistry}%; background:linear-gradient(90deg,var(--violet),var(--pink))` })))))) : null;

  const recap = h('div', { class: 'card' },
    h('div', { class: 'tiny', style: 'margin-bottom:14px' }, 'Vprašanje za vprašanjem'),
    h('div', { class: 'recap' }, (state.history || []).map((hRow) => {
      const q = hRow.question;
      const correctIdx = q.correct == null ? [] : Array.isArray(q.correct) ? q.correct : [q.correct];
      const hits = hRow.perPlayer.filter((p) => p.correct === true).length;
      const answeredN = hRow.perPlayer.filter((p) => p.choice != null).length;
      const matches = hRow.pairs.filter((p) => p.match).length;
      return h('div', { class: 'recap-row' },
        h('div', { class: 'row', style: 'gap:6px; margin-bottom:6px; flex-wrap:wrap' },
          h('span', { class: `chip mode-${q.mode}`, style: 'font-size:10px; padding:3px 8px' }, modeName(q.mode)),
          q.hot ? h('span', { class: 'chip hot', style: 'font-size:10px; padding:3px 8px' }, '🔥') : null),
        h('div', { style: 'font-weight:700' }, q.text),
        correctIdx.length
          ? h('div', { class: 'muted', style: 'margin-top:6px' }, `Pravilno: ${correctIdx.map((i) => q.options[i]).join(', ')} · ${hits}/${answeredN} zadetkov`)
          : h('div', { class: 'muted', style: 'margin-top:6px' }, `${matches} ${matches === 1 ? 'par se je ujel' : 'parov se je ujelo'}`));
    })));

  return h('div', {}, header(), h('div', { class: 'grid cols-2' }, podium, h('div', { class: 'stack' }, awards, chemCard)),
    h('div', { style: 'margin-top:18px' }, recap));
}

// ---------- ukazna vrstica ----------

function controlsLobby() {
  ctrl.append(
    h('span', { class: 'chip' }, `${state.players.length} igralcev · ${state.questionCount} vprašanj`),
    h('button', {
      class: 'btn primary', disabled: !state.questionCount || !state.players.length,
      onclick: () => wire.send({ t: 'host:start' }),
    }, '▶ Začni igro'));
}

function controlsQuestion() {
  ctrl.append(
    h('button', { class: 'btn', onclick: () => wire.send({ t: 'host:reveal' }) }, 'Pokaži odgovore'),
    h('button', { class: 'btn ghost danger', onclick: () => wire.send({ t: 'host:end' }) }, 'Končaj'));
}

function controlsReveal() {
  const last = state.index + 1 >= state.questionCount;
  ctrl.append(
    h('button', { class: 'btn primary', onclick: () => wire.send({ t: 'host:next' }) },
      last ? '🏁 Zaključi in pokaži statistiko' : 'Naslednje vprašanje ▶'));
}

function controlsEnd() {
  ctrl.append(
    h('button', { class: 'btn', onclick: () => wire.send({ t: 'host:lobby' }) }, '↺ Nov krog (iste ekipe)'),
    h('button', {
      class: 'btn ghost',
      onclick: () => { store('ckviz:host', null); location.reload(); },
    }, 'Nova soba'));
}

document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, select, textarea')) return;
  if (e.key === ' ' || e.key === 'ArrowRight') {
    e.preventDefault();
    if (state?.phase === 'question') wire.send({ t: 'host:reveal' });
    else if (state?.phase === 'reveal') wire.send({ t: 'host:next' });
    else if (state?.phase === 'lobby') wire.send({ t: 'host:start' });
  }
});
