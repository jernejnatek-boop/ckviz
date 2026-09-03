// Telefonski odjemalec CKViz.

import { el, h, clear, Wire, toast, burst, store, OPT_GLYPHS, pct } from '/js/common.js';
import { av, avPair } from '/js/avatars.js';

const CODE = (location.pathname.match(/^\/p\/([A-Za-z0-9]{4})/)?.[1] || '').toUpperCase();
const app = el('#app');

let state = null;         // zadnji 'you' paket
let avatars = [];
let chosenAvatar = null;
let joined = false;

// lokalna izbira za trenutno vprašanje
let draft = { qid: null, choice: null, predict: null, confidence: 1, text: '', locked: false };
let ticker = null;

fetch('/api/info').then((r) => r.json()).then((info) => {
  if (info.avatars?.length) avatars = info.avatars;
  if (!joined) render();
}).catch(() => {});

const wire = new Wire({
  onOpen: () => {
    const saved = store(`ckviz:${CODE}`);
    if (saved?.token) wire.send({ t: 'join', code: CODE, token: saved.token });
  },
  onStatus: (s) => {
    const dot = el('#tbDot');
    const net = el('#tbNet');
    dot.className = `dot ${s === 'online' ? '' : s === 'connecting' ? 'wait' : 'off'}`;
    net.textContent = s === 'online' ? 'v igri' : s === 'connecting' ? 'povezujem' : 'ni povezave';
  },
  onMessage: (msg) => {
    if (msg.t === 'error') {
      toast(msg.message, 'err');
      if (/koda|Igra že|polna|zasedeno|ime/i.test(msg.message)) { joined = false; render(); }
      return;
    }
    if (msg.t === 'joined') {
      joined = true;
      store(`ckviz:${CODE}`, { token: msg.token, id: msg.id });
      return;
    }
    if (msg.t === 'gone') {
      joined = false;
      store(`ckviz:${CODE}`, null);
      toast('Voditelj te je odstranil iz sobe.', 'warn');
      render();
      return;
    }
    if (msg.t === 'you') {
      const prevPhase = state?.phase;
      const prevIdx = state?.index;
      state = msg;
      joined = true;
      if (state.phase === 'question' && (prevPhase !== 'question' || prevIdx !== state.index)) {
        draft = { qid: state.question.id, choice: state.question.multi ? [] : null, predict: null, confidence: 1, text: '', locked: false };
        if (navigator.vibrate) navigator.vibrate(30);
      }
      if (state.phase === 'reveal' && prevPhase === 'question') {
        const gain = state.reveal?.me?.gain || 0;
        if (gain > 0) { burst('✨', 4); if (navigator.vibrate) navigator.vibrate([20, 40, 20]); }
      }
      render();
    }
  },
});

// ---------------------------------------------------------------- pogledi

function render() {
  const name = state?.me?.name;
  const tb = el('#tbName');
  clear(tb);
  if (name) { tb.append(av(state.me.emoji, 20), document.createTextNode(` ${name}`)); }
  else tb.textContent = 'CKViz';
  el('#tbSub').textContent = state
    ? (state.phase === 'lobby' ? `soba ${state.code} · čakalnica`
      : state.phase === 'ended' ? 'konec igre'
      : state.phase === 'judging' ? 'presojam odgovora ...'
      : state.phase === 'reveal' ? revealSub()
      : `vprašanje ${state.index + 1}/${state.questionCount}`)
    : `soba ${CODE || '—'}`;
  el('#tbScore').textContent = state?.me?.score ?? 0;

  startRevealTicker();
  clear(app);
  if (!joined || !state) return app.append(viewJoin());
  if (state.phase === 'lobby') return app.append(viewLobby());
  if (state.phase === 'question') return app.append(viewQuestion());
  if (state.phase === 'judging') return app.append(viewJudging());
  if (state.phase === 'reveal') return app.append(viewReveal());
  if (state.phase === 'ended') return app.append(viewEnd());
}

