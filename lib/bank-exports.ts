/** Source-backed export availability, NOT bank-specific format support. */
export const BANK_EXPORTS=[
 {id:'nordea',name:'Nordea',status:'Vienti vahvistettu; CSV-skeema vahvistamatta',formatVerified:false,source:'https://www.nordea.fi/henkiloasiakkaat/tuki/usein-kysyttya-verkkopalveluista.html',note:'Henkilöasiakkaan verkkopankissa CSV-vientipainike. Otsikot, koodaus, etumerkit ja erotin vahvistamatta.'},
 {id:'op',name:'OP',status:'Vanha CSV-ohje; nykyinen muoto vahvistamatta',formatVerified:false,source:'https://www.op.fi/legacy-corp/sivu/yrpo/khp/ohjeet.htm',note:'Historiallinen verkkopankkiohje ei todenna nykyistä henkilöasiakkaan vientimuotoa.'},
 {id:'danske',name:'Danske Bank',status:'CSV-vienti ja skeema vahvistamatta',formatVerified:false,source:'https://danskebank.fi/sinulle/asiakaspalvelu/tilit/tiliote',note:'Tiliote dokumentoitu, mutta henkilöasiakkaan CSV-vientirakennetta ei varmistettu.'},
 {id:'spankki',name:'S-Pankki',status:'CSV-vienti ja skeema vahvistamatta',formatVerified:false,source:'https://dokumentit.s-pankki.fi/tiedostot/s-pankki-paivittaisten-palveluiden-ehdot-fi',note:'Tiliotteen saatavuus dokumentoitu, mutta CSV-kenttärakennetta ei varmistettu.'},
] as const;
