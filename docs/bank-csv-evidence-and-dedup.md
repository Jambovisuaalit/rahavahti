# Pankkien CSV-vientimuotojen näyttörekisteri ja kaksoiskappaletarkistus

Päiväys: 07.11.2026. **HOLD – vain synteettinen data.**

## Pankkikohtainen lähdenäyttö

| Pankki | Vientimahdollisuus | Tarkka henkilöasiakkaan CSV-skeema | Lähde |
|---|---|---|---|
| Nordea | Virallinen ohje vahvistaa CSV-painikkeen henkilöasiakkaan verkkopankin Tilit ja tapahtumat -osiossa | **Ei vahvistettu** (otsikot, erotin, merkistö, summa ja päivämääräkentät) | https://www.nordea.fi/henkiloasiakkaat/tuki/usein-kysyttya-verkkopalveluista.html |
| OP | Historiallinen virallinen verkkopankkiohje kuvaa CSV-muotoisen tiedoston | **Ei vahvistettu** eikä historiallisen ohjeen ajantasaisuutta vahvistettu | https://www.op.fi/legacy-corp/sivu/yrpo/khp/ohjeet.htm |
| Danske Bank | Virallinen henkilöasiakkaan tilioteohje löytyi, ei todennettua CSV-vientisopimusta | **Ei vahvistettu** | https://danskebank.fi/sinulle/asiakaspalvelu/tilit/tiliote |
| S-Pankki | Tilitietojen ja tiliotteen saatavuus verkkopankissa dokumentoitu, CSV-vientimuoto ei | **Ei vahvistettu** | https://dokumentit.s-pankki.fi/tiedostot/s-pankki-paivittaisten-palveluiden-ehdot-fi |

**Johtopäätös:** yhtäkään pankkikohtaista adapteria ei voida hyväksyä ilman pankin nykyisestä vientimuodosta varmennettua, henkilötiedotonta, rakenteeltaan edustavaa testi-CSV:tä. Nykyinen valinta näyttää vain näyttörekisterin tilan, ei muuta yleistä CSV-parseria.

## Kaksoiskappaleiden tarkistus (vain nykyinen tuontierä)

1. Rivien ehdokasavain on valitun **synteettisen tilitunnisteen**, kirjauspäivän, täsmällisen senttimäärän ja normalisoidun kuvauksen yhdistelmä.
2. Tämä on **epävarma osuma**, ei todistettu kaksoiskappale. Kaksi eri ostosta voi olla samanlaisia.
3. Mahdolliset kaksoiskappaleet näytetään lähderiveineen. **Mitään ei poisteta automaattisesti.**
4. Käyttäjä voi erikseen merkitä poistettavat testirivit, ja hänen tulee kuitata katselmus ennen hyväksyntäpainikkeen avautumista.
5. Tarkistus koskee **vain saman latauksen rivejä**. Se ei vertaa aiemmin ladattuja CSV-tiedostoja, koska järjestelmässä ei ole pysyvää tallennusta.
6. Mahdollinen ulkoisen tapahtumatunnisteen tarkistus on moduulissa valmiina, mutta **nykyinen CSV-käyttöliittymä ei vielä kartoita pankin uniikkia tapahtumatunnusta**. Siksi mitään osumaa ei markkinoida varmana.
7. Usean pankkitilin yhdistämistä tai tilisiirtojen kaksinkertaista talouslaskentaa ei ole toteutettu. Käytä vain synteettistä yhden tilin testisyötettä.

## Hyväksyntäkriteerit ennen pankkikohtaista formaattitukea

- Varmennettu lähde, formaattiversio ja päivityspäivä
- Sarakkeiden, summan etumerkkien, valuutan, rivikatkojen ja merkistön testit
- Identiteettien (tili/tapahtuma), mahdollisten varausten ja toteutuneiden tapahtumien ero
- Duplikaattien väärien positiivisten ja väärien negatiivisten osumien testaus, mahdollisuuksien mukaan ainutkertaiset tunnisteet
- Henkilötietojen käsittely ja tuotantojulkaisu ovat edelleen **HOLD**.
