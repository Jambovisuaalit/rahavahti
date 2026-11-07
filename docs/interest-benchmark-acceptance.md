# Suomen Pankin korkovertailu – hyväksyntäportti

## Valmistunut
- Suomen Pankin julkisen raportin syyskuun 2026 kotitalouksien uusien kulutusluottojen sopimuskorko 5,86 % ja todellinen vuosikorko 8,22 % tallennettu lähdeviitteen ja havaintokuukauden kanssa.
- Eri korkomittareiden sekoittaminen ja väärän velkatyypin vertailu estetty.
- Julkinen read-only endpoint `GET /api/public-data/interest` palauttaa vain staattisesti varmennetun tilastohavainnon, ei kenenkään henkilökohtaisia tietoja.
- Erilliset yksikkötestit mukana.

## Avoinna: Timeseries API v4 -liveintegraatio
- Varmista `MFI_PUBL`-datasetin juuri sopimuskorkoa ja APR:ää tarkoittavat aikasarjatunnukset API-metadatasta.
- Varmista GET observations -URL ja JSON-skeema oikealla HTTP-vastauksella.
- Lisää lähdekohtainen adapteri, syötevalidointi, päivityksen atomisuus, aikaleimat ja fail-closed stale-tietojen käsittely.
- Vertaa viimeisin arvo riippumattomaan viralliseen tilastotaulukkoon sekä yksikköön (%), havaintokuukauteen ja käsitteeseen (uusien sopimusten korko vs lainakannan korko).
- Älä näytä vanhaa snapshotia tuoreena; päivitä vain varmennetusta rajapinnasta.

## Tärkeä käyttäjärajaus
Vertailu sopii vain samaan luottotyyppiin ja korkomittariin. Yksittäisen käyttäjän korkoero ei merkitse oikeutta saada uutta lainaa. Henkilökohtaiset velat ovat edelleen HOLD, kunnes Neon Auth/API/RLS-E2E on hyväksytty.

## Seuraava prioriteetti
Tilastokeskuksen inflaatiomoduuli vasta korkosarjan varmennuksen jälkeen.


## Päivitys 7.11.2026 – Live API varmennettu
- `GET https://api.boffsaopendata.fi/v4/datasets` palautti HTTP 200.
- Aikasarjaluettelo: `GET /v4/series/MFI_PUBL?pageNumber=1&pageSize=200`; yhteensä 1382 sarjaa tarkistushetkellä. `pageNumber` on oikea sivutusparametri.
- Sopimuskorko, kotitalouksien uudet kulutusluottosopimukset: `M.A.1.C.A2A.A.A.U2.2250.ZZ.EUR.C.ANR.0.A.0.A.0`.
- Todellinen vuosikorko, kotitalouksien uudet kulutusluottosopimukset: `M.B.2.C.A2A.A.A.U2.2251.ZZ.EUR.C.ANR.0.A.0.A.0`.
- Havaintojen osoite: `GET /v4/observations/MFI_PUBL?seriesName=<URL-encoded series>`.
- Molemmat palauttivat HTTP 200. Syyskuun 2026 raakaarvot 5.85993403234024 % ja 8.219787358538891 %; kahden desimaalin tarkkuudella 5,86 % / 8,22 %.
- Live-adapteri ja testit lisätty. Rajapinta ilmoittaa erikseen `live_api_verified` tai `static_fallback`. Varmennettuun staattiseen havaintoon palataan vain selvästi merkittynä.
- Erillinen `Public interest benchmark unit checks` -GitHub Actions -työnkulku oli vihreä commitilla `3bacdd6dde6d8cd806a7522436fd252ba89b5a48`.
- Projektin pää-CI:n `npm audit --omit=dev --audit-level=high` on edelleen pakollinen. Ennen mergeä on korjattava Neon Auth/Better Auth -riippuvuuksien haavoittuvuudet ja varmennettava build sekä E2E.
