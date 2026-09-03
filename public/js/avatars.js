// Izris avatarjev CKViz. Opis likov pride s strežnika (/api/info), tu je
// samo risba: ploščica z gradientom, obraz in dodatek.

let REGISTRY = new Map();

/** Nastavi like, ki jih je poslal strežnik. */
export function setAvatars(list) {
  REGISTRY = new Map((list || []).map((a) => [a.id, a]));
}

export function avatarList() {
  return [...REGISTRY.values()];
}

export function isAvatar(id) {
  return REGISTRY.has(id);
}

const INK = '#151329';

// Obrazi so risani v kvadratu 100x100: oči okrog y=54, usta okrog y=72.
const FACES = {
  happy: `
    <circle cx="35" cy="53" r="6.5"/><circle cx="65" cy="53" r="6.5"/>
    <path d="M36 68q14 13 28 0" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`,
  wink: `
    <circle cx="35" cy="53" r="6.5"/>
    <path d="M58 55q7 -9 14 0" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
    <path d="M36 68q14 13 28 0" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`,
  star: `
    <path d="M35 43l3.6 7.4 7.4 3.6-7.4 3.6L35 65l-3.6-7.4L24 54l7.4-3.6z"/>
    <path d="M65 43l3.6 7.4 7.4 3.6-7.4 3.6L65 65l-3.6-7.4L54 54l7.4-3.6z"/>
    <path d="M41 70q9 8 18 0" fill="none" stroke="${INK}" stroke-width="5.5" stroke-linecap="round"/>`,
  cool: `
    <path d="M20 46h60v7a11 11 0 0 1-11 11h-6a11 11 0 0 1-11-11a11 11 0 0 1-11 11h-6a11 11 0 0 1-11-11z"/>
    <path d="M40 74q10 7 20 0" fill="none" stroke="${INK}" stroke-width="5.5" stroke-linecap="round"/>`,
  sleepy: `
    <path d="M26 54q9 -8 18 0" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
    <path d="M56 54q9 -8 18 0" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
    <path d="M42 72h16" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`,
  wow: `
    <circle cx="34" cy="52" r="8"/><circle cx="66" cy="52" r="8"/>
    <circle cx="36.5" cy="49" r="2.6" fill="#fff"/><circle cx="68.5" cy="49" r="2.6" fill="#fff"/>
    <ellipse cx="50" cy="74" rx="8" ry="9"/>`,
  smirk: `
    <circle cx="35" cy="53" r="6.5"/><circle cx="65" cy="53" r="6.5"/>
    <path d="M37 71q13 9 25 -3" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`,
  curious: `
    <circle cx="35" cy="55" r="6.5"/><circle cx="65" cy="49" r="6.5"/>
    <path d="M25 42q9 -6 18 -2" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <circle cx="50" cy="72" r="6"/>`,
  zaljubljen: `
    <path d="M35 47c-4-5-11-3-11 3 0 5 7 9 11 12 4-3 11-7 11-12 0-6-7-8-11-3z"/>
    <path d="M65 47c-4-5-11-3-11 3 0 5 7 9 11 12 4-3 11-7 11-12 0-6-7-8-11-3z"/>
    <path d="M40 74q10 7 20 0" fill="none" stroke="${INK}" stroke-width="5.5" stroke-linecap="round"/>`,
  jezen: `
    <path d="M25 42l18 6" fill="none" stroke="${INK}" stroke-width="5.5" stroke-linecap="round"/>
    <path d="M75 42l-18 6" fill="none" stroke="${INK}" stroke-width="5.5" stroke-linecap="round"/>
    <circle cx="35" cy="56" r="6"/><circle cx="65" cy="56" r="6"/>
    <path d="M38 76q12 -9 24 0" fill="none" stroke="${INK}" stroke-width="5.5" stroke-linecap="round"/>`,
  jezik: `
    <circle cx="35" cy="52" r="6.5"/><circle cx="65" cy="52" r="6.5"/>
    <path d="M34 68h32a16 16 0 0 1-32 0z"/>
    <path d="M50 76c6 0 9 4 9 8s-3 6-6 5-3-4-3-7z"/>`,
  robot: `
    <rect x="26" y="46" width="16" height="12" rx="3"/><rect x="58" y="46" width="16" height="12" rx="3"/>
    <rect x="36" y="70" width="28" height="6" rx="3"/>`,
  pirat: `
    <path d="M22 44h26v6a13 13 0 0 1-26 0z"/>
    <path d="M22 44L14 36" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="65" cy="53" r="6.5"/>
    <path d="M37 72q13 9 25 -2" fill="none" stroke="${INK}" stroke-width="5.5" stroke-linecap="round"/>`,
};

