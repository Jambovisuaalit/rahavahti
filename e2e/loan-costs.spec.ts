import {expect,test} from '@playwright/test';
for(const width of [320,390,768,1024,1440]){
 test('loan calculator responsive at '+width,async({page})=>{
  await page.setViewportSize({width,height:860});
  await page.goto('/korkolaskuri');
  await expect(page.getByRole('heading',{name:'Todellinen vuosikorko ja lainavertailu'})).toBeVisible();
  const result=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:window.innerWidth}));
  expect(result.scroll).toBeLessThanOrEqual(result.viewport+1);
 });
}
test('synthetic model computes APR, nominal cap and fee separately',async({page})=>{
 await page.goto('/korkolaskuri');
 const a=page.getByRole('region',{name:'Vaihtoehto A (demo)'});
 await expect(a.getByText('Arvioitu todellinen vuosikorko')).toBeVisible();
 await expect(a.getByText('Korkokatto: Rajan sisällä')).toBeVisible();
 await page.locator('#nominal-a').fill('18');
 await expect(a.getByText('Korkokatto: Raja ylittyy')).toBeVisible();
 await page.locator('#nominal-a').fill('10');
 await page.locator('#opening-a').fill('120');
 await page.locator('#monthly-a').fill('10');
 await expect(a.getByText('Muut luottokustannukset: Raja ylittyy')).toBeVisible();
 await expect(a.getByText('Korkokatto: Rajan sisällä')).toBeVisible();
});
test('APR comparison changes when opening and account fees change',async({page})=>{
 await page.goto('/korkolaskuri');
 const card=page.getByRole('region',{name:'Vaihtoehto A (demo)'});
 const value=card.locator('.loan-results > div').first().locator('strong');
 const before=await value.innerText();
 await page.locator('#monthly-a').fill('5');
 await expect(value).not.toHaveText(before);
 await page.reload();
 await expect(value).toHaveText(before);
});
test('special loan / old agreement disables legal verdict',async({page})=>{
 await page.goto('/korkolaskuri');
 await page.getByRole('checkbox',{name:/Tarkasteltava sopimus on vanha/}).check();
 const a=page.getByRole('region',{name:'Vaihtoehto A (demo)'});
 await expect(a.getByText('Korkokatto: Ei arvioitu')).toBeVisible();
 await expect(a.getByText('Muut luottokustannukset: Ei arvioitu')).toBeVisible();
});
test('navigation opens loan calculator without handling real data',async({page})=>{
 await page.setViewportSize({width:390,height:820});
 await page.goto('/');
 await page.getByRole('navigation',{name:'Mobiilinavigaatio'}).getByRole('button',{name:'Valikko'}).click();
 await page.getByRole('navigation',{name:'Lisävalinnat'}).getByRole('link',{name:'Korkolaskuri'}).click();
 await expect(page).toHaveURL(/\/korkolaskuri$/);
 await expect(page.getByText('HOLD – ei oikeita taloustietoja.',{exact:false})).toBeVisible();
});
