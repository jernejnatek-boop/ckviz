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
| ✍️ **Z besedami** | Ni možnosti za izbiro - oba **napišeta svoj odgovor**. Claude nato presodi, ali sta mislila isto, tudi če sta zapisala drugače. | do 200 po odstotku ujemanja pomena |

### Dve ravni stave

- **Igralec** pri vsakem vprašanju posebej izbere svoj **vložek** x1, x2 ali x3
  (pri načinih Znanje in Več pravilnih). Večji vložek pomnoži dobiček, ob zgrešitvi
  pa odnese točke - zato je vsako vprašanje svoja mala odločitev.
- **Voditelj** pri vsakem vprašanju posebej nastavi, **koliko je vredno**: x1, x2 ali x3.
  Gumbi so ob vsakem vprašanju v seznamu med pripravo. Ta množitelj velja za vse
  igralce in se pomnoži z igralčevim vložkom.

Stikalo **Vroči krog 🔥** samo prednastavi x2 na zadnjih 20 % vprašanj, da je do konca
vse odprto. Kar nastaviš ročno, ostane - tudi če vprašanja kasneje brišeš ali dodajaš.

### Odgovori s svojimi besedami

Pri načinu **Z besedami** ni možnosti za izbiro: vsak na telefon napiše svoj odgovor,
nato pa Claude oceni, koliko sta partnerja v resnici mislila isto - *"na morje"* in
*"nekam, kjer je toplo in je voda"* sta isti odgovor, čeprav nimata skupne besede.
Iz ocene (0-100 %) se izračunajo točke, na zaslonu pa se pokažeta oba odgovora drug ob
drugem, odstotek ujemanja in kratka pripomba.

Ker pisanje traja dlje od izbiranja, imata **oba časa svojo nastavitev**: *Čas: izbirna*
(privzeto 30 s) in *Čas: opisna* (privzeto 75 s). Med presojo je na obeh zaslonih
vmesni prikaz, da ni videti, kot da se je igra ustavila.

Brez ključa za Claude ta način še vedno deluje, a ujemanje oceni preprost izračun
ujemanja besed in črk - to je na zaslonu tudi označeno.

### Nagrade večera

Na koncu velik zaslon pokaže stopničke, **Kemijomer**, pregled vprašanje za vprašanjem
in nagrade, ki se podelijo le, kadar si jih je kdo res prislužil:

| | | |
|---|---|---|
| 👑 **Krona večera** | največ točk | 🎯 **Ostri um** | najboljše razmerje med hitrostjo in pravilnostjo |
| 💘 **Najboljši poznavalec** | največ uganjenih odgovorov partnerja | ⚡ **Najhitrejši prst** | najkrajši povprečni čas |
| 🧠 **Hodeča enciklopedija** | največ pravilnih odgovorov | 🎲 **Največji hazarder** | najvišji povprečni vložek |
| 💥 **Kamikaza** | največ zgrešenih vložkov x3 | 🧊 **Mirna roka** | vložki x3 brez enega samega zgrešenega |
| 🐺 **Črna ovca** | največkrat edini s svojim odgovorom | 🕰️ **Zadnji hip** | največ odgovorov tik pred iztekom |
| 📈 **Vzpon večera** | največ pridobljenih mest | 🧿 **Telepatija** | najvišje ujemanje pri opisnem odgovoru |
| ✍️ **Pisatelj** | najdaljši opisni odgovori | 🔗 **Najbolj usklajena** | par z največ kemije |
| 🌗 **Dva svetova** | par z najmanj kemije | 🪞 **Enosmerna ulica** | eden pozna drugega precej bolje kot obratno |

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

