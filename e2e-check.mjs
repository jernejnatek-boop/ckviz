import WebSocket from 'ws';
const URL = 'ws://localhost:3000/ws';
const wait = (ms) => new Promise(r => setTimeout(r, ms));

function mk(name) {
  const ws = new WebSocket(URL);
  ws.inbox = [];
  ws.on('message', (d) => ws.inbox.push(JSON.parse(d.toString())));
  ws.on('error', (e) => console.log(name, 'ERR', e.message));
  return new Promise(r => ws.on('open', () => r(ws)));
}
const send = (ws, m) => ws.send(JSON.stringify(m));
const last = (ws, t) => [...ws.inbox].reverse().find(m => m.t === t);
const errs = (ws) => ws.inbox.filter(m => m.t === 'error');

const host = await mk('host');
send(host, { t: 'host:create', settings: { timeLimit: 12 } });
await wait(300);
const code = last(host, 'hostToken').code;
console.log('koda:', code);

const names = ['Ana', 'Bine', 'Cvet', 'Dado'];
const ps = [];
for (const n of names) {
  const ws = await mk(n);
  send(ws, { t: 'join', code, name: n });
  await wait(120);
  ps.push(ws);
}
const ids = ps.map(p => last(p, 'joined').id);
console.log('igralci:', ids.length);

// pairing: Ana<->Bine mutual, Cvet<->Dado via autopair
send(ps[0], { t: 'pair', targetId: ids[1] });
await wait(80);
send(ps[1], { t: 'pair', targetId: ids[0] });
await wait(120);
send(host, { t: 'host:autopair' });
await wait(150);
let hs = last(host, 'room');
console.log('pari:', hs.couples.map(c => c.name));

send(host, { t: 'host:bank', count: 6, modes: ['trivia','multi','sync','know'] });
await wait(200);
hs = last(host, 'room');
console.log('vprašanj:', hs.questionCount, hs.preview.map(q=>q.mode).join(','));

send(host, { t: 'host:start' });
await wait(250);

for (let round = 0; round < 6; round++) {
  hs = last(host, 'room');
  if (hs.phase === 'ended') break;
  const q = hs.question;
  console.log(`\n— Q${q.index+1} [${q.mode}] ${q.text.slice(0,50)}`);
  for (let i = 0; i < ps.length; i++) {
    const you = last(ps[i], 'you');
    const pq = you.question;
    const choice = pq.multi ? [0, 1] : (i % 4);
    const predict = pq.asksPredict ? ((i + 1) % 4) : undefined;
    send(ps[i], { t: 'answer', qid: pq.id, choice, predict, confidence: pq.asksConfidence ? (i%3)+1 : 1, locked: true });
    await wait(60);
  }
  await wait(1500); // auto-reveal
  hs = last(host, 'room');
  if (hs.phase !== 'reveal') { console.log('!! ni razkritja, faza =', hs.phase); send(host,{t:'host:reveal'}); await wait(200); hs = last(host,'room'); }
  console.log('  razdelitev:', hs.reveal.distribution, '| točke:', hs.couples.map(c=>`${c.name}=${c.score}`).join(' '));
  const pl = last(ps[0], 'you');
  console.log('  Ana vidi:', pl.reveal?.me?.gain, 'točk, vrstic:', pl.reveal?.me?.lines?.length);
  send(host, { t: 'host:next' });
  await wait(300);
}

hs = last(host, 'room');
console.log('\nfaza:', hs.phase);
console.log('nagrade:', (hs.awards||[]).map(a=>`${a.emoji} ${a.label}: ${a.name} (${a.value})`));
console.log('končno:', hs.couples.map(c=>`${c.name}=${c.score} kem=${c.chemistry}%`));
console.log('zgodovina:', hs.history?.length);
const fin = last(ps[0], 'you');
console.log('igralec konec:', fin.phase, JSON.stringify(fin.final?.me));

const allErrs = [host, ...ps].flatMap(errs);
console.log('\nNAPAKE:', allErrs.length ? allErrs.map(e=>e.message) : 'brez');
process.exit(0);
