// Lastni avatarji CKViz.
//
// Namesto emojijev, ki so na vsakem telefonu videti drugače, ima aplikacija
// svoje like: barvna ploščica z gradientom, obraz in dodatek. Vsak je
// sestavljen iz treh delov, izris pa je v public/js/avatars.js, tako da je
// tu samo opis - en sam vir resnice za strežnik in oba odjemalca.

export const AVATARS = [
  { id: 'iskra',   name: 'Iskra',   c1: '#ff5c7a', c2: '#e11d48', face: 'happy',   accent: 'bolt' },
  { id: 'zvezda',  name: 'Zvezda',  c1: '#7c3aed', c2: '#4c1d95', face: 'star',    accent: 'crown' },
  { id: 'val',     name: 'Val',     c1: '#22d3ee', c2: '#0e7490', face: 'cool',    accent: 'none' },
  { id: 'list',    name: 'List',    c1: '#a3e635', c2: '#4d7c0f', face: 'happy',   accent: 'leaf' },
  { id: 'sonce',   name: 'Sonce',   c1: '#fbbf24', c2: '#d97706', face: 'wow',     accent: 'halo' },
  { id: 'luna',    name: 'Luna',    c1: '#6366f1', c2: '#312e81', face: 'sleepy',  accent: 'moon' },
  { id: 'ogenj',   name: 'Ogenj',   c1: '#fb923c', c2: '#c2410c', face: 'smirk',   accent: 'horns' },
  { id: 'led',     name: 'Led',     c1: '#bae6fd', c2: '#0284c7', face: 'curious', accent: 'iskrice' },
  { id: 'srce',    name: 'Srce',    c1: '#ef4444', c2: '#7f1d1d', face: 'wink',    accent: 'slusalke' },
  { id: 'meta',    name: 'Meta',    c1: '#2dd4bf', c2: '#0f766e', face: 'happy',   accent: 'antenna' },
  { id: 'sliva',   name: 'Sliva',   c1: '#d946ef', c2: '#86198f', face: 'wow',     accent: 'slusalke' },
  { id: 'grom',    name: 'Grom',    c1: '#facc15', c2: '#a16207', face: 'smirk',   accent: 'bolt' },
  { id: 'mah',     name: 'Mah',     c1: '#4ade80', c2: '#15803d', face: 'curious', accent: 'leaf' },
  { id: 'korala',  name: 'Korala',  c1: '#ec4899', c2: '#9d174d', face: 'star',    accent: 'antenna' },
  { id: 'nebo',    name: 'Nebo',    c1: '#38bdf8', c2: '#0369a1', face: 'happy',   accent: 'halo' },
  { id: 'baker',   name: 'Baker',   c1: '#d97706', c2: '#7c2d12', face: 'wink',    accent: 'horns' },
  { id: 'ametist', name: 'Ametist', c1: '#a78bfa', c2: '#5b21b6', face: 'cool',    accent: 'crown' },
  { id: 'limona',  name: 'Limona',  c1: '#fef08a', c2: '#ca8a04', face: 'curious', accent: 'iskrice' },
  { id: 'megla',   name: 'Megla',   c1: '#e2e8f0', c2: '#64748b', face: 'sleepy',  accent: 'moon' },
  { id: 'malina',  name: 'Malina',  c1: '#f43f5e', c2: '#9f1239', face: 'wow',     accent: 'bolt' },
  { id: 'jezero',  name: 'Jezero',  c1: '#0ea5e9', c2: '#075985', face: 'wink',    accent: 'antenna' },
  { id: 'zlato',   name: 'Zlato',   c1: '#eab308', c2: '#713f12', face: 'star',    accent: 'crown' },
  { id: 'vijolica',name: 'Vijolica',c1: '#d8b4fe', c2: '#6b21a8', face: 'smirk',   accent: 'slusalke' },
  { id: 'smreka',  name: 'Smreka',  c1: '#34d399', c2: '#065f46', face: 'cool',    accent: 'leaf' },
];

export const AVATAR_IDS = AVATARS.map((a) => a.id);
