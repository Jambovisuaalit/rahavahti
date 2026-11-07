# Turva- ja tietosuojaportti G1/G5 – 07.11.2026

## Rajaus
Tämä kehityshaara on JULKAISU-HOLD. Oikeiden luottotietojen käsittelyä, tallennusta, henkilökohtaista käyttäjätiliä tai operaattorin puolesta-asiointia ei ole hyväksytty.

## Käsittelyn nykytila
- CSV luetaan selaimen File API:lla synteettisenä testiaineistona; React-komponentin muistissa näytetään rivejä. Sivun päivitys nollaa nykyisen esikatselun.
- Luotonantajaluettelo on käyttäjän toimittama julkinen lähtölista, ei vahvistettu virallinen tietolähde.
- Henkilötietojen käsittelyperuste, rekisterinpitäjä, henkilötietojen käsittelijät, säilytysajat, poistopyynnöt, tietosuojailmoitus ja vaikutustenarvioinnin tarve edellyttävät erillistä hyväksyntää ennen käyttöönottoa.
- Tuotannossa ei ole varmennettua käyttäjän autentikointia, Supabase RLS -tietokantaeristystä tai operaattorin valtuutusmallia. Selainkontekstien E2E-eristystesti **ei ole** vastine palvelinpuolen käyttäjäeristystestille.
- Autentikointia vaativaa tallennusrajapintaa ei nykyisessä esikatselussa ole: suojaus toteutetaan estämällä tallennus kokonaan, ei esittämällä puuttuvaa autentikointia hyväksyttynä.

## Toteutettu turvatestaus
- Playwright Chromium: synteettisen CSV:n sisältö ei saa päätyä HTTP-pyyntöihin; tietojen pitää hävitä reloadissa; toisen selainkontekstin tulee pysyä erillisenä; tallennuspainike pysyy disabled.
- HTTP-otsaketarkastus paikallisesti käynnistettyä Next.js-palvelinta vasten: X-Content-Type-Options, Referrer-Policy, X-Frame-Options, Permissions-Policy, COOP/CORP, Cache-Control no-store, X-Robots-Tag sekä CSP Report-Only.
- Enforced CSP puuttuu tarkoituksella, koska App Routerin inline-hydraatioskriptit vaativat erikseen varmennetun nonce/hash-toteutuksen. Report-Only ei estä suoritusta.
- Todellisen julkaisuympäristön response-otsakkeita, välimuistia, kolmannen osapuolen skriptejä, telemetriaa tai tietovuotoja ei ole näillä testeillä vielä varmennettu.

## Julkaisun estävät ehdot
1. G1: varmennettu autentikointi, sessioturva ja pääsynhallintatestaus (myös unauthenticated ja eri käyttäjän data).
2. G1: RLS-taulukoiden testit kahdella erillisellä synteettisellä käyttäjällä sekä palvelinpuoleinen pakotettu käyttäjäeristys, jos tallentaminen lisätään.
3. G5: enforce-CSP nonce/hash-ratkaisu testattu; testi myös tuotanto-URL:n oikeista HTTP-otsakkeista.
4. G5: dokumentoitu käsittelyperuste, käyttäjäinformointi, rekisterinpitäjä, käsittelijät, retention/deletion ja arvio DPIA-tarpeesta.
5. G5: penetraatio-/uhkamallinnustarkistus ja toteutetut loki-/telemetriarajoitukset; auditoitu tietojen elinkaari.
6. Käytetään vain synteettistä dataa, kunnes kaikki hyväksynnät on vahvistettu.

## Päätös
**HOLD**, riippumatta CI:n onnistumisesta. Mitään henkilötietojen käsittelyä tai tuotantojulkaisua ei hyväksytä tämän dokumentin perusteella.
