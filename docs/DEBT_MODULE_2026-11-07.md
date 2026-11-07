# Rahavahti – Velat ja Ostoauditointi (kehitysspesifikaatio)

## Toiminnallisuudet
1. **Tarjousten kululaskuri:** lainapääoma, nimelliskorko %, laina-aika, avausmaksu ja tilinhoitomaksu. Laskee kuukausittaisen tasalyhennyksestä poikkeavan tasaerän (annuiteetti), lopullisen maksetun koron, muut kulut ja diskontattuihin kuukausieriin perustuvan **arvioidun todellisen vuosikoron**. Tarkka pankin ilmoittama todellinen vuosikorko voi erota todellisten maksupäivien ja erityisehtojen takia.
2. **Lakisääteinen alustava tarkistus:** KSL 7:17a:n nimelliskoron katto `min(20 %,15 prosenttiyksikköä + korkolain viitekorko)`. Suomen Pankin viitekorko 1.7.–31.12.2026 on 2,5 %, joten vertailukatto on 17,5 %. Muut luottokustannukset: lainan määrän perusteella päivittäinen 0,01 % -periaate, vähintään 30 päiväksi sovitun luoton 5 € -poikkeus ja 150 € vuosikatto. Tämän työkalun kulutarkistus on **vain suuntaa-antava**, koska täsmällinen päiväkohtainen kulujaksotus, sopimuksen soveltuvuus ja poikkeukset eivät ole tiedossa. Ei automaattista lainvastaisuuspäätelmää.
3. **Velkojen maksujärjestys:** simuloi vähimmäiserät, tilinhoitokulut, kuukausikorot ja ylimääräisten suoritusten jakamisen. Lumipallo = pienin saldo ensin; vyörytys = korkein korko ensin. Jos maksuvara ei riitä minimeihin, laskelma ilmoittaa sen; yli 600 kuukauden mallintamattomia loppuja ei näytetä maksettuina.
4. **Yhdistelylaskuri:** yhteenlaskettu pääoma, mahdolliset vanhojen luottojen kuittauskulut, uusi annuiteettilaina avaus- ja kuukausikuluineen. Vertailee nykyisen vyörytyssuunnitelman odotettuja korko- ja muita kuluja uuteen lainaan. Näyttää maksuaikojen ja kuukausierien erot. Lainansaanti ei ole taattu.
5. **Ostoauditointi:** julkisessa demoesikatselussa on erillinen velkojen eräkenttä, joka vähentää 30 päivän kassavirtaa. Älä laske velkojen erää kahdesti muiden menojen kanssa.

## Tietoturva ja tuotannon portti
- Käyttöliittymä /dashboard/velat on Neon Auth -istunnon suojaama.
- Moduuli ei kirjoita velkatietoja tietokantaan, evästeisiin tai selaimen pysyvään tallennukseen.
- Alkuarvot ovat **kuvitteellisia demoarvoja**.
- Ei tarjoushakuja lainanantajien järjestelmistä, eikä positiivisen luottotietorekisterin tietoja.
- Ei oikeita taloustietoja ennen Neon Auth -E2E:n, RLS:n ja CSV-API-integraation hyväksyntää.
- Tässä PR:ssa ei ole tietokantamigraatioita eikä Vercel-julkaisua.

## Rajaukset ja parannettavat
- Koron laskennan oletetaan pysyvän kuukausittain vakiona; muuttuvan koron skenaariot puuttuvat.
- Tarkka todellinen vuosikorko edellyttää todellisia maksupäiviä, luoton nostopäiviä ja kaikkia pakollisia palvelukuluja.
- Esinevakuudelliset luotot, vanhat sopimukset ja lain mukaiset soveltamisalan poikkeukset on arvioitava erikseen.
- Muun kuin tilinhoitokulun vuotuinen jakautuminen ja mahdolliset jatkokulut edellyttävät sopimuksen ehtojen tarkastusta.
- Takaisinmaksun kuukausimalli ei sisällä perintäkuluja, veroseuraamuksia tai korkoviitteiden muutoksia.
- Vertailtavia tarjouksia kannattaa vertailla samalle luottosummalle ja takaisinmaksuajalle; eri ehtoisia luottoja ei pidä tulkita samanarvoisiksi.
- Ei lainan hakemista, automatisoitua maksuohjelmaa tai sitovia taloussuosituksia.

## Lähteet (tarkistettu 7.11.2026)
- Suomen Pankki: https://www.suomenpankki.fi/fi/ajankohtaista/lehdistotiedotteet-ja-uutiset/tiedotteet/2026/korkolain-mukainen-viitekorko-ja-viivastyskorot-1.7.31.12.2026/
- Finlex, kuluttajansuojalaki 7:17a: https://www.finlex.fi/fi/lainsaadanto/1978/38
- KKV, kuluttajaluottojen tarjoaminen: https://www.kkv.fi/kuluttaja-asiat/tietoa-ja-ohjeita-yrityksille/kuluttaja-asiamiehen-linjaukset/kuluttajaluottojen-tarjoaminen/
- KKV, luoton hinta: https://www.kkv.fi/kuluttaja-asiat/luotot-ja-maksaminen/luotot/luoton-hinta/

**Julkaisupäätös: HOLD.** PR #3 kohdistuu vain keskeneräiseen kehityshaaraan.
