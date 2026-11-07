# Rahavahti – kuluttajaluoton korko- ja kustannusvertailu (synteettinen)

Päiväys 07.11.2026 · **HOLD** · Ei oikeiden luottotietojen käsittelyä.

## Lainsäädäntöviitteet

- KSL 7 luku 17 a §, muutos 449/2023: 1.10.2023 alkaen lain soveltamisalaan kuuluvassa kuluttajaluotossa **sopimuksen nimelliskorko** saa olla enintään korkolain 12 §:n mukainen viitekorko + 15 prosenttiyksikköä, kuitenkin enintään 20 %.
  Lähde: https://finlex.fi/fi/lainsaadanto/saadoskokoelma/2023/449
- Suomen Pankki: korkolain 12 § viitekorko **2,5 % 01.07.–31.12.2026**. Tästä seuraa tässä ajanjaksossa **nimelliskorkokatto 17,5 %**.
  Lähde: https://www.suomenpankki.fi/fi/ajankohtaista/lehdistotiedotteet-ja-uutiset/tiedotteet/2026/korkolain-mukainen-viitekorko-ja-viivastyskorot-1.7.31.12.2026/
- Muille luottokustannuksille (ml. sopimuksen avaus- ja tilinhoitomaksut) on erillinen enimmäismäärä: **0,01 %/päivä** lainasummasta tai luottorajasta, vähintään 30 päivän luotoissa mahdollinen **5 € poikkeus**, ja **150 €/vuosi** enimmäismäärä. Yksityiskohtaiset sopimusehdot ratkaisevat.
  Lähde: https://www.kkv.fi/kuluttaja-asiat/tietoa-ja-ohjeita-yrityksille/kuluttaja-asiamiehen-linjaukset/kuluttajaluottojen-tarjoaminen/
- **Todellinen vuosikorko: voimassa oleva laskenta-asetus on 1123/2016 (kumosi asetuksen 824/2010 01.01.2017). Liitteen I perusyhtälö sallii 12 samanpituista kuukautta vuodessa.** Lähde: https://finlex.fi/fi/lainsaadanto/2016/1123
- **17,5 % ei ole todellisen vuosikoron katto.** Todellinen vuosikorko huomioi korot, avausmaksun, tilinhoitomaksut ja lyhennysaikataulun. Virallinen laskentatapa, oletukset ja rajaustilanteet määräytyvät erillisellä sääntelyllä.
- Ennen 01.10.2023 tehtyihin sopimuksiin, jatkuvien luottojen uusiin nostoihin, asunto-omaisuuteen liittyviin luottoihin ja muihin erityissopimuksiin voi soveltua erilainen sääntely. Lisäksi 20.11.2026 voimaan tulevat lakimuutokset edellyttävät myöhempää tarkistusta. Tämän toteutuksen lakitesti ei anna näihin PASS-päätelmää.

## Laskentamalli

1. Vain **yksi kerralla nostettava, kiinteäkorkoinen, kuukausittain lyhennettävä annuiteettilaina**, laina-aika 1–120 kuukautta.
2. Nostettava nimellispääoma euroina. Avausmaksu oletetaan maksettavaksi heti noston yhteydessä, eli laskennallinen nettokäteen jäävä summa on pääoma miinus avausmaksu.
3. Kuukausikorot lasketaan jäljellä olevalle pääomalle **nimelliskorko / 12** ja pyöristetään lähimpään senttiin. Viimeinen maksuerä kuittaa jäljellä olevan pääoman.
4. Tilinhoitomaksu lisätään jokaiseen kuukausierään.
5. Arvioitu todellinen vuosikorko saadaan diskonttaamalla maksuerät nostopäivään, eksponentti perustuu asetuksen 1123/2016 liitteen I sallimiin **samanpituisiin kuukausiin n/12 vuotta**, ja ratkaisemalla vuosikorko binäärihaulla.
6. Näytetään maksetut korot, muut kustannukset, kuukausierä ja kokonaiskulut euroina sekä kahden vaihtoehdon ero.

**Rajoitukset:** Ei korkomarginaalien muutoksia, päivätarkan lainakoron kertymän mallia, todellisen pankin eräpäiväsääntöjä, tililuoton korkojaksoja, vakuutuksia, muita pakollisia palvelukuluja, valuuttakursseja, nostopalkkioita eikä sopimuksen erityisehtoja. Näytetty vuosikorko on **arvio**, ei luotonantajan lakisääteinen ilmoitus.

## Lakitestin rajaus

- Lähtötilanne: 01.07.–31.12.2026 solmittu, tavanomainen KSL 7 luvun 17 a §:n soveltamisalaan kuuluva uusi kuluttajaluotto.
- Nimelliskorko <= 17,5 %: läpäisee **vain nimelliskorkorajan alustavan seulonnan**.
- Kulurajat: tarkistetaan laskennallisten muiden kulujen koko laina-ajan päiväkohtainen katto sekä kunkin 12 kk jakson 150 €:n katto. Tämä on **konservatiivinen alustava arvio**, ei lopullinen sopimusoikeudellinen vahvistus.
- Koko sopimuksen lainmukaisuutta ei saa merkitä varmistetuksi pelkän laskurin läpäisyn perusteella. Lakitestin tulokset ovat PRELIMINARY_PASS, EXCEEDS tai NOT_ASSESSED.

## Tuotantoportit

- Riippumaton vertailu virallisen todellisen vuosikoron kaavan mukaisiin vertailuesimerkkeihin.
- Soveltamisala- ja luottotyyppikohtainen täydellinen sääntömalli (muun muassa sopimuksen alkamisajankohta, päivät, pakolliset muut kulut).
- Todellisten lainaehtojen syöttö ja raportointi vain tietosuoja-, auth/RLS-, laskentavalidointi- ja käyttöönottoportin jälkeen.
- **HOLD:** PR draft; ei henkilötietoja; ei tuotantojulkaisua.

## Riippumaton vertailulaskenta 07.11.2026

Erillisellä Python/SciPy brentq -menetelmällä laskettu kassavirtojen NPV-yhtälö, kuukausijaksot n/12; tuloksia käytetään Node-regressioiden odotusarvoina (arvot eivät ole viranomaishyväksyntä):

| Synteettinen tarjous | Arvioitu todellinen vuosikorko | Kokonaisluottokustannukset |
|---|---:|---:|
| 2 000 €, 10 % nimelliskorko, 24 kk, ei muita kuluja | 10,4710328277 % | 214,95 € |
| 2 000 €, 9 % nimelliskorko, 24 kk, 25 € avaus, 3 €/kk | 14,3809703251 % | 289,90 € |
| 2 000 €, 0 % nimelliskorko, 12 kk, ei muita kuluja | 0 % | 0 € |

Pankin todellisen sopimusehtojen ilmoittaman vuosikoron tarkistus on edelleen erillinen hyväksyntäportti. Asetuksen muut oletukset ja erikoistilanteet eivät ole vielä toteutettu.
