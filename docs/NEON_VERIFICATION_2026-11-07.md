# Neon Auth + talouden tietomalli – kehityksen varmennus

Päivä: 07.11.2026. PR #2 on luonnos. Päähaaraan ei ole yhdistetty muutoksia.

## Neon-ympäristöt
- Projekti: `hidden-wave-87825800`, `aws-eu-central-1`, PostgreSQL 17.
- `main`: ei muutoksia tämän toteutusvaiheen SQL-migraatioista.
- `dev-secure-import`: schema `finance` ja kuusi taloustaulua.
- Neon Managed Better Auth provisionoitu **vain** haaralle `dev-secure-import`.
- `rahavahti_app_dev`: vain `finance`-skeeman read/write, ei superuser.

## Tietoturvan malli
1. Next.js:n palvelin lukee Neon Auth -istunnon ja asettaa käyttäjä-ID:n.
2. Kaikki tietokantakyselyt suoritetaan vähäoikeuksisella sovellusroolilla.
3. Transaktio alkaa `BEGIN`-komennolla, minkä jälkeen `set_config('app.user_id', id, true)` asettaa vain kyseisen transaktion käyttäjäkontekstin.
4. RLS rajaa kaikkien kuuden taulun rivit samaan käyttäjään.
5. CSV-tuonnissa tarkistetaan tilin omistus, CSV-rakenne, pankin yksilöivä tunniste, ristiriidat ja tiedoston SHA-256. Koko erä käsitellään yhdessä transaktiossa.
6. `FINANCE_WRITES_ENABLED` on pois päältä ellei sitä nimenomaisesti aseteta `true`. Tuotannossa arvo pysyy `false`, kunnes G1/G2 hyväksytään.
7. `DATABASE_URL` tulee rajata `rahavahti_app_dev`-rooliin kehityksessä; älä käytä tietokannan omistajaroolia sovelluksessa.

## Suoritetut Neon-tietokantatestit (synteettinen aineisto)
- Taulut: 6/6 olemassa.
- RLS: 6/6 taulussa politiikka.
- Kirjaus käyttäjä B:n user_id:llä käyttäjä A:n kontekstissa: estetty, SQLSTATE 42501.
- Käyttäjä B:n SELECT käyttäjä A:n testitiliin: 0 riviä.
- Sama pankin tapahtumatunniste samalle tilille: estetty, SQLSTATE 23505.
- Hylätyn tapahtumatransaktion jälkeen: 0 testitiliä ja 0 tapahtumaa.

## Hyväksymättä
- Authin rekisteröityminen, kirjautuminen, uloskirjautuminen ja istunnon palautuminen oikealla selaimella.
- Vercelin Preview-ympäristön salaisuuksien turvallinen kytkentä ja liikenteen suojaus.
- Kahden oikean testikäyttäjän Auth→Next.js→PostgreSQL-päästä päähän -testi.
- CSV POST -rajapinnan integraatiotesti oikean istunnon kautta, idempotenssi ja rollback API-kerroksella.
- Oikeiden pankki-CSV-muotojen tunnistus ja hyväksyntä ilman henkilötietojen paljastamista.
- Turvallisuus-, tietosuoja- ja tuotantohyväksyntä.

**Päätös: HOLD.** Älä käytä henkilökohtaisia taloustietoja, älä yhdistä PR:ää päähaaraan tai aktivoi tallennusta ennen hyväksymisportteja.
