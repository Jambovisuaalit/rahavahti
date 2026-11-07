# Rahavahti – kolmen maksustrategian synteettinen velkasuunnitelma

Päiväys: 07.11.2026. **HOLD:** ei todellisia henkilö- tai luottotietoja, ei pysyvää tallennusta, ei tuotantojulkaisua.

## Vaiheet
1. **Datan keruu:** kuukausittaiset nettotulot, välttämättömät kiinteät elinkustannukset, käytettävissä olevat tilivarat, puskurin turvaraja sekä kullekin velalle jäljellä oleva pääoma, nimelliskorko, vähimmäiskuukausierä ja tilinhoitomaksu.
2. **Kustannukset:** lyhennyksen korko = jäljellä oleva pääoma × nimelliskorko / 12; kiinteä tilinhoitomaksu lisätään. Senttipyöristys tehdään kuukausittain. Jo perittyjä avausmaksuja **ei** veloiteta uudelleen. Alkuperäistä luottosopimuksen todellista vuosikorkoa ei ole mahdollista laskea tarkasti pelkän nykyisen pääoman ja kuukausierän perusteella. Jäljellä olevasta simuloidusta kassavirrasta lasketaan erikseen *jäljellä olevan maksuajan efektiivisen vuosikoron arvio*. Se ei ole sopimuksen alkuperäinen virallinen APR.
3. **Kolme strategiaa:** nykytila maksaa vain sopimuksen vähimmäiserät; vyörytys käyttää mahdollisen kuukausittaisen ylijäämän korkeimman nimelliskoron velkaan; lumipallo käyttää ylijäämän pienimmän jäljellä olevan saldon velkaan.
4. **Puskuririskit:** lähtöpuskuri on oltava turvarajan yläpuolella. Kussakin kuukaudessa lasketaan nettotulot miinus välttämättömät kulut ja velanhoito. Mitään ylimääräistä lyhennystä ei tehdä puskurin alle. Jos vähimmäismaksu, korko tai kulut estävät lyhentymisen tai puskurin säilymisen, ennuste on keskeytettävä selkeällä syyllä.
5. **Selkokielinen yhteenveto:** säästö lasketaan vain, kun sekä nykytilan että valitun strategian simulaatiot päätyvät velattomuuteen. Velattomuus esitetään kuukausitarkkuudella. Tiedon puuttuessa ei näytetä keksittyä säästöä tai velattomuuspäivää.

## Laskennan oletukset ja riskit
- Kiinteä nimelliskorko, pysyvät nettotulot ja menot sekä samat kuukausittaiset vähimmäiserät. Ei uudelleenrahoitusta tai velkojen yhdistelyä.
- Kaikki saatavilla olevat velkatiedot oletetaan täydellisiksi. Näin ei voi olettaa todellisten henkilöiden kohdalla ilman pankki- ja sopimustietojen varmistamista.
- Malli laskee kuukausitason kassavirtatilanteen, **ei eräpäiväkohtaista tiliotteen päivittäistä saldoa**. Päiväkohtainen puskuri ja perintäriskit vaativat myöhemmän laskentamallin.
- Maksuhäiriöitä, perintätoimiston menettelyä, luoton korkomuutoksia, maksuviiveitä, sopimusten ennenaikaisen takaisinmaksun erikoisehtoja tai uusien maksujen syntyä ei mallinneta.
- Nykytilan ja kiihdytetyn maksun vertailu olettaa, että käytettävissä oleva kuukausittainen ylijäämä voidaan tosiasiallisesti käyttää lisälyhennyksiin.
- Jos kaikkien velkojen takaisinmaksu ei onnistu enintään 360 kuukaudessa, tila on TIMEOUT eikä tulevaisuuden säästöjä arvioida.

## Testiaineisto
Kuvitteellinen esimerkki: nettotulot 2 400 €/kk, elinkustannukset 1 400 €/kk, alkusaldo 800 €, turvapuskuri 500 €, velat 1 800 € / 16 % / 90 €/kk / 3 € kuukausimaksu, 5 500 € / 7 % / 150 €/kk / 2 € kuukausimaksu ja 500 € / 9 % / 40 €/kk / 0 €. Kaikki tiedot ovat keksittyjä eikä niillä saa tehdä henkilökohtaisia luottopäätöksiä.

## Hyväksyntäportit
- Synteettisen moduulin laskenta- ja reunatapaustestit, selkeät virheilmoitukset sekä mobiilin Playwright-testit.
- Riippumaton matemaattinen vertailu sekä päiväkohtainen puskurianalyysi ennen oikean käyttäjän käyttöä.
- Neon Auth / käyttäjäeristys, tietosuojakäytännöt, todelliset luottosopimustiedot ja tuotannon tietoturva: **HOLD**.