**Večji krogi:** en sam klic za 50 vprašanj jih zanesljivo vrne manj, zato se krog
razdeli na sklope po 12, ki tečejo hkrati (velikost nastavi `CKVIZ_BATCH`).
Podvojena vprašanja med sklopi odpadejo, morebitni manko pa se dopolni z dodatnimi
klici - med generiranjem gumb kaže napredek (`Claude piše ... 24/50`). Če kakšen
sklop ne uspe, ostali vseeno prispevajo svoja vprašanja.

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
   `naša služba` ...), število vprašanj (3-60), zahtevnost, ton in katere načine želiš.
   Klikneš *Ustvari vprašanja* - Claude napiše krog v slovenščini. Vprašanja lahko
   pregledaš in katerokoli pobrišeš, z *Dodaj še* pa krog razširiš. Dober krog
   shrani z *Shrani ta kviz* in ga naslednjič naložiš v sekundi.
2. **Čakalnica**: igralci vstopijo, izberejo ime in enega od **36 znakov**, nato
   **na telefonu izbere vsak svoj par** - izbira je vzajemna, potrditi morata oba.

   Na voljo je 36 znakov (živali), brez imen - znak stoji ob imenu igralca in
   ga pove že sam. Vsak igralec dobi svojega; če dva izbereta istega, strežnik
   drugemu dodeli prvega prostega.

   Pare lahko urejaš tudi z velikega zaslona: **klikni dva igralca in ju povežeš**,
   **💔** razdruži par, **✕** odstrani igralca iz sobe, gumba *Samodejno sestavi pare*
   in *Razdruži vse* pa poskrbita za hitro ponastavitev. Pare je mogoče spreminjati
   samo pred začetkom igre.

   Kdor ostane brez para, vseeno igra: pri Znanju in Več pravilnih dobi 1,4-kratni
   pribitek, ne more pa napovedovati partnerja ali loviti ujemanja.
3. **Igra**: vprašanje se pokaže na velikem zaslonu, telefoni odgovarjajo.
   Ko vsi zaklenejo, se odgovori razkrijejo sami.
4. **Razkritje**: razporeditev odgovorov, *Zrcalo parov*, pridobljene točke in
   lestvica. Igralci lahko s telefona pošljejo emoji reakcijo, ki zaplava čez
   velik zaslon.

   Ko so odgovori razkriti, teče **odštevanje do naslednjega vprašanja**
   (privzeto 15 s, nastavljivo 0-120). Nikomur ni treba paziti na tipkovnico -
   igra teče sama. Odštevanje vidijo tudi igralci na telefonu (*"naprej čez 8 s"*).
   Nastavitev **0 pomeni ročno**: rezultati stojijo, dokler ne pritisneš naprej.

   Ker se ne igra vedno na hitro, je tu **pavza**: s **preslednico** ali gumbom
   *⏸ Pavza* odštevanje zamrzne, dokler ga ne odtaješ. Pavza je mogoča samo na
   rezultatih - sredi vprašanja ne, da nihče ne pridobi časa za razmislek - in jo
   lahko v pripravi tudi prepoveš. Med pavzo to piše na velikem zaslonu in na
   vseh telefonih.
5. **Konec**: stopničke, nagrade, Kemijomer, celoten pregled kroga - in zapis
   v *Odigrane igre*. *Nov krog (iste ekipe)* obdrži pare in ponastavi točke.

**Bližnjice na velikem zaslonu:**

| | |
|---|---|
| `preslednica` | v čakalnici začne igro, med vprašanjem razkrije odgovore, **na rezultatih zaustavi ali nadaljuje odštevanje** |
| `→` | isto, le da na rezultatih vedno pelje na naslednje vprašanje |

Kadar pavza ni dovoljena, preslednica na rezultatih pelje naprej, tako kot prej.

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
src/avatars.js         seznam znakov + preverba, da se noben ne ponovi
public/js/avatars.js   enotna velikost in poravnava znakov
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
| `CKVIZ_EFFORT` | `high` | koliko truda vloži model (`low`-`max`) |
| `CKVIZ_BATCH` | `12` | koliko vprašanj zahtevamo v enem klicu pri večjih krogih |
| `CKVIZ_JUDGE_MODEL` | isti kot `CKVIZ_MODEL` | model za presojo opisnih odgovorov |
| `CKVIZ_JUDGE_EFFORT` | `low` | presoja teče sredi igre, zato hitro |

Zdravstvena točka za ponudnike: `GET /healthz`.
