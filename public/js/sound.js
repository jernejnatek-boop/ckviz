// Zvok na velikem zaslonu.
//
// Toni se ustvarijo sproti z Web Audio API - ni datotek, ni nalaganja in
// nič ne zamuja. Brskalniki dovolijo zvok šele po prvem kliku ali tipki,
// zato se zvočni sistem zbudi ob prvem dotiku voditelja.

const KEY = 'ckviz:zvok';
let ctx = null;
let on = true;

try { on = localStorage.getItem(KEY) !== '0'; } catch { /* zasebni način */ }

function wake() {
  if (!ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

// Prvi klik ali tipka odklene zvok - prej ga brskalnik ne dovoli.
for (const ev of ['pointerdown', 'keydown']) {
  window.addEventListener(ev, () => wake(), { once: true, passive: true });
}

export function soundOn() { return on; }

export function toggleSound() {
  on = !on;
  try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* zasebni način */ }
  if (on) { wake(); blip({ freq: 880, dur: 0.09, gain: 0.16 }); }
  return on;
}

/** En ton. Vse ostalo je sestavljeno iz teh. */
function blip({ freq, dur = 0.12, gain = 0.12, type = 'sine', at = 0, slideTo = null }) {
  const c = wake();
  if (!c || !on) return;
  const t0 = c.currentTime + at;
  const osc = c.createOscillator();
  const vol = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  // Mehak začetek in konec, da ne poka.
  vol.gain.setValueAtTime(0.0001, t0);
  vol.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  vol.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(vol).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function chord(freqs, { dur = 0.5, gain = 0.09, stagger = 0.05, type = 'triangle' } = {}) {
  freqs.forEach((f, i) => blip({ freq: f, dur, gain, type, at: i * stagger }));
}

export const sfx = {
  /** Vsaka sekunda zadnjih petih - višje, ko je bolj vroče. */
  tick(secondsLeft) {
    blip({ freq: secondsLeft <= 2 ? 1180 : 880, dur: 0.07, gain: 0.1, type: 'square' });
  },
  /** Nekdo je oddal odgovor. */
  answer() {
    blip({ freq: 660, dur: 0.07, gain: 0.07, type: 'triangle' });
  },
  /** Čas je potekel. */
  timeout() {
    blip({ freq: 300, slideTo: 150, dur: 0.4, gain: 0.12, type: 'sawtooth' });
  },
  /** Razkritje odgovorov. */
  reveal() {
    chord([523.25, 659.25, 783.99], { dur: 0.45, gain: 0.08 });
  },
  /** Konec igre. */
  win() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => blip({ freq: f, dur: 0.22, gain: 0.11, type: 'triangle', at: i * 0.13 }));
    chord([523.25, 659.25, 783.99, 1046.5], { dur: 0.9, gain: 0.07, stagger: 0, type: 'sine' });
  },
  /** Pavza in nadaljevanje. */
  pause(paused) {
    blip({ freq: paused ? 520 : 700, slideTo: paused ? 380 : 900, dur: 0.16, gain: 0.09 });
  },
};
