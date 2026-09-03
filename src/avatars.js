// Lastni avatarji CKViz.
//
// Namesto emojijev, ki so na vsakem telefonu videti drugače, ima aplikacija
// svoje like: barvna ploščica z gradientom, obraz in dodatek. Vsak je
// sestavljen iz treh delov, izris pa je v public/js/avatars.js, tako da je
// tu samo opis - en sam vir resnice za strežnik in oba odjemalca.

export const AVATARS = [
  { id: 'iskra',    name: 'Iskra',    c1: '#ff5c7a', c2: '#e11d48', face: 'happy',      accent: 'bolt' },
  { id: 'list',     name: 'List',     c1: '#a3e635', c2: '#4d7c0f', face: 'wink',       accent: 'leaf' },
  { id: 'nebo',     name: 'Nebo',     c1: '#38bdf8', c2: '#0369a1', face: 'cool',       accent: 'halo' },
  { id: 'sonce',    name: 'Sonce',    c1: '#fbbf24', c2: '#d97706', face: 'wow',        accent: 'crown' },
  { id: 'zvezda',   name: 'Zvezda',   c1: '#7c3aed', c2: '#4c1d95', face: 'star',       accent: 'iskrice' },
  { id: 'meta',     name: 'Meta',     c1: '#2dd4bf', c2: '#0f766e', face: 'happy',      accent: 'antenna' },
  { id: 'ogenj',    name: 'Ogenj',    c1: '#fb923c', c2: '#c2410c', face: 'smirk',      accent: 'horns' },
  { id: 'jezero',   name: 'Jezero',   c1: '#0ea5e9', c2: '#075985', face: 'wink',       accent: 'valovi' },
  { id: 'korala',   name: 'Korala',   c1: '#ec4899', c2: '#9d174d', face: 'zaljubljen', accent: 'cvet' },
  { id: 'mah',      name: 'Mah',      c1: '#4ade80', c2: '#15803d', face: 'curious',    accent: 'greben' },
  { id: 'luna',     name: 'Luna',     c1: '#6366f1', c2: '#312e81', face: 'sleepy',     accent: 'moon' },
  { id: 'grom',     name: 'Grom',     c1: '#facc15', c2: '#a16207', face: 'jezen',      accent: 'bolt' },
  { id: 'malina',   name: 'Malina',   c1: '#f43f5e', c2: '#9f1239', face: 'jezik',      accent: 'kapa' },
  { id: 'val',      name: 'Val',      c1: '#22d3ee', c2: '#0e7490', face: 'robot',      accent: 'valovi' },
  { id: 'sliva',    name: 'Sliva',    c1: '#d946ef', c2: '#86198f', face: 'wow',        accent: 'slusalke' },
  { id: 'smreka',   name: 'Smreka',   c1: '#34d399', c2: '#065f46', face: 'cool',       accent: 'leaf' },
  { id: 'baker',    name: 'Baker',    c1: '#d97706', c2: '#7c2d12', face: 'pirat',      accent: 'kapa' },
  { id: 'ametist',  name: 'Ametist',  c1: '#a78bfa', c2: '#5b21b6', face: 'cool',       accent: 'horns' },
  { id: 'led',      name: 'Led',      c1: '#bae6fd', c2: '#0284c7', face: 'curious',    accent: 'snezinka' },
  { id: 'limona',   name: 'Limona',   c1: '#fef08a', c2: '#ca8a04', face: 'sleepy',     accent: 'iskrice' },
  { id: 'srce',     name: 'Srce',     c1: '#ef4444', c2: '#7f1d1d', face: 'zaljubljen', accent: 'slusalke' },
  { id: 'megla',    name: 'Megla',    c1: '#e2e8f0', c2: '#64748b', face: 'sleepy',     accent: 'valovi' },
  { id: 'vijolica', name: 'Vijolica', c1: '#ddd6fe', c2: '#7c3aed', face: 'smirk',      accent: 'slusalke' },
  { id: 'zlato',    name: 'Zlato',    c1: '#eab308', c2: '#713f12', face: 'star',       accent: 'none' },
  { id: 'mavrica',  name: 'Mavrica',  c1: '#f0abfc', c2: '#a21caf', face: 'star',       accent: 'cvet' },
  { id: 'kaktus',   name: 'Kaktus',   c1: '#84cc16', c2: '#3f6212', face: 'jezen',      accent: 'greben' },
  { id: 'oblak',    name: 'Oblak',    c1: '#93c5fd', c2: '#1e40af', face: 'happy',      accent: 'valovi' },
  { id: 'cimet',    name: 'Cimet',    c1: '#b45309', c2: '#451a03', face: 'wink',       accent: 'uhani' },
  { id: 'biser',    name: 'Biser',    c1: '#fbcfe8', c2: '#be185d', face: 'zaljubljen', accent: 'uhani' },
  { id: 'vulkan',   name: 'Vulkan',   c1: '#b91c1c', c2: '#450a0a', face: 'jezen',      accent: 'horns' },
  { id: 'sneg',     name: 'Sneg',     c1: '#f0f9ff', c2: '#7dd3fc', face: 'robot',      accent: 'snezinka' },
  { id: 'cesnja',   name: 'Češnja',   c1: '#e11d48', c2: '#881337', face: 'jezik',      accent: 'cvet' },
  { id: 'bukev',    name: 'Bukev',    c1: '#fde68a', c2: '#92400e', face: 'curious',    accent: 'kapa' },
  { id: 'sidro',    name: 'Sidro',    c1: '#1e40af', c2: '#172554', face: 'pirat',      accent: 'moon' },
  { id: 'komet',    name: 'Komet',    c1: '#818cf8', c2: '#3730a3', face: 'star',       accent: 'bolt' },
  { id: 'nefrit',   name: 'Nefrit',   c1: '#10b981', c2: '#064e3b', face: 'robot',      accent: 'leaf' },
];

export const AVATAR_IDS = AVATARS.map((a) => a.id);

// Vsak lik mora imeti svojo kombinacijo obraza in dodatka - sicer ju barva
// sama ne loči dovolj, kar se je enkrat že zgodilo (Led in Limona).
const kombinacije = new Set(AVATARS.map((a) => `${a.face}+${a.accent}`));
if (kombinacije.size !== AVATARS.length) {
  throw new Error('Dva avatarja imata enak obraz in dodatek - popravi src/avatars.js.');
}
const barve = new Set(AVATARS.map((a) => a.c1));
if (barve.size !== AVATARS.length) {
  throw new Error('Dva avatarja imata enako osnovno barvo - popravi src/avatars.js.');
}