function viewJoin() {
  if (!CODE) {
    return h('div', { class: 'card', style: 'margin-top:24px' },
      h('h2', {}, 'Manjka koda sobe'),
      h('p', { class: 'muted small', style: 'margin-top:8px' }, 'Odpri povezavo s kodo z velikega zaslona.'),
      h('a', { class: 'btn primary big', href: '/', style: 'margin-top:14px; display:block; text-align:center; text-decoration:none' }, 'Nazaj'));
  }
  if (!chosenAvatar) chosenAvatar = avatars[Math.floor(Math.random() * avatars.length)];

  const input = h('input', { type: 'text', id: 'nick', maxlength: '16', placeholder: 'npr. Ana', autocomplete: 'nickname' });
  const grid = h('div', { class: 'avatars' },
    avatars.map((a) => h('button', {
      class: `av ${a === chosenAvatar ? 'sel' : ''}`, type: 'button',
      onclick: () => { chosenAvatar = a; render(); setTimeout(() => el('#nick')?.focus(), 0); },
    }, av(a, 34))));

  const submit = () => {
    const name = input.value.trim();
    if (!name) return toast('Vpiši ime.', 'warn');
    wire.send({ t: 'join', code: CODE, name, emoji: chosenAvatar });
  };

  const form = h('form', { class: 'stack', onsubmit: (e) => { e.preventDefault(); submit(); } },
    h('label', { class: 'field' }, h('span', { class: 'tiny' }, 'Tvoje ime'), input),
    h('div', {}, h('div', { class: 'tiny', style: 'margin-bottom:8px' }, 'Tvoj znak'), grid),
    h('button', { class: 'btn primary big', type: 'submit' }, 'Vstopi v sobo'));

  return h('div', { class: 'card', style: 'margin-top:24px' },
    h('h2', { style: 'font-size:24px' }, 'Soba ', h('span', { style: 'color:var(--pink)' }, CODE)),
    h('p', { class: 'muted small', style: 'margin:8px 0 16px' }, 'Vsak igra na svojem telefonu.'),
    form);
}

function viewLobby() {
  const me = state.me;
  const partner = state.partner;
  const others = state.lobby || [];

  const head = h('div', { class: 'card center' },
    h('div', { style: 'display:flex; justify-content:center' }, av(me.emoji, 72)),
    h('h2', { style: 'margin-top:10px' }, me.name),
    partner
      ? h('p', { class: 'row', style: 'margin-top:10px; font-size:16px; justify-content:center; gap:7px' },
          'V paru z ', av(partner.emoji, 24), h('b', {}, partner.name))
      : h('p', { class: 'muted small', style: 'margin-top:10px' }, 'Izberi svoj par spodaj.'),
    partner ? h('button', { class: 'btn sm ghost', style: 'margin-top:12px', onclick: () => wire.send({ t: 'unpair' }) }, 'Razdruži') : null);

  const list = partner ? null : h('div', { class: 'card', style: 'margin-top:14px' },
    h('div', { class: 'tiny', style: 'margin-bottom:10px' }, 'Kdo je tvoj par?'),
    others.length
      ? h('div', { class: 'partner-pick' }, others.map((o) => h('button', {
          class: 'pp', disabled: o.paired,
          onclick: () => wire.send({ t: 'pair', targetId: o.id }),
        },
        av(o.emoji, 30),
        h('span', {}, o.name),
        o.wantsMe ? h('span', { class: 'want' }, 'te je izbral/a!')
          : state.pendingPartner === o.id ? h('span', { class: 'want muted' }, 'čakam ...')
          : o.paired ? h('span', { class: 'want muted' }, 'v paru') : null)))
      : h('p', { class: 'muted small' }, 'Zaenkrat si sam. Počakaj, da se pridružijo drugi.'));

  const hint = h('div', { class: 'card tight center', style: 'margin-top:14px' },
    h('p', { class: 'muted small pulse' }, 'Čakamo, da voditelj začne igro ...'));

  return h('div', {}, head, list, hint);
}

