# Rahavahti / Talousvahti

Itsenäinen Next.js/TypeScript -taloudenhallinnan kehitysesikatselu. Ei Lovable-riippuvuutta.

**Turvatila: HOLD.** Tuotantokäyttö, oikeat henkilökohtaiset taloustiedot, pysyvä CSV-tuonti ja operaattorin puolesta-asiointi ovat pois käytöstä. Tämä repo sisältää vain paikallisen testiaineiston esikatselun ja ostoauditoinnin viitelaskennan.

## Toiminnot
- CSV-tiedoston selainpohjainen esikatselu, UTF-8, erottimet ja sarakekartoitus.
- Suomenkieliset euromäärät ja päivämäärät.
- Ostoksen vaikutuksen 30 päivän kassavirtaan laskeva deterministinen viitemoottori.
- Testit ja dokumentoitu julkaisun HOLD-portti.

## Käynnistys
```bash
npm install
npm test
npm run dev
```

## Turvaportit
G1 autentikointi, Supabase RLS:n käyttäjäeristystestit ja auditointi; G2 idempotentti pysyvä CSV-tuonti; G3 laskentamoottorin laajemmat testit; G4 viranomaisdatan varmennettu live-integraatio; G5 tietoturva-arvio ja hyväksytty tuotantojulkaisu.

Tämä lähdekoodi on julkinen, joten **älä koskaan lisää tähän taloustietoja, pankkitiliotteita tai salaisuuksia.**
