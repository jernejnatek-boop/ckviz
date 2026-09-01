# CKViz - kviz za pare 💘

Kviz, ki ga igrata dva in dva. **Na velikem zaslonu** (računalnik na mizi) so vprašanje,
rezultati in statistika, **vsak igralec pa odgovarja na svojem telefonu**.

Vprašanja napiše **Claude** za poljubno tematiko - od splošne razgledanosti do
česarkoli, kar vam pade na pamet.

---

## V čem je drugačen

Pri vsakem vprašanju odgovoriš **dvakrat**:

1. **Tvoj odgovor** - kaj misliš / kaj veš.
2. **Napoved** - kaj misliš, da je izbral tvoj par.

Prva plast meri znanje, druga pa **kemijo** - kako dobro se v resnici poznata.
Iz tega se skozi celotno igro gradi *Kemijomer*, ki na koncu pokaže, kateri par
se najbolje bere med vrsticami.

### Štirje načini

| Način | Kako deluje | Točke |
|---|---|---|
| 🧠 **Znanje** | En pravilen odgovor med štirimi. Pred zaklepom izbereš še **vložek** x1, x2 ali x3. | 100 × vložek, minus pri zgrešenem tveganju, plus bonus za hitrost |
| ✅ **Več pravilnih** | Pravilna sta dva ali trije odgovori. Napačna izbira odnese točke. | +40 na zadetek, −20 na zgrešeno |
| 🔗 **Sinhronizacija** | Ni pravilnega odgovora - par mora **brez pogovora izbrati isto**. | +150, če se ujameta |
| 💘 **Ali me poznaš?** | Odgovoriš zase, partner ugiba, kaj si izbral. | +150 za vsako uganjeno |

Zadnjih 20 % vprašanj je **vroči krog 🔥** - dvojne točke, tako da je do konca vse odprto.

Na koncu velik zaslon pokaže stopničke, **Kemijomer**, pregled vprašanje za vprašanjem
in nagrade večera: *Najboljši poznavalec*, *Hodeča enciklopedija*, *Najhitrejši prst*,
*Največji hazarder*, *Najbolj usklajena* in *Dva svetova*.

---

## Zagon

```bash
npm install
npm start
```

Nato na računalniku, ki bo na mizi, odpri:

```
http://localhost:3000/host.html
```

Na zaslonu se pokažeta **koda sobe** in **QR koda**. Telefoni skenirajo QR ali odprejo
naslov, ki piše zraven (npr. `192.168.1.20:3000/p/ABCD`).

> Telefoni in računalnik morajo biti na **istem WiFi omrežju**. Aplikacija sama zazna
> naslov računalnika v omrežju in ga izpiše na velikem zaslonu.

Do **10 igralcev** na sobo (5 parov).

### Vprašanja od Clauda

Za generiranje vprašanj potrebuješ ključ iz [Anthropic Console](https://console.anthropic.com/settings/keys):

```bash
cp .env.example .env      # in vanj vpiši svoj ključ
export ANTHROPIC_API_KEY=sk-ant-...
npm start
```

Če ključa ni, aplikacija deluje naprej in uporabi **vgrajen nabor 42 vprašanj**
v slovenščini - le da si tematike ne moreš izbrati sam.

Deluje tudi prijava prek Anthropic CLI (`ant auth login`); SDK sam prebere profil.

---

## Kako poteka večer

1. **Priprava** (velik zaslon): vpišeš tematiko (`90. leta`, `potovanja`, `hrana`,
   `naša služba` ...), število vprašanj, zahtevnost, ton in katere načine želiš.
   Klikneš *Ustvari vprašanja* - Claude napiše krog v slovenščini. Vprašanja lahko
   pregledaš in katerokoli pobrišeš, z *Dodaj še* pa krog razširiš (že uporabljena
   vprašanja pošlje modelu, da se ne ponavlja).
2. **Čakalnica**: igralci vstopijo, izberejo ime in znak, nato **na telefonu izbere
   vsak svoj par**. Ko se izbereta oba, sta v paru. Lahko tudi klikneš
   *Samodejno sestavi pare*.
3. **Igra**: vprašanje se pokaže na velikem zaslonu, telefoni odgovarjajo.
   Ko vsi zaklenejo, se odgovori razkrijejo sami - ali pa jih razkriješ s tipko.
4. **Razkritje**: razporeditev odgovorov, *Zrcalo parov* (kaj sta izbrala drug ob
   drugem), pridobljene točke in lestvica. Igralci lahko s telefona pošljejo
   emoji reakcijo, ki zaplava čez velik zaslon.
5. **Konec**: stopničke, nagrade, Kemijomer, celoten pregled kroga.
   *Nov krog (iste ekipe)* obdrži pare in ponastavi točke.

### Bližnjice na velikem zaslonu

`preslednica` ali `→` - začni igro / razkrij odgovore / naslednje vprašanje.

---

## Tehnično

- **Strežnik**: Node 20+, Express 5, `ws`. Stanje je v pomnilniku - ni baze,
  ni namestitve. Soba se počisti po 6 urah neaktivnosti.
- **Odjemalec**: čisti ES-moduli, brez gradnje in brez ogrodij.
- **Claude**: `@anthropic-ai/sdk`, model `claude-opus-5` s strukturiranim izhodom
  (`output_config.format` z JSON shemo), tako da so vprašanja vedno v pravi obliki.
  Če varnostni klasifikator zahtevo zavrne, se samodejno poskusi z
  `claude-opus-4-8`; če tudi to ne uspe, se uporabi vgrajen nabor.
  Model in raven truda (`effort`) lahko spremeniš z `CKVIZ_MODEL` in `CKVIZ_EFFORT`.
- **Ponovna povezava**: telefon si zapomni sejo, tako da zaklenjen zaslon ali
  izgubljen WiFi ne pomeni izpada iz igre.

```
server.js              HTTP, WebSocket, usmerjanje ukazov
src/game.js            načini in točkovanje
src/rooms.js           stanje sobe, pari, statistika, nagrade
src/ai.js              generiranje vprašanj s Claudom
src/questionBank.js    vgrajen nabor vprašanj
public/host.html|js    velik zaslon
public/play.html|js    telefon
public/index.html      vstopna stran s kodo sobe
```

### Nastavitve okolja

| Spremenljivka | Privzeto | Pomen |
|---|---|---|
| `ANTHROPIC_API_KEY` | - | ključ za generiranje vprašanj |
| `PORT` | `3000` | vrata strežnika |
| `CKVIZ_MODEL` | `claude-opus-5` | model za pisanje vprašanj |
| `CKVIZ_FALLBACK_MODEL` | `claude-opus-4-8` | rezervni model ob zavrnitvi |
| `CKVIZ_EFFORT` | `medium` | koliko truda vloži model (`low`-`max`) |
