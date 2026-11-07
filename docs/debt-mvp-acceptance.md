# Tietovahti MVP 1–2: hyväksyntäportit (HOLD)

Kohde: Neon-projekti `rahavahti`, haara `dev-secure-import`. Käytä vain synteettisiä velkatietoja. Tämä suunnitelma ei ole tuotannon hyväksyntä.

## Portti G1: identiteetti ja tietokantatason eristys
1. Tarkista kaksi erillistä oikeaa Neon Auth -istuntoa käyttäjille A ja B sekä istunnon vanheneminen. `neon_auth.user`-rivi yksin ei todista toimivaa istuntoa.
2. Tietokantayhteyden on oltava oma LOGIN-rooli ilman `BYPASSRLS`-oikeutta ja ilman taulun omistajuutta. Älä käytä `rahavahti_owner`-roolia.
3. Suorita `tests/e2e/debt-rls.integration.test.mjs` todellisella vähäoikeuksisella DB-yhteydellä. Testi luo synteettiset A/B-velat, tarkistaa ristiinlukemisen ja -muokkauksen estot, audit-insertin ja rollbackin.
4. Suorita erikseen API-tason testit A/B-istuntoevästeillä: `GET/PATCH/DELETE /api/debts/:id` vieraalla id:llä -> 404; ilman istuntoa -> 401. Testaa myös väärennetyt, vanhentuneet ja puuttuvat evästeet. Pelkkä tietokanta-RLS-testi ei riitä.
5. Audit-kirjauksen pitäisi tapahtua samassa transaktiossa onnistuneen muutoksen kanssa. Varmenna pysyvä kirjaus erillisellä tarkastusoikeudella ja epäonnistuneiden operaatioiden tapahtumapolitiikka; QA-sovellusrooli ei saa muokata eikä poistaa lokia.

Ajo:
```bash
QA_DEBTS_DATABASE_URL="postgresql://..." \
QA_AUTH_USER_A_ID="4f2bf302-540e-4552-a9b6-845f835aa993" \
QA_AUTH_USER_B_ID="81679c8b-b693-4e46-a443-ea0e6e5cf27c" \
node --test tests/e2e/debt-rls.integration.test.mjs
```
Älä koskaan commitoi tunnuksia tai salaisuuksia. Älä aja testiä tuotannossa.

## Portti G2: velkojen CRUD ja CSV
- Käytä istunnosta johdettua käyttäjätunnistetta; älä hyväksy `owner_id`-kenttää asiakkaalta.
- Testaa luonti, listaus, muutos, poisto, validoinnit, rajoitukset ja saman pyynnön uusinta.
- CSV: esikatselu ensin; vahvista import idempotentiksi, atomiseksi ja duplikaatteja estäväksi. Estä CSV-formulainjektio vientitiedostoissa. Pysyvä tuonti pysyy 503/HOLD kunnes hyväksytty.

## Portti G3: deterministinen maksusuunnitelma
- Korko ja kulut kuukausitasolla, senttitarkkuus, lyhennysten kohdistus, minimi-erät, velattomuusraja.
- Vertaa vyörytystä ja lumipalloa samoilla syötteillä. Jos maksubudjetti ei riitä vähimmäismaksuihin, älä tuota maksulupausta.
- Testaa nollakorko, nollasaldo, erittäin korkea korko, nouseva saldo, kulut ja korkojen pyöristys.

## Portti G4: 10 käyttäjän testaus
- Vain anonymisoitu tai täysin kuvitteellinen aineisto ennen tuotantohyväksyntää.
- Mittaa: tehtävän suoritusaste >= 90 %, aika ensimmäiseen suunnitelmaan < 5 min, käyttöoikeustestit 100 %.
- Kerää virhetilanteet, palaute ja käytettävyyshavainnot. Älä tallenna oikeita velkoja ennen G1–G3 hyväksyntää.

Päätös: HOLD, kunnes kaikki tuotantotallennuksen edellyttämät portit on todistettu.