function viewQuestion() {
  const q = state.question;
  const mine = state.mine;
  if (draft.qid !== q.id) draft = { qid: q.id, choice: q.multi ? [] : null, predict: null, confidence: 1, text: '', locked: false };
  if (mine?.locked) draft.locked = true;

  const header = h('div', { class: 'card' },
    h('div', { class: 'row spread' },
      h('div', { class: 'row', style: 'gap:8px' },
        h('span', { class: `chip mode-${q.mode}` }, `${q.modeEmoji} ${q.modeLabel}`),
        q.weight > 1 ? h('span', { class: 'chip hot' }, `🔥 x${q.weight} točke`) : null),
      timerNode()),
    h('h2', { style: 'font-size:21px; margin-top:14px; line-height:1.3' }, q.text),
    h('p', { class: 'muted small', style: 'margin-top:8px' }, q.tagline));

  if (draft.locked) {
    return h('div', {}, header, h('div', { class: 'card center', style: 'margin-top:16px' },
      h('div', { style: 'font-size:42px' }, '🔒'),
      h('h3', { style: 'margin-top:10px' }, 'Odgovor je zaklenjen'),
      h('p', { class: 'muted small', style: 'margin-top:8px' },
        state.partner
          ? (state.partnerLocked ? 'Tudi tvoj par je oddal. Gremo!' : `Čakamo ${state.partner.name} ...`)
          : 'Čakamo ostale ...')));
  }

  // Opisno vprašanje - eno polje in gumb, brez korakov.
  if (q.open) {
    const area = h('textarea', {
      id: 'openAnswer', rows: '4', maxlength: '400', placeholder: 'Napiši s svojimi besedami ...',
      style: 'resize:vertical; line-height:1.45',
    });
    area.value = draft.text;
    const counter = h('div', { class: 'muted', style: 'font-size:11px; margin-top:6px; text-align:right' },
      `${draft.text.length}/400`);
    area.addEventListener('input', () => {
      draft.text = area.value;
      counter.textContent = `${draft.text.length}/400`;
      lock.disabled = !draft.text.trim();
      lock.textContent = draft.text.trim() ? 'Zakleni odgovor 🔒' : 'Napiši odgovor';
      clearTimeout(area._t);
      area._t = setTimeout(() => pushDraft(false), 600);
    });
    const lock = h('button', {
      class: 'btn primary big', disabled: !draft.text.trim(),
      onclick: () => {
        clearTimeout(area._t);
        draft.locked = true;
        pushDraft(true);
        render();
      },
    }, draft.text.trim() ? 'Zakleni odgovor 🔒' : 'Napiši odgovor');

    return h('div', {}, header,
      h('div', { class: 'step' },
        h('div', { class: 'step-head' },
          h('span', { class: 'step-num' }, '1'),
          h('b', {}, 'Tvoj odgovor'),
          h('span', { class: 'muted small' }, '- s svojimi besedami')),
        area, counter,
        h('p', { class: 'muted small', style: 'margin-top:10px' },
          state.partner
            ? `Točke prinese to, koliko se po pomenu ujameš s ${state.partner.name} - ne, kdo napiše lepše.`
            : 'Brez para tokrat dobiš točke že za zapisan odgovor.')),
      h('div', { class: 'dock' }, lock));
  }

  // 1. korak - lasten odgovor
  const stepAnswer = h('div', { class: 'step' },
    h('div', { class: 'step-head' },
      h('span', { class: 'step-num' }, '1'),
      h('b', {}, q.multi ? 'Izberi vse pravilne' : 'Tvoj odgovor')),
    h('div', { class: 'options' }, q.options.map((text, i) => {
      const sel = q.multi ? draft.choice.includes(i) : draft.choice === i;
      return h('button', {
        class: `opt i${i} ${sel ? 'chosen' : ''}`, type: 'button',
        onclick: () => {
          if (q.multi) {
            draft.choice = draft.choice.includes(i) ? draft.choice.filter((x) => x !== i) : [...draft.choice, i].sort();
          } else {
            draft.choice = i;
          }
          pushDraft(false);
          render();
        },
      }, h('span', { class: 'glyph' }, OPT_GLYPHS[i]), h('span', {}, text));
    })));

  const steps = [stepAnswer];
  let n = 2;

  // 2. korak - vložek
  if (q.asksConfidence) {
    const chosen = draft.choice != null && (!q.multi || draft.choice.length);
    steps.push(h('div', { class: `step ${chosen ? '' : 'locked'}` },
      h('div', { class: 'step-head' },
        h('span', { class: 'step-num' }, String(n++)),
        h('b', {}, 'Vložek'),
        h('span', { class: 'muted small' }, '- več tvegaš, več dobiš')),
      h('div', { class: 'conf' }, [1, 2, 3].map((c) => h('button', {
        class: draft.confidence === c ? 'sel' : '', type: 'button',
        onclick: () => { draft.confidence = c; pushDraft(false); render(); },
      }, `x${c}`, h('small', {}, c === 1 ? 'brez tveganja' : c === 2 ? '-25 če zgrešiš' : '-50 če zgrešiš'))))));
  }

  // 3. korak - napoved partnerja
  if (q.asksPredict) {
    const chosen = draft.choice != null && (!q.multi || draft.choice.length);
    steps.push(h('div', { class: `step ${chosen ? '' : 'locked'}` },
      h('div', { class: 'step-head' },
        h('span', { class: 'step-num' }, String(n++)),
        h('b', {}, `Kaj je izbral/a ${q.partnerName}?`)),
      h('div', { class: 'options mini' }, q.options.map((text, i) => h('button', {
        class: `opt i${i} ${draft.predict === i ? 'chosen' : 'dim'}`, type: 'button',
        onclick: () => { draft.predict = i; pushDraft(false); render(); },
      }, h('span', { class: 'glyph' }, OPT_GLYPHS[i]), h('span', {}, text))))));
  }

  const ready = q.multi ? draft.choice.length > 0 : draft.choice != null;
  const needPredict = q.asksPredict && draft.predict == null;
  const dock = h('div', { class: 'dock' },
    h('button', {
      class: 'btn primary big', disabled: !ready || needPredict,
      onclick: () => { draft.locked = true; pushDraft(true); render(); },
    }, !ready ? 'Izberi odgovor' : needPredict ? `Ugani še ${q.partnerName}` : 'Zakleni odgovor 🔒'));

  return h('div', {}, header, ...steps, dock);
}

