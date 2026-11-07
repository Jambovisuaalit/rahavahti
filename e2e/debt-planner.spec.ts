import {expect,test} from '@playwright/test';
for(const width of [320,390,768,1024,1440]){
 test('synthetic debt planner fits '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:820});
  await page.goto('/velkasuunnitelma');
  await expect(page.getByRole('heading',{name:'Velkojen maksusuunnitelma'})).toBeVisible();
  const m=await page.evaluate(()=>({page:document.documentElement.scrollWidth,width:innerWidth}));
  expect(m.page).toBeLessThanOrEqual(m.width+1);
 });
}
test('three strategies and savings appear with complete demo finances',async({page})=>{
 await page.goto('/velkasuunnitelma');
 await expect(page.getByRole('button',{name:/Nykytila – vähimmäismaksut/})).toBeVisible();
 await expect(page.getByRole('button',{name:/Vyörytys – korkein korko ensin/})).toBeVisible();
 await expect(page.getByRole('button',{name:/Lumipallo – pienin velka ensin/})).toBeVisible();
 await expect(page.getByRole('heading',{name:'5. Selkokielinen yhteenveto'})).toBeVisible();
 await expect(page.getByLabel('Maksusuunnitelman yhteenveto')).toBeVisible();
});
test('insufficient income hides savings and payoff dates',async({page})=>{
 await page.goto('/velkasuunnitelma');
 await page.locator('#netIncomeEuro').fill('0');
 await page.locator('#cashEuro').fill('0');
 await page.locator('#bufferEuro').fill('0');
 await expect(page.getByText('Säästöä euroina ja velattomuuspäivää ei voida arvioida luotettavasti.',{exact:false})).toBeVisible();
 await expect(page.getByLabel('Maksusuunnitelman yhteenveto')).toHaveCount(0);
});
test('cash below buffer blocks a recommendation',async({page})=>{
 await page.goto('/velkasuunnitelma');
 await page.locator('#cashEuro').fill('100');
 await expect(page.getByText('Lähtötilanteen rahat alittavat turvarajan',{exact:false}).first()).toBeVisible();
 await expect(page.getByLabel('Maksusuunnitelman yhteenveto')).toHaveCount(0);
});
test('reset returns to synthetic data after editing',async({page})=>{
 await page.goto('/velkasuunnitelma');
 await page.locator('#netIncomeEuro').fill('0');
 await page.getByRole('button',{name:'Palauta kuvitteelliset esimerkit'}).click();
 await expect(page.locator('#netIncomeEuro')).toHaveValue('2400');
 await expect(page.getByLabel('Maksusuunnitelman yhteenveto')).toBeVisible();
});
test('mobile additional menu links to debt planner',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 await page.getByRole('navigation',{name:'Mobiilinavigaatio'}).getByRole('button',{name:'Valikko'}).click();
 await page.getByRole('navigation',{name:'Lisävalinnat'}).getByRole('link',{name:'Velkasuunnitelma'}).click();
 await expect(page).toHaveURL(/\/velkasuunnitelma$/);
 await expect(page.getByText('Ei oikeita henkilötietoja.',{exact:false})).toBeVisible();
});
