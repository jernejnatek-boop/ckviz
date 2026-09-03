// Znaki igralcev - emojiji. Na velikem zaslonu so bolj berljivi in takoj
// prepoznavni kot risani liki, imen pa ne potrebujejo: znak stoji ob imenu
// igralca in ga pove že sam.
//
// Seznam je en sam vir resnice - strežnik ga pošlje obema odjemalcema.

export const AVATARS = [
  '🦊', '🐼', '🐙', '🦄', '🐝', '🐧', '🦁', '🐸', '🦉', '🐬', '🦖', '🐢',
  '🐨', '🐯', '🐮', '🐷', '🐵', '🐔', '🦋', '🐳', '🦀', '🦩', '🦔', '🐺',
  '🦇', '🐴', '🐰', '🐹', '🦝', '🦥', '🦜', '🐞', '🦕', '🐊', '🦭', '🐌',
];

export const AVATAR_IDS = AVATARS;

// Dva enaka znaka bi bila v seznamu igralcev videti kot ena oseba.
if (new Set(AVATARS).size !== AVATARS.length) {
  throw new Error('Dva znaka sta enaka - popravi src/avatars.js.');
}
