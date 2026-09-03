// Odjemalec za velik zaslon (PC): priprava kviza, potek in statistika.

import { el, h, clear, Wire, toast, burst, store, OPT_GLYPHS, pct, sloCount, IGRALCI, VPRASANJA } from '/js/common.js';

const app = el('#app');
const ctrl = el('#ctrl');

let info = { ai: false, needsPassword: false, saving: false };
let state = null;
let joinUrl = '';
let ticker = null;
let library = { packs: [], games: [], saving: false };
let password = store('ckviz:pw') || '';
let authNeeded = false;
let infoLoaded = false;
let socketReady = false;
let pairPick = null;   // prvi izbrani igralec pri sestavljanju para na zaslonu

const setup = store('ckviz:setup') || {
  theme: 'Splošna razgledanost',
  count: 12,
  difficulty: 'srednja',
  tone: 'sproščen in duhovit',
  timeLimit: 30,
  openTimeLimit: 75,
  hotRound: true,
  modes: ['trivia', 'multi', 'sync', 'know', 'open'],
};

fetch('/api/info')
  .then((r) => r.json())
  .then((i) => { info = i; })
  .catch(() => {})
  .finally(() => { infoLoaded = true; maybeOpen(); });

const wire = new Wire({
  onOpen: () => { socketReady = true; maybeOpen(); },
  onStatus: () => {},
  onMessage: (msg) => {
    if (msg.t === 'error') {
      if (msg.code === 'auth') {
        authNeeded = true;
        password = '';
        store('ckviz:pw', null);
        render();
        return toast(msg.message, 'err');
      }
      if (/seje ni več/i.test(msg.message)) {
        store('ckviz:host', null);
        wire.send({ t: 'host:create', password, settings: { timeLimit: setup.timeLimit, openTimeLimit: setup.openTimeLimit, theme: setup.theme, hotRound: setup.hotRound } });
        return;
      }
      return toast(msg.message, 'err');
    }
    if (msg.t === 'library') {
      library = {
        packs: msg.packs || [],
        games: msg.games || [],
        saving: Boolean(msg.saving),
        ephemeral: Boolean(msg.ephemeral),
      };
      return render();
    }
    if (msg.t === 'toast') return toast(msg.message, msg.kind === 'ok' ? 'ok' : 'warn');
    if (msg.t === 'reaction') return burst(msg.emoji, 3);
    if (msg.t === 'hostToken') {
      authNeeded = false;
      if (password) store('ckviz:pw', password);
      store('ckviz:host', { code: msg.code, hostToken: msg.hostToken });
      joinUrl = msg.joinUrl || `${location.origin}/p/${msg.code}`;
      return;
    }
    if (msg.t === 'room') {
      const prev = state;
      state = msg;
      if (!joinUrl) joinUrl = `${location.origin}/p/${msg.code}`;
      if (prev?.phase === 'question' && msg.phase === 'reveal') celebrate(msg);
      render();
    }
  },
});

/** Sejo odpremo šele, ko vemo, ali strežnik sploh zahteva geslo. */
function maybeOpen() {
  if (!socketReady || !infoLoaded) return;
  if (info.needsPassword && !password) {
    authNeeded = true;
    return render();
  }
  openSession();
}

function openSession() {
  const saved = store('ckviz:host');
  if (saved?.code) wire.send({ t: 'host:resume', code: saved.code, hostToken: saved.hostToken, password });
  else wire.send({ t: 'host:create', password, settings: { timeLimit: setup.timeLimit, openTimeLimit: setup.openTimeLimit, theme: setup.theme, hotRound: setup.hotRound } });
}

function celebrate(s) {
  const best = s.reveal?.pairs?.filter((p) => p.match) || [];
  if (best.length) burst('💞', Math.min(6, best.length * 2));
}

// ---------------------------------------------------------------- risanje

function render() {
  clear(app);
  clear(ctrl);
  if (authNeeded) return app.append(viewAuth());
  if (!state) {
    app.append(h('div', { class: 'card center' }, h('h2', {}, 'Povezujem ...')));
    return;
  }
  if (state.phase === 'lobby') { app.append(viewLobby()); controlsLobby(); }
  else if (state.phase === 'question') { app.append(viewQuestion()); controlsQuestion(); }
  else if (state.phase === 'judging') { app.append(viewJudging()); }
  else if (state.phase === 'reveal') { app.append(viewReveal()); controlsReveal(); }
  else if (state.phase === 'ended') { app.append(viewEnd()); controlsEnd(); }
}

