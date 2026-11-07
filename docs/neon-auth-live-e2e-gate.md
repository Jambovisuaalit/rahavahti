# Neon Auth + kahden käyttäjän palvelinpuolinen eristys – hyväksyntäportti

Päiväys: 07.11.2026 · **PR #5 on DRAFT · tuotanto HOLD · vain synteettinen aineisto**

## Varmennettu Neon-ympäristö

- Projekti: `rahavahti` (`hidden-wave-87825800`).
- Neon Auth (Better Auth) on käytössä vain kehityshaarassa `dev-secure-import` (`br-bitter-night-b9s431w7`). Projektin oletushaarassa `main` Auth ei ole käytössä.
- Tarkistuksen hetkellä kehityshaarassa oli neljä Auth-käyttäjätietuetta mutta **0 istuntotietuetta**. Emme saaneet kahta toimivaa kirjautumisistuntoa tätä porttia varten.
- Eristystestit tehtiin **erillisessä Neon-testitietokantahaarassa** `qa-auth-rls-20261107` (`br-royal-lake-b9zbxcrk`), joka on haarautettu kehityshaarasta. Testien vuoksi ei muutettu dev- tai main-tietokantaa.

## Todennetut RLS-negatiiviset testit oikeassa Neon PostgreSQL:ssä

Testausrooli: `rahavahti_app_dev` (`rolbypassrls=false`).

Kuvitteelliset käyttäjät: `rahavahti-qa-A-20261107` ja `rahavahti-qa-B-20261107`. Kummallekin luotiin oma synteettinen `finance.accounts`-tili, `finance.import_batches`-tuontierä ja `finance.transactions`-tapahtuma.

| Testi | Tulos |
|---|---|
| A:n ja B:n SELECT: oma tili näkyy, vieras ei | PASS |
| A:n ja B:n SELECT: oma tapahtuma näkyy, vieras ei | PASS |
| A:n ja B:n SELECT: oma import-erä näkyy | PASS |
| A:n ja B:n UPDATE: vieraan tili tai tapahtuma | 0 muuttunutta riviä |
| INSERT vieraan omistajatunnisteella A:n tenant-kontekstissa | PostgreSQL estää, SQLSTATE 42501 |
| Ilman `app.user_id`-tenant-kontekstia | 0 näkyvää synteettistä tiliä |

Testaus todentaa **tietokannan RLS-rajauksen annetulla sovellusroolilla**. Se **ei** todista, että oikea kirjautumiscookie identifioisi käyttäjän tai että Vercelin yhteys käyttäisi samaa rajoitettua PostgreSQL-roolia.

## Riskit ja tuotannon kiellot

1. `rahavahti_owner`-tietokantaroolilla on `rolbypassrls=true`. Käynnissä olevan sovelluspalvelimen `DATABASE_URL`-rooli on todennettava riippumattomasti; owner-yhteydellä tehty testi **ei** kelpaa eristyksen hyväksyntään.
2. `finance`-tauluissa RLS on päällä, mutta tavallisten tilien ja tapahtumien osalta `FORCE ROW LEVEL SECURITY` ei ole päällä. Vain `rahavahti_app_dev`-tyyppinen rajoitettu sovellusrooli hyväksytään testaamiseen.
3. Tenant-raja riippuu `app.user_id`-sessionmuuttujasta, jonka luotettu palvelin asettaa kirjautumisistunnon perusteella. Tätä ei saa ottaa selainpyynnön `x-user-id`-headerista eikä muusta asiakkaan hallitsemasta kentästä.
4. Neon Auth -kirjautumista ei varmennettu päästä päähän, sillä kehityshaaran testitunnusten salasanoja ja ajantasaista, PR #5:ttä vastaavaa, eristettyä QA-deploymentia ei ollut käytettävissä. Vercelin aiemmin READY-tilassa ollut preview perustui aikaisempaan `main`-committiin, eikä sitä käytetty korvikkeena.
5. Älä kopioi oikeita pankki-, velka- tai henkilötietoja QA-haaraan. Uusia tuotantokäyttäjiä ei luotu, eikä sovelluksen tallennusporttia avattu.

## Aito HTTP-istunto- ja eristyshyväksyntä – valmis käsikirjoitus, ei vielä suoritettu

Lisätty manuaalisesti ajettava, fail-closed workflow `.github/workflows/neon-auth-live-e2e.yml`, joka suorittaa `scripts/verify-neon-auth-live-e2e.mjs`-testin. Testi epäonnistuu, jos yksikin pakollinen salaisuus tai fixture puuttuu.

GitHub-environment `rahavahti-qa` tarvitsee seuraavat, **vain testikäyttöön** tarkoitetut salaisuudet:

- `RAHAVAHTI_QA_BASE_URL` — PR #5:n eristetty HTTPS-preview, kytketty turvalliseen Neon Auth -testiympäristöön ja QA-tietokantaan.
- `RAHAVAHTI_QA_USER_A_EMAIL`, `RAHAVAHTI_QA_USER_A_PASSWORD`; vastaavat `RAHAVAHTI_QA_USER_B_EMAIL`, `RAHAVAHTI_QA_USER_B_PASSWORD`.
- `RAHAVAHTI_QA_USER_A_ACCOUNT_ID` ja `RAHAVAHTI_QA_USER_B_ACCOUNT_ID`, jotka vastaavat **todellisten testikirjautumisten Neon Auth -user.id** -tunnisteilla luotuja yksilöllisiä, synteettisiä tilitietueita.

HTTP-testi vaatii: anonyymilta ei pääsyä `/api/accounts`; molemmilla oikea sähköposti/salasana-kirjautuminen ja erillinen session cookie; `/api/auth/get-session` palauttaa eri käyttäjätunnisteet; omat tilit ja tapahtumat näkyvät; toisen tilin haku estyy 404:llä myös väärennetyillä identiteettiheadereilla; `POST /api/accounts` palauttaa HOLD 423; CSP nonce säilyy.

**Hyväksyntä vaatii dokumentoidun live-workflow SUCCESS -ajon ja erillisen riippumattoman verifioinnin, että preview käyttää ei-bypass PostgreSQL-roolia.**

## Lopullinen päätös

- Oikean Neon PostgreSQL:n RLS-testi kahdella synteettisellä tenantilla: **PASS**.
- Oikean Neon Auth -istunnon / HTTP GET / palvelimen `app.user_id` / PostgreSQL RLS -ketju: **EI VIELÄ VARMENNETTU**.
- Tuotannon henkilötietojen käsittely, pysyvä tallennus ja PR-merge: **HOLD**.
