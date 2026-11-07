/**
 * Suomen Pankki / Fiva: public, dated, manually verified snapshot.
 * This is NOT an active Timeseries API v4 integration.
 * Figures: new household consumer loan agreements, Finland, 2026-09.
 * https://reports.suomenpankki.fi/WebForms/ReportViewerPage.aspx?output=&report=%2Ftilastot%2Frahalaitosten_lainat_talletukset_ja_korot%2Flainat%2Ftalletusten_ja_lainojen_korot_fi
 */
export const SOURCE_URL = "https://reports.suomenpankki.fi/WebForms/ReportViewerPage.aspx?output=&report=%2Ftilastot%2Frahalaitosten_lainat_talletukset_ja_korot%2Flainat%2Ftalletusten_ja_lainojen_korot_fi";
export const BENCHMARKS = Object.freeze({
  consumer_nominal: Object.freeze({
    id: "consumer_nominal", label: "Kulutusluotot, uudet sopimukset, sovittu korko",
    metric: "nominal", debtType: "consumer_loan", annualRatePercent: 5.86,
    observationMonth: "2026-09", source: "Suomen Pankki / Finanssivalvonta",
    sourceUrl: SOURCE_URL, status: "verified_static_snapshot"
  }),
  consumer_apr: Object.freeze({
    id: "consumer_apr", label: "Kulutusluotot, uudet sopimukset, todellinen vuosikorko",
    metric: "apr", debtType: "consumer_loan", annualRatePercent: 8.22,
    observationMonth: "2026-09", source: "Suomen Pankki / Finanssivalvonta",
    sourceUrl: SOURCE_URL, status: "verified_static_snapshot"
  })
});
export function compareLoanRate({annualRatePercent, metric, debtType, benchmarkId, benchmarks = BENCHMARKS}) {
  if (!Number.isFinite(annualRatePercent) || annualRatePercent < 0 || annualRatePercent > 1000) {
    throw new RangeError("Lainan vuotuinen korko puuttuu tai on virheellinen");
  }
  const benchmark = Object.hasOwn(benchmarks, benchmarkId) ? benchmarks[benchmarkId] : undefined;
  if (!benchmark) throw new Error("Vertailusarjaa ei ole varmennettu");
  if (benchmark.metric !== metric) throw new Error("Sopimuskorkoa ja todellista vuosikorkoa ei voi vertailla keskenään");
  if (benchmark.debtType !== debtType) throw new Error("Velkatyyppi ei vastaa vertailusarjaa");
  // integer arithmetic at a basis-point scale to avoid floating errors
  const differenceBasisPoints = Math.round(annualRatePercent * 100) - Math.round(benchmark.annualRatePercent * 100);
  return {
    benchmark,
    personalRatePercent: annualRatePercent,
    differencePercentagePoints: differenceBasisPoints / 100,
    position: differenceBasisPoints > 0 ? "above" : differenceBasisPoints < 0 ? "below" : "equal",
    note: "Tilastollinen vertailu, ei luottotarjous eikä arvio lainakelpoisuudesta."
  };
}
