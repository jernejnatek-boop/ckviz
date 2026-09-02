# CKViz - kviz za pare 💘

Kviz, ki ga igrata dva in dva. **Na velikem zaslonu** (računalnik na mizi ali TV) so
vprašanje, rezultati in statistika, **vsak igralec pa odgovarja na svojem telefonu**.

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

## Kaj se shrani

| Kaj | Kje | Kdaj |
|---|---|---|
| **Moji kvizi** - shranjeni nabori vprašanj | `data/packs.json` | ko klikneš *Shrani ta kviz* |
| **Odigrane igre** - rezultati, kemija, nagrade, pregled vprašanj | `data/games.json` | samodejno ob koncu vsake igre |
| **Žive sobe** - igralci, pari, točke, vprašanja | `data/rooms.json` | sproti |

Zaradi tretje vrstice **ponovni zagon strežnika ne prekine igre**: sobe se obnovijo,
telefoni se s shranjenim žetonom sami vrnejo v igro, tekoče vprašanje pa se odpre
znova s svežim časovnikom (že oddani odgovori ostanejo).

V čakalnici sta dve novi plošči:

- **Moji kvizi** - *Naloži* (zamenja trenutna vprašanja), *+* (doda k trenutnim),
  *Izvozi* (JSON datoteka na disk) in *Uvozi*. Izvoz deluje tudi tam, kjer strežnik
  nima trajnega diska.
- **Odigrane igre** - zgodovina večerov z zmagovalci, kemijo in nagradami.

Mapo določiš z `CKVIZ_DATA_DIR` (privzeto `./data`). Če vanjo ni mogoče pisati,
aplikacija deluje naprej brez shranjevanja in to pove v vmesniku.

---

## Zagon doma

```bash
npm install
npm start
```

Na računalniku, ki bo na mizi, odpri `http://localhost:3000/host.html`.
Na zaslonu se pokažeta **koda sobe** in **QR koda**; telefoni skenirajo QR ali odprejo
naslov, ki piše zraven (npr. `192.168.1.20:3000/p/ABCD`).

> Doma morajo biti telefoni in računalnik na **istem WiFi**. Aplikacija sama zazna
> naslov računalnika v omrežju.

Do **10 igralcev** na sobo (5 parov).

### Vprašanja od Clauda

