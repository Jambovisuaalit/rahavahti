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