function viewJudging() {
  const q = state.question;
  return h('div', {},
    h('div', { class: 'card center' },
      h('div', { style: 'font-size:44px' }, '🔮'),
      h('h3', { style: 'margin-top:12px' }, 'Presojam vajina odgovora'),
      h('p', { class: 'muted small', style: 'margin-top:8px' },
        'Gledam, ali sta mislila isto - tudi če sta napisala drugače.'),
      q ? h('p', { class: 'muted small pulse', style: 'margin-top:14px' }, q.text) : null));
}

function viewReveal() {
  const r = state.reveal;
  if (!r) return h('div', { class: 'card center' }, 'Računam ...');
  const q = r.question;
  const me = r.me;
  const partner = r.partner;
  const gain = me?.gain || 0;

  const head = h('div', { class: 'card center' },
    state.auto?.paused ? h('div', { class: 'chip hot', style: 'margin-bottom:12px' }, '⏸ pavza') : null,
    h('div', { class: `gain ${gain > 0 ? 'plus' : 'zero'}` }, gain > 0 ? `+${gain}` : '0'),
    h('div', { class: 'tiny', style: 'margin-top:4px' }, 'točk pri tem vprašanju'),
    me?.lines?.length
      ? h('div', { class: 'lines' }, me.lines.map((l) => h('div', {},
          h('span', { class: 'muted' }, l.label),
          h('span', { class: 'v', style: l.value < 0 ? 'color:var(--red)' : '' }, `${l.value > 0 ? '+' : ''}${Math.round(l.value)}`))))
      : h('p', { class: 'muted small', style: 'margin-top:10px' }, 'Tokrat brez točk. Naslednje bo bolje.'));

  if (q.mode === 'open') {
    const sim = me?.similarity;
    const openCard = h('div', { class: 'card', style: 'margin-top:14px' },
      h('div', { class: 'tiny' }, q.category || 'Vprašanje'),
      h('h3', { style: 'font-size:17px; margin-top:8px; line-height:1.35' }, q.text),
      h('div', { class: 'answers' },
        h('div', { class: 'ans mine' },
          h('div', { class: 'who' }, av(me?.emoji, 18), 'ti'),
          h('p', {}, me?.text || '—')),
        partner ? h('div', { class: 'ans' },
          h('div', { class: 'who' }, av(partner.emoji, 18), partner.name),
          h('p', {}, partner.text || '—')) : null),
      sim != null ? h('div', { style: 'margin-top:16px' },
        h('div', { class: 'row spread', style: 'margin-bottom:6px' },
          h('span', { class: 'tiny' }, 'Ujemanje pomena'),
          h('span', { style: 'font-weight:900; font-size:20px' }, `${sim} %`)),
        h('div', { class: 'bar-track', style: 'height:14px' },
          h('div', { class: 'bar-fill', style: `width:${sim}%; background:linear-gradient(90deg,var(--violet),var(--pink))` })),
        me?.note ? h('p', { class: 'small', style: 'margin-top:12px; text-align:center' }, me.note) : null,
        me?.offline ? h('p', { class: 'muted', style: 'font-size:11px; margin-top:6px; text-align:center' },
          'Ocenjeno približno - presoja z AI ni bila na voljo.') : null) : null);
    return h('div', {}, head, openCard,
      h('div', { class: 'reactions' }, ['😂', '😱', '🔥', '💘', '🤯', '👏'].map((e) => h('button', {
        onclick: () => { wire.send({ t: 'reaction', emoji: e }); burst(e, 2); },
      }, e))),
      standingsCard());
  }

  const answerCard = h('div', { class: 'card', style: 'margin-top:14px' },
    h('div', { class: 'tiny' }, q.category || 'Vprašanje'),
    h('h3', { style: 'font-size:17px; margin-top:8px; line-height:1.35' }, q.text),
    h('div', { class: 'options', style: 'margin-top:14px' }, q.options.map((text, i) => {
      const isCorrect = q.correct == null ? false
        : Array.isArray(q.correct) ? q.correct.includes(i) : q.correct === i;
      const mineHere = Array.isArray(me?.choice) ? me.choice.includes(i) : me?.choice === i;
      const partnerHere = Array.isArray(partner?.choice) ? partner.choice.includes(i) : partner?.choice === i;
      const hasTruth = q.correct != null;
      const cls = isCorrect ? 'correct' : (mineHere && hasTruth ? 'wrong' : '');
      const dim = hasTruth ? !isCorrect : !(mineHere || partnerHere);
      const tags = [];
      if (mineHere) tags.push(hasTruth ? (isCorrect ? '✔ ti' : '✗ ti') : 'ti');
      if (partnerHere && partner) tags.push(partner.name);
      return h('div', { class: `opt i${i} ${cls} ${dim ? 'dim' : ''}` },
        h('span', { class: 'glyph' }, OPT_GLYPHS[i]),
        h('span', {}, text),
        tags.length ? h('span', { class: 'tag' }, tags.join(' + ')) : null);
    })),
    q.explanation ? h('p', { class: 'muted small', style: 'margin-top:12px' }, q.explanation) : null);

  let mirror = null;
  if (partner) {
    const same = sameChoice(q, me?.choice, partner?.choice);
    const guessed = me?.predict != null && partner?.choice != null && sameChoice(q, me.predict, partner.choice);
    mirror = h('div', { class: 'card', style: 'margin-top:14px' },
      h('div', { class: 'tiny' }, 'Zrcalo - kaj sta izbrala'),
      h('div', { class: 'mirror' },
        h('div', { class: 'side' }, h('div', { style: 'display:flex; justify-content:center' }, av(me?.emoji, 30)), h('b', {}, labelOf(q, me?.choice))),
        h('div', { class: 'link' }, same ? '💞' : '🪞'),
        h('div', { class: 'side' }, h('div', { style: 'display:flex; justify-content:center' }, av(partner.emoji, 30)), h('b', {}, labelOf(q, partner.choice)))),
      h('p', { class: 'small center', style: 'margin-top:12px' },
        guessed ? `🎯 Uganil/a si, kaj bo izbral/a ${partner.name}.`
          : me?.predict != null ? `❌ Mislil/a si ${labelOf(q, me.predict)} - pa ni bilo tako.`
          : 'Napovedi ni bilo.'));
  }

  const reactions = h('div', { class: 'reactions' },
    ['😂', '😱', '🔥', '💘', '🤯', '👏'].map((e) => h('button', {
      onclick: () => { wire.send({ t: 'reaction', emoji: e }); burst(e, 2); },
    }, e)));

  return h('div', {}, head, answerCard, mirror, reactions, standingsCard());
}