// Dodatki živijo v zgornjem pasu (y 8-34).
const ACCENTS = {
  none: '',
  bolt: `<path d="M63 8L46 32h10l-5 16 19-26H59z"/>`,
  crown: `<path d="M28 34l4-20 9 9 9-14 9 14 9-9 4 20z"/>`,
  halo: `<ellipse cx="50" cy="18" rx="21" ry="6.5" fill="none" stroke="${INK}" stroke-width="5"/>`,
  leaf: `<path d="M50 34c-1-12 6-20 17-21 1 12-5 20-17 21z"/><path d="M50 34c1-7 5-12 11-15" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`,
  moon: `<path d="M62 10a13 13 0 1 0 0 24a16 16 0 0 1 0-24z"/>`,
  horns: `<path d="M30 32L21 12l17 10z"/><path d="M70 32l9-20-17 10z"/>`,
  slusalke: `<path d="M22 30V26a28 28 0 0 1 56 0v4" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`
    + `<rect x="13" y="26" width="15" height="20" rx="7"/><rect x="72" y="26" width="15" height="20" rx="7"/>`,
  antenna: `<path d="M50 32V17" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><circle cx="50" cy="12" r="6.5"/>`,
  cvet: `<circle cx="66" cy="18" r="8"/><circle cx="82" cy="18" r="8"/><circle cx="74" cy="8" r="8"/><circle cx="74" cy="28" r="8"/><circle cx="74" cy="18" r="5" fill="#fff"/>`,
  kapa: `<path d="M20 32a30 30 0 0 1 60 0z"/><path d="M78 32h16a5 5 0 0 1 0 8H74z"/>`,
  greben: `<path d="M50 2c7 7 11 15 11 24H39c0-9 4-17 11-24z"/>`
    + `<path d="M33 12c5 5 7 10 7 16H26c0-6 3-11 7-16z"/>`
    + `<path d="M67 12c5 5 7 10 7 16H60c0-6 3-11 7-16z"/>`,
  snezinka: `<g stroke="${INK}" stroke-width="5" stroke-linecap="round" fill="none">`
    + `<path d="M74 4v28M61 11l26 14M87 11L61 25"/></g>`,
  uhani: `<circle cx="17" cy="62" r="7" fill="none" stroke="${INK}" stroke-width="4.5"/><circle cx="83" cy="62" r="7" fill="none" stroke="${INK}" stroke-width="4.5"/>`,
  valovi: `<path d="M18 26q8 -10 16 0t16 0t16 0t16 0" fill="none" stroke="${INK}" stroke-width="5.5" stroke-linecap="round"/>`,
  iskrice: `<path d="M30 26l2.4 5 5 2.4-5 2.4L30 41l-2.4-5.2-5-2.4 5-2.4z"/>`
    + `<path d="M50 16l3 6.2 6.2 3-6.2 3L50 34.4l-3-6.2-6.2-3 6.2-3z"/>`
    + `<path d="M70 26l2.4 5 5 2.4-5 2.4L70 41l-2.4-5.2-5-2.4 5-2.4z"/>`,
};

/** SVG kot niz - uporabno tudi za predoglede. */
export function avatarSvg(id, size = 40) {
  const a = REGISTRY.get(id);
  if (!a) return null;
  const gid = `g_${a.id}`;
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${a.c1}"/><stop offset="100%" stop-color="${a.c2}"/>
    </linearGradient></defs>
    <rect x="2" y="2" width="96" height="96" rx="27" fill="url(#${gid})"/>
    <g fill="${INK}">${ACCENTS[a.accent] || ''}${FACES[a.face] || ''}</g>
  </svg>`;
}

/**
 * Vozlišče za prikaz. Če oznaka ni znan avatar (stare igre z emojiji),
 * jo izpišemo kot besedilo, da zgodovina ostane berljiva.
 */
export function av(id, size = 28) {
  const span = document.createElement('span');
  span.className = 'av-i';
  span.style.width = `${size}px`;
  span.style.height = `${size}px`;
  const svg = avatarSvg(id, size);
  if (svg) span.innerHTML = svg;
  else {
    span.textContent = id || '·';
    span.style.fontSize = `${Math.round(size * 0.82)}px`;
  }
  return span;
}

/**
 * Več avatarjev v vrsti - za pare. Sprejme tudi en sam niz, ker stare
 * shranjene igre nosijo emoji namesto seznama oznak.
 */
export function avPair(ids, size = 26) {
  const wrap = document.createElement('span');
  wrap.className = 'av-pair';
  const list = Array.isArray(ids) ? ids : [ids];
  for (const id of list) if (id) wrap.append(av(id, size));
  return wrap;
}

/** Ime lika, kadar ga je treba izpisati. */
export function avatarName(id) {
  return REGISTRY.get(id)?.name || id || '';
}
