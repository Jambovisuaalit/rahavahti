# Rahavahti – tietosuojan hyväksyntäaineisto (LUONNOS / HOLD)
Päiväys 07.11.2026 · tila EI HYVÄKSYTTY

## Rekisterin ja käsittelyn rajaus
Tämä lähdekoodi sisältää luotonantajaluettelon ja syntetisoidun CSV-esikatselun. Tämän kehitysvaiheen tarkoitus on validoida toiminnallisuus ilman oikeita henkilötietoja. Selaimessa näkyvään tiedoston valintaan liittyy edelleen riski, että käyttäjä lataa vahingossa oikean aineiston; pelkkä varoitusteksti ei ole tekninen kielto.

## Rekisterinpitäjän päätettävät asiat
- Virallinen rekisterinpitäjän nimi, Y-tunnus, yhteystiedot ja tietosuojayhteys: **PUUTTUU**.
- Tietojen käyttötarkoitus ja käsittelyperuste toimintokohtaisesti (esim. käyttäjätili, CSV-esikatselu, analyysi, tukipalvelu): **PUUTTUU**.
- Käsiteltävät henkilötietoryhmät ja välttämättömyysperustelu; huomiot taloudellisen aseman arkaluonteisuuteen: **PUUTTUU**.
- Rekisteröityjen oikeuksien toteutus, poistot, tietojen siirrettävyys sekä yhteydenottokanava: **PUUTTUU**.
- Tietojen säilytysajat ja poistumisen varmistaminen; varmuuskopiot, lokit ja tukipyynnöt: **PUUTTUU**.
- Käsittelijöiden, alikäsittelijöiden, säilytysalueiden ja mahdollisten EU/ETA-siirtojen selvitys: **PUUTTUU**.
- Tarvittaessa GDPR 35 artiklan mukainen tietosuojan vaikutustenarviointi (DPIA) tai kirjattu perusteltu arvio siitä, miksei DPIA ole tarpeen: **PUUTTUU**.
- Turvaloukkausten havaitseminen, reagointi ja ilmoitusmenettely: **PUUTTUU**.

## Todennettu nykyinen tekninen rajoitus
- Pysyvä luottotietotallennus estetty; yksityisen luottotieto-API:n GET/POST/PUT/PATCH/DELETE vastaavat 403.
- Käyttäjätunnistus/sessiohallinta: **EI TOTEUTETTU**. Palvelinpuolinen autentikoitu tietojenkäsittely ei ole käytössä.
- Synteettiset RLS-testit suoritetaan eristetyssä CI-PostgreSQL:ssä; ne eivät osoita minkään Supabase-tuotantoprojektin turvallisuutta.
- Ei varmennettua Rahavahti-Supabase-projektia tai Rahavahti-Vercel-julkaisua; mitään eri projektien tietoja ei saa yhdistää.

## Ennen rekisterinpitäjän hyväksyntää
1. Yksilöi Rahavahdin oma testiprojekti, autentikointipalvelun asetukset ja todelliset ympäristöt.
2. Toteuta tunnistautuminen, sessiokeksien turvallisuus, tokenin tarkistus palvelimella ja peruutus-/uloskirjautumismenettely.
3. Tee todelliset kahden testitilin CRUD-eristystestit, estotestit sekä tietosuojadatan lifecycle-testit hyväksytyssä testiprojektissa.
4. Tuota ja hyväksy julkinen tietosuojailmoitus vastaamaan todettua palvelun toimintaa.
5. Mittaa vastausotsakkeet, verkkopyynnöt, evästeet, analytiikka sekä lokitus oikeasta tuotantoon rinnastuvasta domainista.

## Päätös
HOLD. Tämä ei ole oikeudellinen lausunto eikä GDPR-vaatimusten täyttymistä osoittava lopullinen hyväksyntä.