/** Med rezultati pove, kdaj gre naprej oziroma da je igra na pavzi. */
function revealSub() {
  const a = state.auto;
  const base = `vprašanje ${state.index + 1}/${state.questionCount}`;
  if (!a?.enabled) return base;
  if (a.paused) return '⏸ pavza';
  const left = Math.max(0, Math.ceil(((a.endsAt || 0) - Date.now()) / 1000));
  return `${base} · naprej čez ${left} s`;
}

function standingsCard() {
  return h('div', { class: 'card', style: 'margin-top:14px' },
    h('div', { class: 'tiny', style: 'margin-bottom:10px' }, 'Vrstni red'),
    h('div', { class: 'pill-list' }, (state.standings || []).map((c, i) => h('div', { class: `rank ${i === 0 ? 'top' : ''}` },
      h('span', { class: 'pos' }, `${i + 1}.`),
      avPair(c.emojis, 22),
      h('span', { class: 'who' }, c.name),
      h('span', { class: 'pts' }, c.score)))));
}

function viewEnd() {
  const f = state.final;
  const mine = f.couples.findIndex((c) => c.members.some((m) => m.id === state.me.id));
  const myCouple = f.couples[mine];

  const head = h('div', { class: 'card center' },
    h('div', { style: 'font-size:52px' }, mine === 0 ? '🏆' : '🎉'),
    h('h2', { style: 'margin-top:8px' }, mine === 0 ? 'Zmaga!' : `${mine + 1}. mesto`),
    myCouple ? h('p', { style: 'margin-top:8px; font-size:18px; font-weight:800' }, `${myCouple.score} točk`) : null,
    myCouple?.chemistry != null
      ? h('p', { class: 'muted small', style: 'margin-top:6px' }, `Kemija: ${myCouple.chemistry} %`)
      : null);

  const stats = h('div', { class: 'card', style: 'margin-top:14px' },
    h('div', { class: 'tiny', style: 'margin-bottom:10px' }, 'Tvoja statistika'),
    h('div', { class: 'lines' },
      row('Pravilnih odgovorov', `${f.me.correct} / ${f.me.factQuestions}`),
      row('Uganil/a partnerja', f.me.predictOpps ? `${f.me.predictHits} / ${f.me.predictOpps} (${pct(f.me.predictHits, f.me.predictOpps)} %)` : '-'),
      row('Ista misel', f.me.syncOpps ? `${f.me.syncHits} / ${f.me.syncOpps}` : '-'),
      row('Povprečen čas', f.me.msCount ? `${(f.me.msTotal / f.me.msCount / 1000).toFixed(1)} s` : '-')));

  const board = h('div', { class: 'card', style: 'margin-top:14px' },
    h('div', { class: 'tiny', style: 'margin-bottom:10px' }, 'Končna lestvica'),
    h('div', { class: 'pill-list' }, f.couples.map((c, i) => h('div', { class: `rank ${i === 0 ? 'top' : ''}` },
      h('span', { class: 'pos' }, `${i + 1}.`),
      avPair(c.emojis, 22),
      h('span', { class: 'who' }, c.name),
      h('span', { class: 'pts' }, c.score)))));

  if (mine === 0) setTimeout(() => burst('🎊', 6), 200);

  return h('div', {}, head, stats, board);
}

