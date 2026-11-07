# Luottotietotuonnin tietoturvatarkastus – 07.11.2026

Kohde: PR #1, `feat/creditor-directory-local-import`. Tarkastus koskee luettuja repo-tiedostoja; ei ole penetraatiotesti tai tietosuoja-arvio.

## Varmennetut tekniset tulokset
- GitHub Actions run 42352390093, commit 1b037846ef1670a3eeb33f385cd88f749f29b12d: success.
- `npm test`: 19 testiä, 19 läpi, 0 virhettä.
- `npm run build`: Next.js compiled successfully.
- Uudessa luotonantajasivussa ei ole API-kutsuja tai tietokantakirjoituksia; tiedosto luetaan File API:n avulla selaimessa ja esitetään Reactin tekstinä.
- Tallenna-painike on poistettu käytöstä. Käyttöliittymä kieltää aidot henkilötiedot.
- Ei ole näyttöä siitä, että koko sovelluksen telemetria, selainlaajennukset tai hosting-ympäristö olisi auditoitu. Siksi ei saa väittää absoluuttista tietovuodottomuutta.

## Havainnot ja portit
| ID | Vakavuus | Havainto | Vaadittu korjaus/todiste |
|---|---|---|---|
| SEC-01 | HIGH | Oikeita luottotietoja ei eroteta synteettisestä datasta teknisesti; käyttäjä voi valita aidon CSV:n varoituksesta huolimatta. | Tuotantoon ei julkaista tiedostotuontia ennen G1/G5-tarkastusta; testaa vain keksityllä aineistolla. |
| SEC-02 | MEDIUM | Rivijäsennin pilkkoo rivinvaihdot ennen CSV-lainausmerkkien tulkintaa; moniriviset lainatut kentät eivät toimi. | Toteuta RFC 4180 -yhteensopiva jäsennys tai rajaa syötemuoto dokumentoidusti; lisää regressiotestit. |
| SEC-03 | MEDIUM | Tuonti vaatii mukautetun CSV-skeeman eikä lue suoraan virallista positiivisen luottotietorekisterin raporttia. | Ota käyttöön erillinen, lähdekohtaisesti vahvistettu mapperi; älä markkinoi virallisen raportin automaattisena tuontina. |
| SEC-04 | MEDIUM | Puuttuu riippuvuuksien haavoittuvuusskannaus, runtime CSP- ja turvaotsaketarkastus sekä telemetriapolitiikan varmennus. | Lisää `npm audit --omit=dev`, testaa vastauksen otsakkeet ja varmista ettei CSV-data päädy lokeihin. |
| SEC-05 | MEDIUM | Autentikointi, käyttäjäeristys, salattu pysyvä tallennus, poistomenettely ja audit-loki eivät ole toteutettuina. | Säilytä G1/G2/G5 HOLD; arvioi ennen mitään oikeiden henkilökohtaisten taloustietojen käsittelyä. |
| SEC-06 | LOW | Tiedostojen pituus-, arvo- ja tyyppitarkistuksia on, mutta fuzz-, selain- ja epänormaalin syötteen testikattavuus on rajallinen. | Lisää testit mm. kaksinkertaisille lainausmerkeille, CSV-injektiolle vientitilanteessa ja virheellisille UTF-8-tiedostoille. |

## Päätös
**HOLD** – CI/BUILD PASS, mutta luottotietojen todellinen käsittely ja tuotanto edelleen estetty.

## Ehdot seuraavan vaiheen aloittamiseen
1. Korjaa SEC-02 ja vahvista skeeman rajaus SEC-03.
2. Toimita SEC-04/SEC-06 skannaus- ja regressiotulokset.
3. Säilytä tuotantoon ja oikeaan dataan liittyvät G1/G2/G5-estot riippumatta siitä, aloitetaanko maksukykymallin kehitys vain synteettisellä datalla.
