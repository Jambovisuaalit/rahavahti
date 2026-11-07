# Rahavahti – hyväksyntäportit

**Julkaisu: HOLD. Tämä on kokeellinen lähdekoodiversio, ei tuotantopalvelu.**

| Portti | Tila | Puuttuva varmennus |
| --- | --- | --- |
| G0 Dokumentaatio | OSITTAIN | Tarkka jäljitettävyys kaikkiin v1.0-vaatimuksiin |
| G1 Tietoturva | HOLD | Auth, Supabase RLS:n negatiiviset testit, auditointi |
| G2 CSV-tallennus | HOLD | Atominen import, deduplikointi, idempotenssi ja virhepalautus |
| G3 Talousauditointi | OSITTAIN | Kattavat 30/60/90 päivän integraatio- ja hyväksymistestit |
| G4 Viranomaisdata | HOLD | Todelliset API-vastaukset, lähde ja päivitysaika |
| G5 Tuotanto | HOLD | Tietosuojatarkistus, päästä-päähän-testit, julkaisuportin hyväksyntä |

## Turvallinen käsittely
- Älä syötä tunnistettavia pankkitapahtumia, henkilötunnuksia tai pankkitietoja.
- CSV-tiedosto käsitellään tässä versiossa vain selaimen muistissa.
- Pysyvä tallennus ja operaattorin asiakaspääsy ovat tarkoituksella pois käytöstä.
- Älä lisää oikeita tunnuksia tai .env-tiedostoja GitHubiin.
- Julkinen lähdekoodi ei tarkoita julkista henkilötietorekisteriä.

## Seuraavaksi
1. Kehitä auth/RLS ja kahden identiteetin negatiiviset tietoturvatestit.
2. Toteuta CSV-mappaus sekä transaktiopohjainen ja idempotentti tallennus.
3. Varmista laskentamalli ja poikkeuspolut testein.
4. Lisää vain varmennetut julkiset viranomaisrajapinnat.
5. Julkaise ensin suojattu Preview; tuotanto pidetään estettynä.