// ---------------------------------------------------------------- pomožno

function row(k, v) {
  return h('div', {}, h('span', { class: 'muted' }, k), h('span', { class: 'v' }, v));
}

function labelOf(q, choice) {
  if (choice == null) return '—';
  if (Array.isArray(choice)) return choice.map((i) => q.options[i]).join(', ') || '—';
  return q.options[choice] ?? '—';
}

function sameChoice(q, a, b) {
  if (a == null || b == null) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    const sa = new Set(Array.isArray(a) ? a : [a]);
    const sb = new Set(Array.isArray(b) ? b : [b]);
    return sa.size === sb.size && [...sa].every((x) => sb.has(x));
  }
  return a === b;
}

function pushDraft(locked) {
  // Zaklenjenega odgovora nikoli ne odklenemo - sicer bi odloženo shranjevanje
  // med tipkanjem povozilo pravkar oddani odgovor.
  if (draft.locked && !locked) return;
  wire.send({ t: 'answer', qid: draft.qid, choice: draft.choice, text: draft.text, predict: draft.predict, confidence: draft.confidence, locked });
}

let revealTicker = null;
function startRevealTicker() {
  clearInterval(revealTicker);
  if (state?.phase !== 'reveal' || !state.auto?.enabled || state.auto.paused) return;
  revealTicker = setInterval(() => {
    if (state?.phase !== 'reveal') return clearInterval(revealTicker);
    el('#tbSub').textContent = revealSub();
  }, 500);
}

function timerNode() {
  const node = h('div', { style: 'font-size:26px; font-weight:900; font-variant-numeric:tabular-nums' }, '--');
  const tick = () => {
    if (!state || state.phase !== 'question' || !state.startedAt) return;
    const left = Math.max(0, state.timeLimit - (Date.now() - state.startedAt) / 1000);
    node.textContent = Math.ceil(left);
    node.style.color = left <= 5 ? 'var(--red)' : left <= 10 ? 'var(--amber)' : 'var(--txt)';
  };
  clearInterval(ticker);
  tick();
  ticker = setInterval(tick, 200);
  return node;
}
