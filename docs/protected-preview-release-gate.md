# Vercel Preview -smoke: korkovertailu + inflaatio

## Varmennetut ympäristöt
- Team `team_zwsvoePoiBeskRuyl2Iar883`
- Project `prj_JiUhWEPHXlZoIK7bkInQviw7ma3E` (`rahavahti-preview`)
- Preview deployment `dpl_3MTZGtLwzGHL9bL6Kj1qDbjQ5EWu`
- Commit `60a959a2bba0f2b179f8cc121c1991862779e7b4`
- URL `https://rahavahti-preview-p76lnaerm-info-32533854s-projects.vercel.app`
- Deployment state READY; target preview, never production

## Estävä hyväksyntäportti
Vercel Authentication on käytössä. Tavalliset ulkoiset GET-pyynnöt palauttivat 302 Vercelin SSO-sivulle kaikille seuraaville reiteille:
`/`, `/korkovertailu`, `/inflaatio`, `/api/public-data/interest`, `/api/public-data/inflation`.
302 ei ole sovelluksen HTTP 200 -hyväksyntä. Älä poista SSO-suojausta eikä käytä `Force Promote` -toimintoa.

### Ensisijainen: jo kirjautuneen Vercel CLI:n autentikoitu smoke
Valtuutetussa kehitysympäristössä, jossa on samaan projektiin kirjautunut Vercel CLI:

```bash
vercel whoami
vercel curl 'https://rahavahti-preview-p76lnaerm-info-32533854s-projects.vercel.app/korkovertailu' -i
vercel curl 'https://rahavahti-preview-p76lnaerm-info-32533854s-projects.vercel.app/inflaatio' -i
vercel curl 'https://rahavahti-preview-p76lnaerm-info-32533854s-projects.vercel.app/api/public-data/interest' -i
vercel curl 'https://rahavahti-preview-p76lnaerm-info-32533854s-projects.vercel.app/api/public-data/inflation' -i
```

Varmista molempien HTML-vastausten HTTP 200, teksti ja CSP. Korko-API palauttaa `dataset=MFI_PUBL`, 2 havaintoa, sallittu `dataMode`; inflaatio-API palauttaa `table=15b5`, kelvolliset numeeriset arvot ja ajanjakson. Korko-API:n `static_fallback` sallitaan vain erikseen merkittynä, ei live-päivityksen todisteena. Inflaatio-API:n pitää toimia live-tilassa.

### Vaihtoehto: suojattu automaatiotesti
Tiedosto `tests/smoke/protected-preview.mjs` tekee SSO-vaihdon _vain_ varmennetulle Preview-originille, vastaanottaa istuntoevästeen ja testaa neljä reittiä. Se vaatii tarkistetun commit-tunnisteen ja hyväksytyn automaatiobypass-salaisuuden. Salaisuus on konfiguroitava suoraan suojattuun CI-ympäristöön; sitä ei lisätä PR-koodiin, lokiin tai keskusteluun. Käytä vain tarkastetun commitin luotettua CI-ajoympäristöä. Älä aja PR-haaran koodia salaisuutta käyttävässä automaatiossa ilman ennakkohyväksyntää.

## Main-haaran turvallisuus
- Erillisen Preview-projektin asetukset eivät todista, ettei main-haaran GitHub-push käynnistäisi tuotantoa toisessa projektissa.
- Ennen #7:n tai #8:n yhdistämistä vahvista kaikki repo-kytkennät, production branch, mahdolliset auto-domain assignment -asetukset ja Deployment Checks.
- PR #8 perustuu PR #7:n haaraan: yhdistämisjärjestys #7 -> main, sen jälkeen #8 -> main (päivitä tarvittaessa PR #8:n base).
- `FINANCE_WRITES_ENABLED` pidetään `false`. Oikean Neon Auth -istunnon henkilökohtaisten taloustietojen API-E2E on erillinen HOLD-portti.

Päätös: **HOLD** kunnes autentikoidun Preview-smoken HTTP 200 + JSON on todistettu ja päähaaran julkaisuautomaatio tarkistettu.
