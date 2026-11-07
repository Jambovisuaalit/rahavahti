# PR #2 – suojatun Previewn kahden käyttäjän E2E-testin suoritusportti

**Tilanne 07.11.2026: HOLD.** Testiskripti on valmis kehityshaaraan, mutta täyttä E2E-testiä ei ole suoritettu Vercelin SSO-suojatussa selaimessa. Älä merkitse skriptin olemassaoloa testin läpäisyksi.

## Tarkistetut lähtötiedot
- Vercel project: `rahavahti-preview` (`prj_JiUhWEPHXlZoIK7bkInQviw7ma3E`)
- Vercel Authentication: `enabled=true, deploymentType=all`
- Vercel Preview: `dpl_8sWQzCiUFqwyHE6JrdmmLK6uciip` (READY, target=preview/null)
- Neon project: `hidden-wave-87825800`
- Neon branch: `dev-secure-import`
- Neon Auth: Managed Better Auth käytössä haarassa
- Vercel Preview env: `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `FINANCE_WRITES_ENABLED`
- Nykyisen Previewn `FINANCE_WRITES_ENABLED=false`. Ei saa muuttaa yleisessä Previewssa ennen erillistä testijulkaisua.

## Automaattinen E2E-testiskripti
`tests/e2e/preview.spec.mjs`, komento `npm run test:e2e`.

Edellyttää:
1. **Aitoa, voimassa olevaa Vercel SSO -kirjautumista** varten Playwrightin `storageState`-tiedostoa paikallisessa salatussa testiympäristössä. Ei Vercel Authenticationin ohitusta eikä evästeen tallennusta GitHubiin.
2. Yksinomaan synteettisille testikäyttäjille tarkoitettua **erillistä suojattua kehitys-Previewta**, jossa `FINANCE_WRITES_ENABLED=true` testin ajaksi. Nykyinen yleinen Preview pidetään `false`.
3. Sovelluksen Preview-osoitetta Neon Authin sallittuna origin-osoitteena.
4. Yksinomaan synteettisiä testitilejä, satunnaisia testisähköposteja ja kuvitteellisia tapahtumia.
5. Testin jälkeen kirjoitusten poiskytkentää sekä testitietojen turvallista poistamista sovitun kehitysretention mukaisesti.

Pakolliset testikäynnistysarvot (ei git-salaisuuksia):
```bash
export E2E_BASE_URL=https://<suojatun-kehitys-previewn-osoite>.vercel.app
export E2E_VERCEL_STORAGE_STATE=/turvallinen/polku/sso-storage-state.json
export E2E_SYNTHETIC_WRITES_APPROVED=true
npm run test:e2e
```

Testi sulkeutuu virheeseen, jos SSO-tiedosto tai kirjoitusten erillinen hyväksyntä puuttuu.

## Hyväksymiskriteerit
- A ja B rekisteröityvät kirjautumisen kautta eri istuntoihin (sähköposti, salasana).
- Istunto säilyy sivun uudelleenlatauksen jälkeen.
- Molemmat saavat omat testitilinsä; kummankaan tilitunniste ei näy toiselle.
- A:n kahden tapahtuman CSV tuodaan onnistuneesti: 2 riviä.
- Uusintatuonti palauttaa `already_imported`, tapahtumia yhä 2.
- B:n A:lle kuuluvan tilin tapahtumien luku ja tuontiyritys palauttavat `404`.
- Ristiriitaisen CSV:n tuonti palauttaa `409` ja tapahtumia säilyy 2.
- Virheellinen päivämäärä palauttaa `422`.
- B saa tuoda saman pankin ulkoisen tunnisteen **omalle** tililleen.
- Uloskirjautunut käyttäjä ei saa `200` suojattuun tilirajapintaan.
- Audit-lokissa on vain oikeasti hyväksyttyjen tuontierien merkinnät; tietojen eristys todetaan myös audit-lokin osalta.
- Virheelliseen erään perustuva todella *kesken transaktion tapahtuva* rollback testataan erikseen tietokannan virhetilanteella. Pelkkä pre-validointi ennen kirjoituksia ei riitä tämän kriteerin täyttämiseen.

## Hyväksyntä ei vielä täyty
- Kahden todellisen selainistunnon Auth-signup/login/logout: **EI SUORITETTU**
- Suojatun Previewn `/api/import` kirjoitukset ja uusintavastaukset: **EI SUORITETTU**
- API-käyttöoikeuden negatiiviset testit: **EI SUORITETTU**
- Neon RLS / FK / duplikaattirajoitukset kahdella Auth-käyttäjätunnisteella suoraan tietokannassa: **LÄPÄISTY aiemmissa testeissä**
- Sovelluksen CI 22 yksikkötestiä + build: aiemmin läpäisty, uusin commit vahvistetaan CI:n jälkeen

**Ei tuotantojulkaisua, ei oikeita henkilökohtaisia taloustietoja, ei PR #2 -mergeä ennen E2E-näyttöä.**