Ključ dobiš v [Anthropic Console](https://console.anthropic.com/settings/keys):

```bash
cp .env.example .env      # in vanj vpiši svoj ključ
export ANTHROPIC_API_KEY=sk-ant-...
npm start
```

Brez ključa aplikacija deluje naprej in uporabi **vgrajen nabor 42 vprašanj**
v slovenščini - le da si tematike ne moreš izbrati sam.
Deluje tudi prijava prek Anthropic CLI (`ant auth login`).

---

## Postavitev na splet

Na spletu telefonom ni več treba biti na istem WiFi - vsak se poveže od koderkoli.
Strežnik sam ugotovi svoj javni naslov iz zahteve, tako da QR koda kaže pravo pot;
če je pred njim nenavaden proxy, naslov povozi z `PUBLIC_URL`.

> **Najprej nastavi `HOST_PASSWORD`.** Brez njega lahko kdorkoli, ki najde naslov,
> odpre velik zaslon in porabi tvoje kredite pri Claudu. Igralci gesla ne
> potrebujejo - njim zadošča koda sobe.

### Render (najlažje)

`render.yaml` je pripravljen za **brezplačni načrt**.

1. Na [render.com](https://render.com): **New → Blueprint** → izberi ta repozitorij.
2. Render prebere `render.yaml` in vpraša za `ANTHROPIC_API_KEY` in `HOST_PASSWORD`.
3. Velik zaslon je nato na `https://<ime>.onrender.com/host.html`.

Kaj pomeni brezplačni načrt v praksi:

- **Ni trajnega diska.** Shranjeni kvizi in zgodovina se ohranijo, dokler strežnik
  teče, ob ponovnem zagonu pa izginejo. Zato je nastavljen `CKVIZ_EPHEMERAL=1`,
  da vmesnik to jasno pove - kvize, ki jih želiš obdržati, shrani z *Izvozi*.
- **Uspavanje po ~15 minutah brez prometa.** Vsak odprt zavihek pošlje ping vsakih
  20 sekund, zato med igro ne uspava, tudi če pol ure nihče ne pritisne ničesar.
  Uspava le, če velik zaslon zapreš. Prvo prebujanje traja ~1 minuto, zato
  velik zaslon odpri nekaj minut pred začetkom.

Za trajno shranjevanje preklopi na plačljiv načrt (`plan: starter`) in odkomentiraj
razdelka `disk` in `CKVIZ_DATA_DIR` v `render.yaml` - navodila so v komentarju
datoteke.

### Fly.io (s pravim trajnim diskom)

```bash
fly launch --no-deploy --copy-config
fly volumes create ckviz_data --size 1
fly secrets set ANTHROPIC_API_KEY=sk-ant-... HOST_PASSWORD=nekaj-mocnega
fly deploy
```

`fly.toml` že priklopi disk na `/data` in vklopi samodejno ustavljanje strojev,
ko nihče ne igra.

### Docker (kjerkoli drugje)

```bash
docker build -t ckviz .
docker run -d --name ckviz -p 3000:3000 \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -e HOST_PASSWORD=nekaj-mocnega \
  -v ckviz-data:/data \
  ckviz
```

Imenovani nosilec `ckviz-data` poskrbi, da kvizi in zgodovina preživijo posodobitve.
Za javni naslov postavi predenj proxy s HTTPS (Caddy, nginx, Cloudflare Tunnel)
in mu podaj `PUBLIC_URL=https://tvoja-domena`.

---

## Kako poteka večer

1. **Priprava** (velik zaslon): vpišeš tematiko (`90. leta`, `potovanja`, `hrana`,
   `naša služba` ...), število vprašanj, zahtevnost, ton in katere načine želiš.
   Klikneš *Ustvari vprašanja* - Claude napiše krog v slovenščini. Vprašanja lahko
   pregledaš in katerokoli pobrišeš, z *Dodaj še* pa krog razširiš. Dober krog
   shrani z *Shrani ta kviz* in ga naslednjič naložiš v sekundi.
2. **Čakalnica**: igralci vstopijo, izberejo ime in znak, nato **na telefonu izbere
   vsak svoj par**. Ko se izbereta oba, sta v paru. Lahko tudi klikneš
   *Samodejno sestavi pare*.
3. **Igra**: vprašanje se pokaže na velikem zaslonu, telefoni odgovarjajo.
   Ko vsi zaklenejo, se odgovori razkrijejo sami.
4. **Razkritje**: razporeditev odgovorov, *Zrcalo parov*, pridobljene točke in
   lestvica. Igralci lahko s telefona pošljejo emoji reakcijo, ki zaplava čez
   velik zaslon.
5. **Konec**: stopničke, nagrade, Kemijomer, celoten pregled kroga - in zapis
   v *Odigrane igre*. *Nov krog (iste ekipe)* obdrži pare in ponastavi točke.

**Bližnjice na velikem zaslonu:** `preslednica` ali `→` - začni igro / razkrij
odgovore / naslednje vprašanje.

---

## Tehnično

- **Strežnik**: Node 20+, Express 5, `ws`. Stanje je v pomnilniku, na disk pa se
  zapisuje v JSON (atomarno, z združevanjem zapisov) - brez baze in brez namestitve.
  Soba se počisti po 6 urah neaktivnosti. Ob `SIGTERM`/`SIGINT` se vse zapiše na disk.
- **Odjemalec**: čisti ES-moduli, brez gradnje in brez ogrodij.
- **Claude**: `@anthropic-ai/sdk`, model `claude-opus-5` s strukturiranim izhodom
  (`output_config.format` z JSON shemo), tako da so vprašanja vedno v pravi obliki.
  Če varnostni klasifikator zahtevo zavrne, se samodejno poskusi z
  `claude-opus-4-8`; če tudi to ne uspe, se uporabi vgrajen nabor.
- **Ponovna povezava**: telefon si zapomni sejo, tako da zaklenjen zaslon, izgubljen
  WiFi ali ponovni zagon strežnika ne pomenijo izpada iz igre.

```
server.js              HTTP, WebSocket, usmerjanje ukazov, geslo voditelja
src/game.js            načini in točkovanje
src/rooms.js           stanje sobe, pari, statistika, nagrade, serializacija
src/storage.js         shranjevanje kvizov, zgodovine iger in živih sob
src/ai.js              generiranje vprašanj s Claudom
src/questionBank.js    vgrajen nabor vprašanj
public/host.html|js    velik zaslon
public/play.html|js    telefon
public/index.html      vstopna stran s kodo sobe
Dockerfile             produkcijska slika
render.yaml, fly.toml  pripravljeni načrti za postavitev
```

### Nastavitve okolja

| Spremenljivka | Privzeto | Pomen |
|---|---|---|
| `ANTHROPIC_API_KEY` | - | ključ za generiranje vprašanj |
| `HOST_PASSWORD` | - | geslo za velik zaslon; **nastavi ga na spletu** |
| `CKVIZ_DATA_DIR` | `./data` | mapa za kvize, zgodovino in žive sobe |
| `PUBLIC_URL` | samodejno | javni naslov za QR kodo, če ga strežnik ne zazna pravilno |
| `CKVIZ_EPHEMERAL` | - | `1`, kadar strežnik nima trajnega diska - vmesnik na to opozori |
| `PORT` | `3000` | vrata strežnika |
| `CKVIZ_MODEL` | `claude-opus-5` | model za pisanje vprašanj |
| `CKVIZ_FALLBACK_MODEL` | `claude-opus-4-8` | rezervni model ob zavrnitvi |
| `CKVIZ_EFFORT` | `medium` | koliko truda vloži model (`low`-`max`) |

Zdravstvena točka za ponudnike: `GET /healthz`.
