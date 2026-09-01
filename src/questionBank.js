// Rezervni nabor vprašanj - uporabi se, kadar ni ključa za Claude API
// ali kadar generiranje spodleti. Vse v slovenščini.

export const BANK = [
  // ---------- ZNANJE ----------
  { mode: 'trivia', category: 'Geografija', text: 'Katera je najdaljša reka v Sloveniji?', options: ['Sava', 'Drava', 'Mura', 'Soča'], correct: 0, explanation: 'Sava meri po Sloveniji približno 221 km.' },
  { mode: 'trivia', category: 'Geografija', text: 'Katero mesto leži ob izlivu Ljubljanice?', options: ['Vrhnika', 'Kamnik', 'Ljubljana', 'Postojna'], correct: 2, explanation: 'Ljubljanica teče skozi Ljubljano in se izliva v Savo.' },
  { mode: 'trivia', category: 'Zgodovina', text: 'Katerega leta je Slovenija uvedla evro?', options: ['2004', '2007', '2010', '2013'], correct: 1, explanation: 'Evro je bil uveden 1. januarja 2007.' },
  { mode: 'trivia', category: 'Znanost', text: 'Koliko kosti ima odrasel človek?', options: ['186', '206', '226', '246'], correct: 1, explanation: 'Odrasel človek ima 206 kosti, dojenček okrog 270.' },
  { mode: 'trivia', category: 'Znanost', text: 'Kateri plin rastline sprejemajo pri fotosintezi?', options: ['Kisik', 'Dušik', 'Ogljikov dioksid', 'Vodik'], correct: 2, explanation: 'Rastline sprejemajo CO2 in oddajajo kisik.' },
  { mode: 'trivia', category: 'Film', text: 'Kdo je režiral film "Sedma pečat"?', options: ['Federico Fellini', 'Ingmar Bergman', 'Andrej Tarkovski', 'Akira Kurosava'], correct: 1, explanation: 'Ingmar Bergman, 1957.' },
  { mode: 'trivia', category: 'Glasba', text: 'Koliko strun ima klasična violina?', options: ['3', '4', '5', '6'], correct: 1, explanation: 'Violina ima štiri strune: G, D, A, E.' },
  { mode: 'trivia', category: 'Šport', text: 'Na koliko let potekajo poletne olimpijske igre?', options: ['2', '3', '4', '5'], correct: 2, explanation: 'Vsaka štiri leta.' },
  { mode: 'trivia', category: 'Hrana', text: 'Iz katere države izvira jed paella?', options: ['Italija', 'Portugalska', 'Španija', 'Mehika'], correct: 2, explanation: 'Paella izvira iz Valencije v Španiji.' },
  { mode: 'trivia', category: 'Tehnologija', text: 'Kaj pomeni kratica "URL"?', options: ['Universal Router Link', 'Uniform Resource Locator', 'User Remote Login', 'Unified Reference Layer'], correct: 1, explanation: 'Uniform Resource Locator.' },
  { mode: 'trivia', category: 'Narava', text: 'Katera žival je najhitrejša na kopnem?', options: ['Lev', 'Gepard', 'Antilopa', 'Konj'], correct: 1, explanation: 'Gepard doseže okrog 110 km/h.' },
  { mode: 'trivia', category: 'Umetnost', text: 'Kdo je naslikal Zvezdno noč?', options: ['Claude Monet', 'Vincent van Gogh', 'Paul Cézanne', 'Edvard Munch'], correct: 1, explanation: 'Van Gogh, 1889.' },
  { mode: 'trivia', category: 'Literatura', text: 'Kdo je napisal Krst pri Savici?', options: ['Ivan Cankar', 'France Prešeren', 'Oton Župančič', 'Simon Jenko'], correct: 1, explanation: 'France Prešeren, 1836.' },
  { mode: 'trivia', category: 'Vesolje', text: 'Kateri planet je najbližje Soncu?', options: ['Venera', 'Mars', 'Merkur', 'Zemlja'], correct: 2, explanation: 'Merkur.' },
  { mode: 'trivia', category: 'Splošno', text: 'Koliko minut traja nogometna tekma brez podaljškov?', options: ['80', '90', '100', '120'], correct: 1, explanation: 'Dvakrat po 45 minut.' },
  { mode: 'trivia', category: 'Jezik', text: 'Koliko sklonov ima slovenščina?', options: ['4', '5', '6', '7'], correct: 2, explanation: 'Šest sklonov.' },

  // ---------- VEČ PRAVILNIH ----------
  { mode: 'multi', category: 'Geografija', text: 'Katere od naštetih držav mejijo na Slovenijo?', options: ['Avstrija', 'Slovaška', 'Hrvaška', 'Madžarska'], correct: [0, 2, 3], explanation: 'Slovenija meji na Avstrijo, Italijo, Madžarsko in Hrvaško.' },
  { mode: 'multi', category: 'Znanost', text: 'Kaj od naštetega so plemeniti plini?', options: ['Helij', 'Kisik', 'Neon', 'Argon'], correct: [0, 2, 3], explanation: 'Kisik ni plemeniti plin.' },
  { mode: 'multi', category: 'Hrana', text: 'Katere sestavine spadajo v klasično carbonaro?', options: ['Smetana', 'Jajca', 'Pancetta', 'Pecorino'], correct: [1, 2, 3], explanation: 'Prava carbonara je brez smetane.' },
  { mode: 'multi', category: 'Vesolje', text: 'Kateri od naštetih so plinasti velikani?', options: ['Jupiter', 'Mars', 'Saturn', 'Neptun'], correct: [0, 2, 3], explanation: 'Mars je kamnit planet.' },
  { mode: 'multi', category: 'Šport', text: 'Katere discipline so del triatlona?', options: ['Plavanje', 'Kolesarjenje', 'Veslanje', 'Tek'], correct: [0, 1, 3], explanation: 'Plavanje, kolesarjenje, tek.' },
  { mode: 'multi', category: 'Tehnologija', text: 'Kaj od naštetega so programski jeziki?', options: ['Python', 'HTTP', 'Rust', 'Kotlin'], correct: [0, 2, 3], explanation: 'HTTP je protokol, ne programski jezik.' },

  // ---------- SINHRONIZACIJA ----------
  { mode: 'sync', category: 'Skupno', text: 'Izberita isto: kam gresta na sanjski vikend?', options: ['Morje in nič načrtov', 'Gore in pohodi', 'Mesto in muzeji', 'Doma, s filmi in hrano'] },
  { mode: 'sync', category: 'Skupno', text: 'Izberita isto: kaj bi naročila za skupno večerjo?', options: ['Pica', 'Suši', 'Burger', 'Kaj domačega'] },
  { mode: 'sync', category: 'Skupno', text: 'Izberita isto: kakšna bi bila vajina skupna supermoč?', options: ['Teleportacija', 'Branje misli', 'Ustavljanje časa', 'Nevidnost'] },
  { mode: 'sync', category: 'Skupno', text: 'Izberita isto: katera žival bi bila vajin skupni hišni ljubljenček?', options: ['Pes', 'Mačka', 'Papiga', 'Nič - rastline'] },
  { mode: 'sync', category: 'Skupno', text: 'Izberita isto: kaj je najboljši del sobote?', options: ['Jutranja kava', 'Popoldanski sprehod', 'Večerja zunaj', 'Spanje do desetih'] },
  { mode: 'sync', category: 'Skupno', text: 'Izberita isto: kaj bi kupila, če dobita 500 € skupaj?', options: ['Potovanje', 'Nekaj za dom', 'Dobra večerja in razvajanje', 'Prihranita'] },
  { mode: 'sync', category: 'Skupno', text: 'Izberita isto: kateri letni čas je vajin?', options: ['Pomlad', 'Poletje', 'Jesen', 'Zima'] },
  { mode: 'sync', category: 'Skupno', text: 'Izberita isto: kakšna glasba gre v avtu na dolgi poti?', options: ['Stari hiti', 'Podkast', 'Rock', 'Tišina'] },

  // ---------- ALI ME POZNAŠ ----------
  { mode: 'know', category: 'Navade', text: 'Kaj narediš prvo, ko prideš domov?', options: ['Sezujem se in ležem', 'Grem v kuhinjo', 'Preverim telefon', 'Grem pod tuš'] },
  { mode: 'know', category: 'Navade', text: 'Kako si zjutraj bolj podoben?', options: ['Takoj buden in zgovoren', 'Tiho do prve kave', 'Dremež še petkrat', 'Odvisno od dneva'] },
  { mode: 'know', category: 'Okusi', text: 'Kaj bi najprej vzel s sladice?', options: ['Čokolada', 'Sadje', 'Sladoled', 'Nič, raje slano'] },
  { mode: 'know', category: 'Okusi', text: 'Katera pijača te najbolje opiše?', options: ['Kava', 'Čaj', 'Voda z limono', 'Nekaj mehurčkastega'] },
  { mode: 'know', category: 'Značaj', text: 'Kaj te najhitreje spravi v slabo voljo?', options: ['Zamujanje', 'Nered', 'Lakota', 'Hrup'] },
  { mode: 'know', category: 'Značaj', text: 'Kako se odločaš o pomembnih stvareh?', options: ['Po občutku', 'Naredim seznam', 'Vprašam druge', 'Odlašam do konca'] },
  { mode: 'know', category: 'Prosti čas', text: 'Kako bi porabil čisto prost popoldan?', options: ['Šport ali gibanje', 'Serija in kavč', 'Nekaj ustvarjalnega', 'Družba in klepet'] },
  { mode: 'know', category: 'Prosti čas', text: 'Kaj je tvoj najljubši način potovanja?', options: ['Z avtom, brez načrta', 'Z letalom, vse rezervirano', 'Z vlakom, počasi', 'Peš ali s kolesom'] },
  { mode: 'know', category: 'Odnos', text: 'Kaj ti pri paru pomeni največ?', options: ['Da me nasmeje', 'Da me posluša', 'Da je zanesljiv', 'Da me izziva'] },
  { mode: 'know', category: 'Odnos', text: 'Kako najraje rešuješ nesoglasje?', options: ['Takoj se pogovoriva', 'Potrebujem malo časa', 'S humorjem', 'Popustim, da je mir'] },
  { mode: 'know', category: 'Navade', text: 'Kaj je najbolj verjetno v tvojem hladilniku?', options: ['Ostanki od včeraj', 'Preveč zelenjave', 'Skoraj nič', 'Sladica, skrita zadaj'] },
  { mode: 'know', category: 'Značaj', text: 'Kako bi te opisali prijatelji v eni besedi?', options: ['Zabaven', 'Miren', 'Organiziran', 'Nepredvidljiv'] },
];

/**
 * Naključni izbor iz banke, po možnosti z zahtevano razporeditvijo načinov.
 */
export function pickFromBank(count, modes = ['trivia', 'multi', 'sync', 'know']) {
  const pool = {};
  for (const m of modes) pool[m] = shuffle(BANK.filter((q) => q.mode === m));
  const out = [];
  let i = 0;
  while (out.length < count) {
    const mode = modes[i % modes.length];
    const q = pool[mode]?.pop();
    if (q) out.push({ ...q });
    i++;
    if (i > count * modes.length + 50) break;
  }
  return shuffle(out).slice(0, count);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
