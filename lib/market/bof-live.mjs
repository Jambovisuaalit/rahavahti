/**
 * Verified on 2026-11-07 against the official Finnish central-bank API.
 * GET /v4/series/MFI_PUBL?pageNumber=...&pageSize=...
 * GET /v4/observations/MFI_PUBL?seriesName=...
 * Both selected series returned the expected 2026-09 values.
 * No user financial information is sent to the provider.
 */
export const DATASET = "MFI_PUBL";
export const BASE_URL = "https://api.boffsaopendata.fi/v4";
export const INTEREST_SERIES = Object.freeze({
  consumer_nominal: Object.freeze({
    name: "M.A.1.C.A2A.A.A.U2.2250.ZZ.EUR.C.ANR.0.A.0.A.0",
    metric: "nominal",
    debtType: "consumer_loan",
    label: "Kulutusluotot, uudet sopimukset, sovittu korko"
  }),
  consumer_apr: Object.freeze({
    name: "M.B.2.C.A2A.A.A.U2.2251.ZZ.EUR.C.ANR.0.A.0.A.0",
    metric: "apr",
    debtType: "consumer_loan",
    label: "Kulutusluotot, uudet sopimukset, todellinen vuosikorko"
  })
});
export function parseSeriesPayload(payload, key) {
  const def = INTEREST_SERIES[key];
  if (!def) throw new Error("Tuntematon aikasarja");
  if (!payload || !Array.isArray(payload.items) || payload.items.length !== 1) {
    throw new Error("Aikasarjavastaus puuttuu tai sisältää odottamattoman määrän sarjoja");
  }
  const series = payload.items[0];
  if (series.dataset !== DATASET || series.name !== def.name || !Array.isArray(series.observations)) {
    throw new Error("Rajapinnan aikasarja ei vastaa sallittua tunnistetta");
  }
  const valid = series.observations.filter(obs => {
    if (!obs || !/^\d{4}-\d{2}-\d{2}$/.test(obs.period) || !/^\d{4}M(?:[1-9]|1[0-2])$/.test(obs.periodCode)) return false;
    if (!Number.isFinite(obs.value) || obs.value < 0 || obs.value > 100) return false;
    const month = obs.period.slice(0, 7);
    const [, yr, mm] = obs.periodCode.match(/^(\d{4})M(\d{1,2})$/) ?? [];
    return month === `${yr}-${String(mm).padStart(2, "0")}`;
  });
  if (!valid.length) throw new Error("Aikasarjassa ei ole kelvollisia korkohavaintoja");
  valid.sort((a,b)=>a.period.localeCompare(b.period));
  const latest = valid.at(-1);
  const observationMonth = latest.period.slice(0,7);
  const maxMonth = new Date();
  maxMonth.setUTCMonth(maxMonth.getUTCMonth()-4);
  if (latest.period < maxMonth.toISOString().slice(0,10)) throw new Error("Viimeisin korkohavainto on liian vanha");
  if (latest.period > new Date().toISOString().slice(0,10)) throw new Error("Korkohavainto on tulevaisuudesta");
  return Object.freeze({
    id: key, label: def.label, metric: def.metric, debtType: def.debtType,
    annualRatePercent: Math.round(latest.value*100)/100, observationMonth,
    source: "Suomen Pankki / Finanssivalvonta", sourceUrl:
      "https://www.suomenpankki.fi/fi/tilastot/avoin-data/",
    seriesName: def.name, status: "verified_live_api"
  });
}
export async function fetchLiveBenchmarks(fetcher=fetch) {
  const pairs = await Promise.all(Object.entries(INTEREST_SERIES).map(async ([key,def])=>{
    const url = `${BASE_URL}/observations/${DATASET}?seriesName=${encodeURIComponent(def.name)}`;
    const res = await fetcher(url,{headers:{Accept:"application/json"},next:{revalidate:86400}});
    if (!res.ok) throw new Error(`Suomen Pankin API ei vastaa oikein (HTTP ${res.status})`);
    const body=await res.json();
    return [key,parseSeriesPayload(body,key)];
  }));
  return Object.fromEntries(pairs);
}
