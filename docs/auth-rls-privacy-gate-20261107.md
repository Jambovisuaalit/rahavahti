# G1/G2/G5 – autentikoinnin, käyttäjäeristyksen ja tietosuojan tarkastus 07.11.2026

**Päätös: HOLD.** Ei oikeiden talous- tai luottotietojen tallennusta, ei tuotantohyvääksyntää.

## Tarkastettu toteutus

- GitHub PR #1 commit `8c4db8eb50b412b45821b6bdd4be50784602aadd` (tarkastushetki). `@neondatabase/auth` on lisätty; `app/api/auth/[...path]/route.ts` delegoi Neon Auth -handlerille. `lib/auth/server.ts` lukee auth-URL:n ja evästeen allekirjoitussalaisuuden palvelinympäristöstä. **Ei todennettu käyttäjän kirjautumista / session validointia oikealla HTTP-kutsulla.**
- `app/api/private/credit-records/route.ts`: GET/POST/PUT/PATCH/DELETE palauttavat aina 403 `CREDIT_RECORD_ACCESS_DISABLED` ja `Cache-Control: no-store`. Tämä on oikea väliaikainen fail-closed-toteutus, ei valmis käyttäjäkohtainen API.
- `lib/db.ts` antaa palvelimelle `pg` Pool-yhteyden käyttäen `DATABASE_URL`-tunnusta. Ennen rahoitusdatan CRUD:n avaamista pitää varmistaa, että tuotantoyhteys on vähimmän oikeuden **ei-BYPASSRLS** sovellusrooli; tietokannan omistaja/valvojatunnus ei kelpaa. API:n käyttäjätunnus johdettava *palvelimella validoidusta sessiosta*, ei pyynnön x-user-id/header/body-parametrista.
- Suurin osa `finance`-RLS-politiikoista vertaa `user_id`-arvoa PostgreSQL:n `current_setting('app.user_id',true)`-kontekstiin. Transaktiorajattu `SET LOCAL` / `set_config(...,true)` vaaditaan palvelimella validoidulla identiteetillä. Ei todisteita siitä, että valittu sovellusrooli tai oikea route jo tekee tämän.
- RLS:n läpäissyt CI-testi on synteettinen erillinen testitaulu, **ei oikean Neon Auth -session ja Rahavahti-API:n kahden käyttäjän E2E-testi.**

## Neonin read-only-havainnot, QA-haara

Neon project `hidden-wave-87825800` (`rahavahti`), branch `br-royal-lake-b9zbxcrk` (`qa-auth-rls-20261107`). **Ei tehty SQL-kirjoituksia, migraatioita, käyttäjäluonteja tai konfiguraatiomuutoksia.**

- Neon Auth: `better_auth` integroitu. Konfiguraatiossa `allow_localhost=true`; email/password käytössä, signup sallittu, `require_email_verification=false`, `revoke_sessions_on_password_reset=false`. Nämä ovat **QA:n havaintoja**, jotka vaativat erillisen tuotantokonfiguraation ja kontrolliarvioinnin.
- Kaikissa kahdeksassa `finance`-taulussa `relrowsecurity=true`. **Kuudessa kahdeksasta** `relforcerowsecurity=false` (accounts, audit_events, budgets, debts, import_batches, transactions). Joissakin muissa tauluissa RLS on pakotettu. Omistaja- ja BYPASSRLS-roolin oikeudet on erikseen tarkistettava.
- `rahavahti_app_dev`: `rolbypassrls=false`, `rolcanlogin=true`. `rahavahti_owner`: `rolbypassrls=true`, `rolcanlogin=true`. **BYPASSRLS-roolia ei saa käyttää käyttäjäkohtaisissa sovelluspyynnöissä.**
- RLS-politiikat `finance.user_debts_v2` ja `finance.debt_audit_events_v2` käyttävät kontekstia `app.current_user_id`, kun vanhemmat taulut käyttävät `app.user_id`. Eri kontekstiavainten tarkoitus ja vahvistettu session konteksti selvitettävä.
- `finance.debt_audit_events_v2` -taulussa `rahavahti_app_dev`-roolilla on myös UPDATE- ja DELETE-oikeudet. Auditoitavuuden säilyttämiseksi nämä oikeudet on poistettava ennen mahdollista käyttöönottoa; RLS-policyrajaus ja append-only-menettely on testattava erikseen.
- `finance.user_debts_v2` ja `finance.debt_audit_events_v2` -politiikat ovat `TO PUBLIC`, joten rajaus perustuu lisäksi tauluoikeuksiin ja identiteettikontekstiin. Tarkistettava jokainen mahdollinen sovellusrooli ja sessiokontekstin asettamistapa.

## Pysäyttävä CI-havainto

GitHub Actions (push `42364286171`, SHA `8c4db8eb50b412b45821b6bdd4be50784602aadd`) **FAIL** kohdassa `npm audit --omit=dev --audit-level=high`. `npm audit` raportoi **10 haavoittuvuutta (6 low, 3 high, 1 critical)**. Tunnistettu ketju: `@neondatabase/auth` → `better-auth` / `@better-auth/drizzle-adapter`, lisäksi `deepmerge` ja `zod`. Muita testivaiheita ei ajettu tämän epäonnistuneen jobin jälkeen; vanhojen vihreiden CI-ajojen tulos ei koske nykyistä SHA:ta. **Älä ohita audit-porttia.** Korjaa riippuvuudet hallitusti ja varmista SDK-yhteensopivuus.

## Hyväksyntäkriteerit (kaikki vaaditaan)

1. **G1 / Auth:** kaksi synteettistä Neon Auth -testitiliä kirjautuvat sisään, sessio tarkistetaan palvelimella, uloskirjautuminen ja session peruuttaminen katkaisevat pääsyn; evästeet Secure/HttpOnly/SameSite todetaan oikeasta testiympäristöstä.
2. **G2 / Eristys:** omalla vähäoikeuksisella sovellusroolilla A näkee vain A:n rivit, B vain B:n. Todenna erikseen SELECT/INSERT/UPDATE/DELETE, toisen omistajan ID:n arvaus, suorat HTTP-tunnisteväärennökset, session puute ja transaction-pool-yhteyden kontekstivuoto.
3. **G2 / DB:** auditoi kaikki `finance`-taulut, erityisesti kahden kontekstiavaimen käyttö, rooliperiytyminen, tauluoikeudet, `FORCE RLS`, audit-event-taulujen kirjoitussuoja sekä huolehdi `BYPASSRLS`-roolin pysymisestä erossa sovelluspyynnöistä.
4. **G5 / Privacy:** rekisterinpitäjä ja GDPR-perusteet, tietovirrat, käsittelijät ja siirrot, tietosuojailmoitus, säilytys-/poistoprosessi, varmuuskopiot, lokien minimointi, DPIA-tarpeen päätös, tietopyyntöjen ja loukkausten menettelyt.
5. **CI:** `npm audit` high/critical nolla, `npm test` PASS, PostgreSQL RLS PASS, Next.js build PASS, Playwright PASS **samalla viimeisimmällä SHA:lla**. Oikea Auth+API+DB -E2E-ajo erikseen ennen G1/G2-hyväksyntää.

**Ei hyväksytty:** oikeiden tietojen tuonti, tallennuksen aktivointi, PR-merge tai tuotantokäyttöönotto. Kaikki tähänastiset identiteetti- ja tietokantatarkistukset ovat konfiguraation tai SQL-metadatan read-only-tarkistuksia.