function viewAuth() {
  const input = h('input', { type: 'password', id: 'pw', placeholder: 'geslo', autofocus: true });
  return h('div', { style: 'max-width:420px; margin:12vh auto' },
    h('div', { class: 'brand', style: 'justify-content:center; margin-bottom:24px' },
      h('div', { class: 'brand-mark' }, '💘'),
      h('div', {}, h('div', { class: 'brand-name' }, 'CKViz'), h('div', { class: 'brand-sub' }, 'velik zaslon'))),
    h('form', {
      class: 'card stack',
      onsubmit: (e) => {
        e.preventDefault();
        password = input.value;
        authNeeded = false;
        openSession();
        render();
        toast('Odpiram sobo ...');
      },
    },
      h('h2', { style: 'font-size:20px' }, 'Geslo voditelja'),
      h('p', { class: 'muted small' }, 'Ta strežnik je zaščiten, da igre ne more odpreti kdorkoli.'),
      input,
      h('button', { class: 'btn primary big', type: 'submit' }, 'Odpri')));
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
        joinHint())));

  // Če izbrani igralec medtem izgine ali se spari, izbiro pozabimo.
  const picked = state.players.find((x) => x.id === pairPick && !x.partnerId);
  if (pairPick && !picked) pairPick = null;

  const unpaired = state.players.filter((p) => !p.partnerId).length;

  const players = h('div', { class: 'card' },
    h('div', { class: 'row spread wrap-row' },
      h('div', { class: 'tiny' }, `Igralci (${state.players.length} / ${info.maxPlayers || 10})`),
      h('div', { class: 'row', style: 'gap:8px' },
        h('button', {
          class: 'btn sm', disabled: unpaired < 2,
          onclick: () => { pairPick = null; wire.send({ t: 'host:autopair' }); },
        }, 'Samodejno sestavi pare'),
        h('button', {
          class: 'btn sm ghost', disabled: unpaired === state.players.length,
          onclick: () => { pairPick = null; wire.send({ t: 'host:unpairAll' }); },
        }, 'Razdruži vse'))),

    h('p', { class: 'muted small', style: 'margin-top:10px' },
      pairPick
        ? `Izbran/a ${picked.emoji} ${picked.name} - klikni še njegov ali njen par.`
        : 'Klikni dva igralca, da ju povežeš. 💔 razdruži par, ✕ odstrani igralca iz sobe.'),

    h('div', { class: 'player-grid', style: 'margin-top:12px' },
      state.players.length
        ? state.players.map((p) => {
            const partner = state.players.find((x) => x.id === p.partnerId);
            const selectable = !p.partnerId;
            return h('div', {
              class: `pchip ${p.partnerId ? 'paired' : ''} ${p.connected ? '' : 'off'}`
                + `${pairPick === p.id ? ' picked' : ''}${selectable ? ' selectable' : ''}`,
              onclick: () => {
                if (!selectable) return;
                if (pairPick === p.id) pairPick = null;
                else if (pairPick) { wire.send({ t: 'host:pair', aId: pairPick, bId: p.id }); pairPick = null; }
                else pairPick = p.id;
                render();
              },
            },
              h('span', { style: 'font-size:20px' }, p.emoji),
              h('span', {}, p.name),
              partner ? h('span', { class: 'muted small' }, `💘 ${partner.name}`) : h('span', { class: 'muted small' }, 'brez para'),
              partner ? h('span', {
                class: 'x', title: `Razdruži ${p.name} in ${partner.name}`,
                onclick: (e) => { e.stopPropagation(); wire.send({ t: 'host:unpair', playerId: p.id }); },
              }, '💔') : null,
              h('span', {
                class: 'x', title: 'Odstrani iz sobe',
                onclick: (e) => { e.stopPropagation(); wire.send({ t: 'host:kick', playerId: p.id }); },
              }, '✕'));
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
      field('Št. vprašanj', countInput()),
      field('Zahtevnost', select(['lahka', 'srednja', 'težka', 'brutalna'], setup.difficulty, (v) => { setup.difficulty = v; store('ckviz:setup', setup); })),
      field('Ton', select(['sproščen in duhovit', 'romantičen', 'nagajiv', 'resen in poučen'], setup.tone, (v) => { setup.tone = v; store('ckviz:setup', setup); })),
      field('Čas: izbirna (s)', h('input', {
        type: 'number', min: '10', max: '120', value: setup.timeLimit,
        oninput: (e) => {
          setup.timeLimit = Number(e.target.value); store('ckviz:setup', setup);
          wire.send({ t: 'host:settings', settings: { timeLimit: setup.timeLimit } });
        },
      })),
      field('Čas: opisna ✍️ (s)', h('input', {
        type: 'number', min: '20', max: '300', value: setup.openTimeLimit,
        oninput: (e) => {
          setup.openTimeLimit = Number(e.target.value); store('ckviz:setup', setup);
          wire.send({ t: 'host:settings', settings: { openTimeLimit: setup.openTimeLimit } });
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
        modeBtn('sync', 'Sinhronizacija', '🔗'), modeBtn('know', 'Ali me poznaš?', '💘'),
        modeBtn('open', 'Z besedami', '✍️'))),
    setup.modes.includes('open') && !info.ai
      ? h('p', { class: 'small', style: 'margin-top:10px; color:var(--amber)' },
          'Način "Z besedami" brez ključa deluje, a ujemanje oceni preprost izračun namesto Clauda.')
      : null,
    h('div', { class: 'row', style: 'margin-top:16px; flex-wrap:wrap' },
      h('button', {
        class: 'btn primary', disabled: state.generating,
        onclick: () => wire.send({ t: 'host:generate', ...genPayload(), append: false }),
      }, state.generating
        ? (state.genProgress?.done ? `Claude piše ... ${state.genProgress.done}/${state.genProgress.total}` : 'Claude piše ...')
        : '✨ Ustvari vprašanja'),
      h('button', {
        class: 'btn', disabled: state.generating,
        onclick: () => wire.send({ t: 'host:generate', ...genPayload(), append: true }),
      }, '+ Dodaj še'),
      h('button', {
        class: 'btn ghost', onclick: () => wire.send({ t: 'host:bank', count: genPayload().count, modes: setup.modes }),
      }, 'Uporabi vgrajena')),
    state.genError ? h('p', { class: 'small', style: 'margin-top:12px; color:var(--amber)' }, state.genError) : null);

  const preview = h('div', { class: 'card' },
    h('div', { class: 'row spread' },
      h('div', { class: 'tiny' }, `Vprašanja (${state.questionCount})`),
      state.questionCount ? h('span', { class: 'muted small' }, 'x1/x2/x3 = koliko je vredno posamezno vprašanje') : null),
    h('div', { class: 'qlist', style: 'margin-top:12px' },
      state.preview?.length
        ? state.preview.map((q, i) => h('div', { class: 'qrow' },
            h('span', { class: 'muted', style: 'min-width:22px' }, `${i + 1}.`),
            h('div', { class: 'grow' },
              h('div', { class: 'row', style: 'gap:6px; margin-bottom:4px; flex-wrap:wrap' },
                h('span', { class: `chip mode-${q.mode}`, style: 'font-size:10px; padding:3px 8px' }, modeName(q.mode)),
                h('span', { class: 'muted', style: 'font-size:11px' }, q.category)),
              h('div', {}, q.text),
              h('div', { class: 'muted', style: 'font-size:12px; margin-top:4px' },
                q.options.map((o, oi) => {
                  const ok = q.correct == null ? false : Array.isArray(q.correct) ? q.correct.includes(oi) : q.correct === oi;
                  return `${ok ? '✔ ' : ''}${o}`;
                }).join('  ·  '))),
            weightPicker(q),
            h('span', { class: 'del', onclick: () => wire.send({ t: 'host:removeQuestion', id: q.id }) }, '✕')))
        : h('p', { class: 'muted' }, 'Še ni vprašanj. Vpiši tematiko in klikni "Ustvari vprašanja".')));

  return h('div', {},
    header(h('div', { class: 'row', style: 'gap:8px' },
      h('span', { class: 'chip' }, `🕒 ${state.settings.timeLimit} s`),
      h('span', { class: 'chip' }, `✍️ ${state.settings.openTimeLimit} s`))),
    h('div', { class: 'grid cols-2' }, joinCard, players),
    h('div', { class: 'grid cols-2', style: 'margin-top:18px' }, gen, preview),
    h('div', { class: 'grid cols-2', style: 'margin-top:18px' }, viewLibrary(), viewHistory()));
}


// ---------- knjižnica ----------

function fmtDate(ms) {
  return new Date(ms).toLocaleString('sl-SI', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function downloadPack() {
  const payload = {
    format: 'ckviz-pack-1',
    name: state.settings.theme,
    theme: state.settings.theme,
    exportedAt: new Date().toISOString(),
    questions: (state.preview || []).map(({ mode, category, text, options, correct, explanation }) =>
      ({ mode, category, text, options, correct, explanation })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ckviz-${slug(state.settings.theme)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function slug(text) {
  return String(text || 'kviz').toLowerCase()
    .replace(/[čć]/g, 'c').replace(/š/g, 's').replace(/ž/g, 'z').replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'kviz';
}

function importPack(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const questions = Array.isArray(parsed) ? parsed : parsed.questions;
      if (!Array.isArray(questions) || !questions.length) throw new Error('ni vprašanj');
      wire.send({ t: 'host:importPack', questions, name: parsed.name, theme: parsed.theme || parsed.name, keep: library.saving });
    } catch (err) {
      toast(`Datoteke ni bilo mogoče prebrati (${err.message}).`, 'err');
    }
  };
  reader.readAsText(file);
}

function viewLibrary() {
  const fileInput = h('input', {
    type: 'file', accept: 'application/json,.json', style: 'display:none',
    onchange: (e) => { if (e.target.files[0]) importPack(e.target.files[0]); e.target.value = ''; },
  });

  const saveBtn = h('button', {
    class: 'btn sm', disabled: !state.questionCount || !library.saving,
    onclick: () => {
      const name = prompt('Ime kviza:', state.settings.theme || 'Kviz');
      if (name) wire.send({ t: 'host:savePack', name });
    },
  }, '💾 Shrani ta kviz');

  return h('div', { class: 'card' },
    h('div', { class: 'row spread wrap-row' },
      h('div', { class: 'tiny' }, `Moji kvizi (${library.packs.length})`),
      h('div', { class: 'row', style: 'gap:8px' },
        saveBtn,
        h('button', { class: 'btn sm ghost', disabled: !state.questionCount, onclick: downloadPack }, '⬇ Izvozi'),
        h('button', { class: 'btn sm ghost', onclick: () => fileInput.click() }, '⬆ Uvozi'))),
    fileInput,
    !library.saving
      ? h('p', { class: 'small', style: 'margin-top:12px; color:var(--amber)' },
          'Ta strežnik nima trajnega diska - kvizi se ne shranjujejo. Uporabi Izvozi/Uvozi.')
      : library.ephemeral
        ? h('p', { class: 'small', style: 'margin-top:12px; color:var(--amber)' },
            'Ta strežnik nima trajnega diska: shranjeno se ohrani, dokler teče, ob ponovnem zagonu pa se izgubi. '
            + 'Kvize, ki jih želiš obdržati, si shrani z Izvozi.')
        : null,
    h('div', { class: 'qlist', style: 'margin-top:12px' },
      library.packs.length
        ? library.packs.map((p) => h('div', { class: 'qrow' },
            h('div', { class: 'grow' },
              h('div', { style: 'font-weight:700' }, p.name),
              h('div', { class: 'muted', style: 'font-size:12px; margin-top:3px' },
                `${sloCount(p.count, VPRASANJA)} · ${p.modes.map(modeName).join(' ')} · ${fmtDate(p.createdAt)}`)),
            h('div', { class: 'row', style: 'gap:6px' },
              h('button', { class: 'btn sm', onclick: () => wire.send({ t: 'host:loadPack', id: p.id }) }, 'Naloži'),
              h('button', { class: 'btn sm ghost', title: 'Dodaj k trenutnim', onclick: () => wire.send({ t: 'host:loadPack', id: p.id, append: true }) }, '+'),
              h('span', { class: 'del', onclick: () => { if (confirm(`Izbrišem "${p.name}"?`)) wire.send({ t: 'host:deletePack', id: p.id }); } }, '✕'))))
        : h('p', { class: 'muted small' }, 'Še ni shranjenih kvizov. Ustvari vprašanja in klikni "Shrani ta kviz".')));
}

function viewHistory() {
  return h('div', { class: 'card' },
    h('div', { class: 'tiny' }, `Odigrane igre (${library.games.length})`),
    h('div', { class: 'qlist', style: 'margin-top:12px' },
      library.games.length
        ? library.games.map((g) => {
            const winner = g.couples?.[0];
            return h('div', { class: 'qrow' },
              h('div', { class: 'grow' },
                h('div', { style: 'font-weight:700' }, g.theme || 'Kviz'),
                h('div', { class: 'muted', style: 'font-size:12px; margin-top:3px' },
                  `${fmtDate(g.playedAt)} · ${sloCount(g.playerCount, IGRALCI)} · ${sloCount(g.questionCount, VPRASANJA)}`),
                winner ? h('div', { style: 'font-size:13px; margin-top:4px' },
                  `🥇 ${winner.emojis?.join('') || ''} ${winner.name} · ${winner.score} točk${winner.chemistry != null ? ` · kemija ${winner.chemistry} %` : ''}`) : null,
                (g.awards || []).length ? h('div', { class: 'muted', style: 'font-size:11px; margin-top:4px' },
                  g.awards.map((a) => `${a.emoji} ${a.name}`).join(' · ')) : null),
              h('span', { class: 'del', onclick: () => { if (confirm('Izbrišem ta zapis?')) wire.send({ t: 'host:deleteGame', id: g.id }); } }, '✕'));
          })
        : h('p', { class: 'muted small' }, 'Ko odigrate prvo igro, se rezultat shrani sem.')));
}

/** Namig pod QR kodo - drugačen doma (WiFi) in drugačen na spletu. */
function joinHint() {
  if (/^https:/.test(joinUrl)) {
    return h('p', { class: 'small muted', style: 'margin-top:6px' },
      'Telefoni so lahko kjerkoli - dovolj je internet.');
  }
  if (/^http:\/\/(localhost|127\.)/.test(joinUrl)) {
    return h('p', { class: 'small', style: 'margin-top:6px; color:var(--amber)' },
      'Ne najdem naslova tega računalnika v omrežju. Telefoni s te povezave ne bodo mogli vstopiti - '
      + 'nastavi PUBLIC_URL ali preveri omrežno povezavo.');
  }
  return h('p', { class: 'small', style: 'margin-top:6px; color:var(--amber)' },
    'Telefoni morajo biti na istem WiFi kot ta računalnik.');
}

const minQ = () => info.minQuestions || 3;
const maxQ = () => info.maxQuestions || 60;

/**
 * Polje za število vprašanj. Med tipkanjem ne posega vmes, ob potrditvi pa
 * vrednost popravi na dovoljeno mejo in to tudi pove - da videz ni napaka.
 */
function countInput() {
  const input = h('input', {
    type: 'number', min: String(minQ()), max: String(maxQ()), value: setup.count,
    oninput: (e) => { setup.count = Number(e.target.value); },
    onchange: (e) => {
      const raw = Number(e.target.value) || minQ();
      const clamped = Math.min(maxQ(), Math.max(minQ(), Math.round(raw)));
      if (clamped !== raw) {
        toast(raw > maxQ()
          ? `Največ ${maxQ()} vprašanj na krog - nastavljam ${clamped}.`
          : `Najmanj ${minQ()} vprašanja - nastavljam ${clamped}.`, 'warn');
      }
      setup.count = clamped;
      e.target.value = String(clamped);
      store('ckviz:setup', setup);
    },
  });
  return h('div', {},
    input,
    h('div', { class: 'muted', style: 'font-size:11px; margin-top:5px' }, `${minQ()} - ${maxQ()} na krog`));
}

/** Koliko je vprašanje vredno - voditelj nastavi za vsako posebej. */
function weightPicker(q) {
  const current = q.weight || 1;
  return h('div', {
    class: 'wpick',
    title: 'Koliko je vredno to vprašanje',
  }, [1, 2, 3].map((w) => h('button', {
    class: current === w ? 'on' : '',
    onclick: () => wire.send({ t: 'host:weight', id: q.id, weight: w }),
  }, `x${w}`)));
}

function genPayload() {
  const count = Math.min(maxQ(), Math.max(minQ(), Math.round(Number(setup.count) || 12)));
  return { theme: setup.theme, count, difficulty: setup.difficulty, tone: setup.tone, modes: setup.modes };
}

function field(label, input) {
  return h('label', { class: 'field' }, h('span', { class: 'tiny' }, label), input);
}

function select(options, value, onchange) {
  return h('select', { onchange: (e) => onchange(e.target.value) },
    options.map((o) => h('option', { value: o, selected: o === value }, o)));
}

function modeName(m) {
  return { trivia: '🧠 Znanje', multi: '✅ Več pravilnih', sync: '🔗 Sinhro', know: '💘 Poznaš?', open: '✍️ Z besedami' }[m] || m;
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
        q.weight > 1 ? h('span', { class: 'chip hot' }, `🔥 x${q.weight} točke`) : null),
      h('span', { class: 'muted' }, `${q.index + 1} / ${state.questionCount}`)),
    h('h1', { class: 'qtext', style: 'margin-top:22px' }, q.text),
    q.open
      ? h('div', { class: 'card', style: 'margin-top:28px; background:rgba(255,255,255,.04); text-align:center' },
          h('div', { style: 'font-size:40px' }, '✍️'),
          h('p', { style: 'margin-top:12px; font-size:19px; font-weight:700' }, 'Vsak piše svoj odgovor na telefon'),
          h('p', { class: 'muted', style: 'margin-top:8px' },
            'Točke prinese ujemanje pomena znotraj para, ne pravilnost.'))
      : h('div', { class: 'options', style: 'margin-top:28px' },
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

function viewJudging() {
  const q = state.question;
  return h('div', {}, header(),
    h('div', { class: 'card center', style: 'padding:60px 20px' },
      h('div', { style: 'font-size:64px' }, '🔮'),
      h('h1', { style: 'font-size:clamp(24px,3vw,40px); margin-top:18px' }, 'Presojam odgovore'),
      h('p', { class: 'muted', style: 'margin-top:12px; font-size:17px' },
        'Gledam, ali para mislita isto - tudi če sta napisala z drugimi besedami.'),
      q ? h('p', { class: 'pulse', style: 'margin-top:26px; font-size:20px; font-weight:700' }, q.text) : null));
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

  if (q.mode === 'open') return viewRevealOpen(r, q);

  const left = h('div', { class: 'card' },
    h('div', { class: 'row', style: 'gap:10px' },
      h('span', { class: `chip mode-${q.mode}` }, modeName(q.mode)),
      q.weight > 1 ? h('span', { class: 'chip hot' }, `🔥 x${q.weight}`) : null,
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

/** Razkritje opisnega vprašanja: odgovori para drug ob drugem in odstotek ujemanja. */
function viewRevealOpen(r, q) {
  const cards = r.pairs.map((p) => {
    const sim = p.a?.similarity ?? p.b?.similarity ?? 0;
    const note = p.a?.note || p.b?.note || '';
    return h('div', { class: `pair-card ${sim >= 70 ? 'match' : ''}`, style: 'padding:18px' },
      h('div', { class: 'row spread' },
        h('b', { style: 'font-size:18px' }, p.name),
        h('span', { style: 'font-weight:900; font-size:22px' }, `${sim} %`)),
      h('div', { class: 'bar-track', style: 'height:10px; margin:10px 0 14px' },
        h('div', { class: 'bar-fill', style: `width:${sim}%; background:linear-gradient(90deg,var(--violet),var(--pink))` })),
      h('div', { class: 'open-two' },
        h('div', { class: 'open-ans' },
          h('div', { class: 'who' }, `${p.a?.emoji || ''} ${p.a?.name || ''}`),
          h('p', {}, p.a?.text || '—')),
        h('div', { class: 'open-ans' },
          h('div', { class: 'who' }, `${p.b?.emoji || ''} ${p.b?.name || ''}`),
          h('p', {}, p.b?.text || '—'))),
      note ? h('p', { class: 'muted', style: 'margin-top:12px; font-size:14px' }, `💬 ${note}`) : null,
      h('div', { style: 'margin-top:10px; text-align:right; font-weight:800; color:var(--ok)' }, `+${p.gain}`));
  });

  const solos = r.perPlayer.filter((x) => !x.partnerId);

  return h('div', {}, header(),
    h('div', { class: 'grid cols-2' },
      h('div', { class: 'card' },
        h('div', { class: 'row', style: 'gap:10px' },
          h('span', { class: 'chip mode-know' }, modeName(q.mode)),
          q.weight > 1 ? h('span', { class: 'chip hot' }, `🔥 x${q.weight}`) : null,
          h('span', { class: 'muted' }, `${q.index + 1} / ${state.questionCount}`)),
        h('h1', { class: 'qtext', style: 'margin-top:18px; font-size:clamp(22px,2.4vw,36px)' }, q.text),
        h('div', { class: 'stack', style: 'margin-top:24px' }, cards.length ? cards
          : h('p', { class: 'muted' }, 'Ni parov - opisna vprašanja zaživijo šele v paru.')),
        solos.length ? h('div', { style: 'margin-top:18px' },
          h('div', { class: 'tiny', style: 'margin-bottom:8px' }, 'Brez para'),
          h('div', { class: 'stack' }, solos.map((sp) => h('div', { class: 'pair-card' },
            h('div', { class: 'who', style: 'font-size:11px; color:var(--muted)' }, `${sp.emoji} ${sp.name}`),
            h('p', { style: 'margin-top:6px' }, sp.text || '—'))))) : null),
      h('div', { class: 'card' },
        h('div', { class: 'tiny', style: 'margin-bottom:12px' }, 'Lestvica'),
        h('div', { class: 'pill-list' }, state.couples.map((c, i) => rankRow(c, i, r))))));
}

/** Povprečno ujemanje pri opisnem vprašanju - po parih, ne po igralcih. */
function avgSimilarity(hRow) {
  const sims = (hRow.pairs || []).map((p) => p.a?.similarity).filter((v) => v != null);
  if (!sims.length) return 0;
  return Math.round(sims.reduce((a, b) => a + b, 0) / sims.length);
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
          q.weight > 1 ? h('span', { class: 'chip hot', style: 'font-size:10px; padding:3px 8px' }, `🔥 x${q.weight}`) : null),
        h('div', { style: 'font-weight:700' }, q.text),
        correctIdx.length
          ? h('div', { class: 'muted', style: 'margin-top:6px' }, `Pravilno: ${correctIdx.map((i) => q.options[i]).join(', ')} · ${hits}/${answeredN} zadetkov`)
          : q.mode === 'open'
            ? h('div', { class: 'muted', style: 'margin-top:6px' }, `Povprečno ujemanje ${avgSimilarity(hRow)} %`)
            : h('div', { class: 'muted', style: 'margin-top:6px' }, `${matches} ${matches === 1 ? 'par se je ujel' : 'parov se je ujelo'}`));
    })));

  return h('div', {}, header(), h('div', { class: 'grid cols-2' }, podium, h('div', { class: 'stack' }, awards, chemCard)),
    h('div', { style: 'margin-top:18px' }, recap));
}

// ---------- ukazna vrstica ----------

function controlsLobby() {
  ctrl.append(
    h('span', { class: 'chip' }, `${sloCount(state.players.length, IGRALCI)} · ${sloCount(state.questionCount, VPRASANJA)}`),
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
  if (state?.phase === 'judging') return; // med presojo ni prehodov
  if (e.key === ' ' || e.key === 'ArrowRight') {
    e.preventDefault();
    if (state?.phase === 'question') wire.send({ t: 'host:reveal' });
    else if (state?.phase === 'reveal') wire.send({ t: 'host:next' });
    else if (state?.phase === 'lobby') wire.send({ t: 'host:start' });
  }
});
