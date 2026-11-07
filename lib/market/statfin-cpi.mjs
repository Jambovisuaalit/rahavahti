/**
 * StatFin PxWeb v1: Finnish CPI (2025=100), monthly, table 15b5.
 * Only overall consumer price index (commodity SSS) and verified variable codes.
 * Endpoint and POST body never include personal financial information.
 */
export const CPI_URL = "https://statfin.stat.fi/PxWeb/api/v1/fi/StatFin/khi/15b5.px";
export const CPI_SOURCE = "https://statfin.stat.fi/PxWeb/pxweb/fi/StatFin/StatFin__khi/";
const REQUIRED_METRICS = ["ip_khi","vm_khi","km_khi"];

export function selectCpiPeriods(metadata) {
  const variables=metadata?.variables;
  if(!Array.isArray(variables))throw Error("Tilastokeskuksen metadata puuttuu");
  const time=variables.find(x=>x.code==="timeperiod_m");
  const commodity=variables.find(x=>x.code==="coicop_46_20231201");
  const contents=variables.find(x=>x.code==="contentscode");
  if(!Array.isArray(time?.values)||!commodity?.values?.includes("SSS") ||
     !REQUIRED_METRICS.every(x=>contents?.values?.includes(x)))throw Error("KHI:n muuttujakoodit eivät vastaa varmennettua rakennetta");
  const periods=time.values.filter(x=>/^\d{4}M(?:0[1-9]|1[0-2])$/.test(x));
  if(periods.length<13||periods.at(-1).slice(0,4)<"2020")throw Error("KHI:n kuukausihistoria puuttuu");
  const selected=periods.slice(-13);
  const latest=selected.at(-1);
  const now=new Date();
  const ageMonths=(now.getUTCFullYear()-Number(latest.slice(0,4)))*12+now.getUTCMonth()+1-Number(latest.slice(5));
  if(ageMonths<0||ageMonths>4)throw Error("KHI:n havaintoajankohta on epäkelpo tai liian vanha");
  return selected;
}
export function cpiQuery(periods) {
  if(!Array.isArray(periods)||periods.length!==13 ||
     !periods.every(x=>/^\d{4}M(?:0[1-9]|1[0-2])$/.test(x)))throw Error("KHI:n ajanjakso virheellinen");
  return {
    query:[
      {code:"timeperiod_m",selection:{filter:"item",values:periods}},
      {code:"coicop_46_20231201",selection:{filter:"item",values:["SSS"]}},
      {code:"contentscode",selection:{filter:"item",values:REQUIRED_METRICS}}
    ],
    response:{format:"json-stat2"}
  };
}
export function parseCpiResponse(raw, periods) {
  if(raw?.version!=="2.0"||raw?.class!=="dataset"||
     JSON.stringify(raw.id)!==JSON.stringify(["timeperiod_m","coicop_46_20231201","contentscode"])||
     JSON.stringify(raw.size)!==JSON.stringify([13,1,3])||
     !Array.isArray(raw.value)||raw.value.length!==39)throw Error("KHI:n JSON-stat2-vastaus on virheellinen");
  const timeIndex=raw.dimension?.timeperiod_m?.category?.index;
  const comIndex=raw.dimension?.coicop_46_20231201?.category?.index;
  const metricIndex=raw.dimension?.contentscode?.category?.index;
  if(comIndex?.SSS!==0||!timeIndex||!metricIndex ||
     !REQUIRED_METRICS.every((m,i)=>metricIndex[m]===i))throw Error("KHI:n dimensiojärjestys on väärä");
  if(!periods.every((p,i)=>timeIndex[p]===i))throw Error("KHI:n aikajärjestys poikkeaa pyynnöstä");
  const data=periods.map((month,i)=>{
    const [index,yearly,monthly]=raw.value.slice(i*3,i*3+3);
    if(!Number.isFinite(index)||index<=0||!Number.isFinite(yearly)||!Number.isFinite(monthly)||
       Math.abs(yearly)>100||Math.abs(monthly)>100)throw Error("KHI:n havaintoarvo on virheellinen");
    return {month,index,annualChangePercent:yearly,monthlyChangePercent:monthly};
  });
  const latest=data.at(-1),oneYearEarlier=data[0];
  const calculated=(latest.index/oneYearEarlier.index-1)*100;
  if(Math.abs(calculated-latest.annualChangePercent)>0.15)throw Error("KHI:n vuosimuutos ei täsmää indeksilukuihin");
  if(typeof raw.updated!=="string"||!/^\d{4}-\d\d-\d\dT/.test(raw.updated))throw Error("KHI:n päivitetty-aikaleima puuttuu");
  return {
    source:"Tilastokeskus",table:"15b5",baseYear:2025,
    observationMonth:latest.month,updatedAt:raw.updated,sourceUrl:CPI_SOURCE,
    index:latest.index,annualChangePercent:latest.annualChangePercent,
    monthlyChangePercent:latest.monthlyChangePercent,
    status:"verified_live_api"
  };
}
export async function fetchCpi(fetcher=fetch) {
  const metadataResponse=await fetcher(CPI_URL,{headers:{Accept:"application/json"}});
  if(!metadataResponse.ok)throw Error("KHI-metadatapyyntö epäonnistui");
  const months=selectCpiPeriods(await metadataResponse.json());
  const dataResponse=await fetcher(CPI_URL,{
    method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},
    body:JSON.stringify(cpiQuery(months))
  });
  if(!dataResponse.ok)throw Error("KHI-havaintopyyntö epäonnistui");
  return parseCpiResponse(await dataResponse.json(),months);
}
