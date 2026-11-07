# Hyväksymistesti 2026-11-07 – Neon-käyttäjäeristys ja CSV-transaktiot

**Portin tila: HOLD (osittain todennettu).** Ainoastaan synteettisiä käyttäjiä ja tapahtumia. Ei henkilökohtaisia pankki- tai tunnistetietoja.

## Testiympäristö
- Neon project: `hidden-wave-87825800`
- Branch: `dev-secure-import` (ei main)
- Tietokanta: `rahavahti`
- Sovellusrooli: `rahavahti_app_dev`, ei tietokannan omistaja
- Kaksi Neon Authissa luotua testikäyttäjää:
  - A: `b2835102-a640-4f44-a742-11fba0f28f5a`
  - B: `f2da91c4-7e3e-499c-9956-75f78e304fa0`
- Vercel Preview deployment: `dpl_8sWQzCiUFqwyHE6JrdmmLK6uciip` (READY)
- Vercel SSO: `all`
- `FINANCE_WRITES_ENABLED=false`

## Todennetut tietokantakokeet
1. A: luotiin synteettinen tili, tuontierä ja 2 tapahtumaa. Lukutesti: 1 tili, 2 tapahtumaa, yhteensä -1149 senttiä. **PASS**.
2. B: `SELECT` A:n tileihin, tapahtumiin ja tuontieriin. Tulokset 0/0/0. **PASS**.
3. B: yritys lisätä tuontierä A:n tilille. PostgreSQL `23503` (tenant-avaimen yhdistelmäviite). **PASS**.
4. A: sama pankin tapahtumatunniste uudestaan `ON CONFLICT DO NOTHING`. Tapahtumien määrä säilyi kahdessa. **PASS**.
5. A: yhdessä tietokantatransaktiossa validin testirivin jälkeen virheellinen kaksoistapahtuma. PostgreSQL `23505`, rollback, keskeneräisiä rivejä 0; alkuperäiset kaksi säilyivät. **PASS**.
6. Erillinen aiempi koe: väärän `user_id`-omistuksen INSERT estyi RLS-politiikkaan, SQLSTATE `42501`. **PASS**.

## Mitä EI ole todennettu
- Neon Authin käyttäjien kirjautuminen selaimella: sign-up, sign-in, sign-out, session restoration.
- Kahden *aidosti erillisen kirjautuneen* Neon Auth -istunnon käyttäjäeristys Next.js-palvelimen ja HTTP-rajapintojen yli.
- `POST /api/import` -vastaukset ja uusintatuonnin `already_imported`-polku.
- Virheellisen CSV:n HTTP 422/409 ja atominen rollback palvelinrajapinnan kautta.
- Turvallisen testikäytön rajattu aikaväli, lokiseuranta, tietosuojan hyväksyntä ja tuotantojulkaisun hyväksyntä.

Suojattu Vercel Preview esti automatisoidun ulkoisen HTTP-selainkokeen. Neon Authin `create_auth_user` luo käyttäjän mutta ei anna testissä hyödynnettävää salasanaa tai selainistuntoa. **Älä tulkitse tietokantatestiä kirjautumistestiksi.**

### Seuraava P0-toimi
Aja suojatussa Previewssa kaksi erillistä kehitystestitiliä läpi kirjautumisen, aseta kirjoituskytkin vain erilliseen lyhytaikaiseen testikontekstiin, testaa `POST /api/accounts` sekä `POST /api/import` molemmilla istunnoilla, varmista 401/403/404/409/422, idempotentti vastaus, rollback ja audit-loki. Palauta kirjoitukset lukkoon ja dokumentoi vastausten HTTP-koodit, aikaleimat sekä rivimäärät. Ei oikeita tietoja.

**PR #2: Draft / HOLD. Ei mergeä eikä tuotantojulkaisua.**
