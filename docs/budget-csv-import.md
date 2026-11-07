# CSV-budjettilaskennan testiportti (synteettinen aineisto)

## Tuettu nykyinen formaatti
- Yleinen CSV, UTF-8, puolipiste-, pilkku- tai tabulaattorierotin.
- Tiedostossa otsikkorivi ja 1–1000 tapahtumaa, enintään 1 MiB.
- Käyttäjä valitsee kolme eri saraketta: kirjauspäivä, tapahtuman etumerkillinen euromäärä ja kuvaus.
- Päivät YYYY-MM-DD tai DD.MM.YYYY. Negatiivinen summa on meno, positiivinen tulo.
- Summat käsitellään kokonaisina sentteinä. Jäsentimen aiempi tarkistuskoodi on lib/talous-core.mjs.
- Pankkikohtaisia vientimuotoja, merkintätapoja, valuuttoja tai maksutapahtumatunnisteita ei ole vahvistettu. Esimerkiksi mahdolliset veloitus- ja hyvityssarakkeet vaativat oman, erikseen testatun adapterin.

## Turvarajaus
- **HOLD: älä lataa oikeita pankkitiliotteita tai omia henkilökohtaisia taloustietoja.**
- Ainoa sallittu testisisältö on keksitty synteettinen tapahtuma-aineisto.
- Tuotu CSV käsitellään nykyisessä käyttöliittymässä vain Reactin tilassa. Ei käyttöoikeuksia viranomaisrekistereihin, pankkeihin tai tallennusrajapintaan.
- Pelkkä UI-varoitus ei teknisesti tunnista todellista henkilötietoaineistoa: oikeiden tietojen käytön esto edellyttää erillisiä tuotantoturvakontrolleja.
- Tietokantatallennus, oikea tunnistautuminen, valtuutus ja henkilötietojen käsittely eivät kuulu tähän hyväksyntään.

## Laskennan ehdot
1. Epäkelpo sarakekartoitus ja yksikin virheellinen tapahtumarivi estävät koko testiaineiston hyväksymisen budjettiin.
2. Tuotu kulutapahtuma on oletusarvoisesti **Luokittelematon**. Kategorian valinta on manuaalinen.
3. Kuukausisuodatus tehdään kelvollisesta kirjauspäivästä; ei sekoiteta eri kuukausia.
4. Tulot ja menot lasketaan etumerkin mukaan; kategoriasummat lasketaan vain menoista.
5. Tuonti korvaa demotapahtumat saman näkymän muistin sisällä. Se ei yhdistä aineistoja eikä väitä tuontia tietokantaan.
6. Sivun uudelleenlataus palauttaa keksityn oletusaineiston.

## Seuraava portti
Kunkin nimetyn pankin todellisen vientimuodon tukeminen vaatii anonymisoidusta tai synteettisestä mutta formaatiltaan varmennetusta esimerkkitiedostosta määriteltyä skeemaa, allekirjoitussääntöjä, duplikaattikäytäntöjä ja lähdetarkistuksen. Tässä PR:ssä ei ole esitetty pankkikohtaista yhteensopivuusväitettä.
