// Prikaz znakov igralcev.
//
// Znaki so emojiji; ta modul skrbi samo za to, da so povsod enako veliki in
// poravnani - v drobni znački ob odgovoru enako kot na stopničkah.

/** Vozlišče za prikaz enega znaka. */
export function av(id, size = 28) {
  const span = document.createElement('span');
  span.className = 'av-i';
  span.style.width = `${size}px`;
  span.style.height = `${size}px`;
  span.style.fontSize = `${Math.round(size * 0.86)}px`;
  span.textContent = id || '·';
  return span;
}

/**
 * Več znakov v vrsti - za pare. Sprejme tudi en sam niz, ker ga nekatera
 * mesta (nagrade za posameznika) pošljejo tako.
 */
export function avPair(ids, size = 26) {
  const wrap = document.createElement('span');
  wrap.className = 'av-pair';
  const list = Array.isArray(ids) ? ids : [ids];
  for (const id of list) if (id) wrap.append(av(id, size));
  return wrap;
}
