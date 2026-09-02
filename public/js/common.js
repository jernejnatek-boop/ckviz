// Skupne pomožne funkcije za oba odjemalca.

export const OPT_GLYPHS = ['▲', '◆', '●', '■'];

export function el(sel, root = document) { return root.querySelector(sel); }
export function els(sel, root = document) { return [...root.querySelectorAll(sel)]; }

export function h(tag, attrs = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    node.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return node;
}

export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

/** Obstojna WebSocket povezava s samodejnim ponovnim priklopom. */
export class Wire {
  constructor({ onMessage, onOpen, onStatus }) {
    this.onMessage = onMessage;
    this.onOpen = onOpen;
    this.onStatus = onStatus || (() => {});
    this.queue = [];
    this.tries = 0;
    this.connect();
    setInterval(() => this.send({ t: 'ping' }), 20000);
  }

  connect() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    this.ws = new WebSocket(`${proto}://${location.host}/ws`);
    this.onStatus('connecting');

    this.ws.onopen = () => {
      this.tries = 0;
      this.onStatus('online');
      const q = this.queue;
      this.queue = [];
      this.onOpen?.();
      for (const m of q) this.send(m);
    };
    this.ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.t === 'pong') return;
      this.onMessage(msg);
    };
    this.ws.onclose = () => {
      this.onStatus('offline');
      const delay = Math.min(8000, 500 * 2 ** this.tries++);
      setTimeout(() => this.connect(), delay);
    };
    this.ws.onerror = () => this.ws.close();
  }

  send(msg) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
    else if (msg.t !== 'ping') this.queue.push(msg);
  }
}

export function toast(message, kind = '') {
  let host = document.querySelector('.toast-host');
  if (!host) {
    host = h('div', { class: 'toast-host' });
    document.body.append(host);
  }
  const node = h('div', { class: `toast ${kind}` }, message);
  host.append(node);
  setTimeout(() => {
    node.style.transition = 'opacity .3s';
    node.style.opacity = '0';
    setTimeout(() => node.remove(), 320);
  }, 4200);
}

export function burst(emoji, count = 1) {
  let fx = document.querySelector('.fx');
  if (!fx) {
    fx = h('div', { class: 'fx' });
    document.body.append(fx);
  }
  for (let i = 0; i < count; i++) {
    const node = h('span', {}, emoji);
    node.style.left = `${8 + Math.random() * 84}%`;
    node.style.bottom = `${-4 + Math.random() * 12}%`;
    node.style.animationDelay = `${Math.random() * 0.5}s`;
    fx.append(node);
    setTimeout(() => node.remove(), 3400);
  }
}

export function store(key, value) {
  try {
    if (value === undefined) return JSON.parse(localStorage.getItem(key) || 'null');
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch { /* zasebni način */ }
  return value;
}

export function pct(n, d) { return d ? Math.round((n / d) * 100) : 0; }

/**
 * Slovensko ujemanje s števnikom: 1 igralec, 2 igralca, 3 igralci, 5 igralcev.
 * forms = [ednina, dvojina, 3-4, ostalo]
 */
export function sloCount(n, forms) {
  const r100 = Math.abs(n) % 100;
  const r10 = Math.abs(n) % 10;
  const idx = r100 >= 11 && r100 <= 14 ? 3 : r10 === 1 ? 0 : r10 === 2 ? 1 : (r10 === 3 || r10 === 4) ? 2 : 3;
  return `${n} ${forms[idx]}`;
}

export const IGRALCI = ['igralec', 'igralca', 'igralci', 'igralcev'];
export const VPRASANJA = ['vprašanje', 'vprašanji', 'vprašanja', 'vprašanj'];
