import {expect,test} from '@playwright/test';
for(const width of [320,390,768,1024,1440]){
 test(`overview and budget do not overflow at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:850});
  for(const path of ['/','/budjetti']){
   await page.goto(path);
   const metrics=await page.evaluate(()=>({width:window.innerWidth,scroll:document.documentElement.scrollWidth}));
   expect(metrics.scroll).toBeLessThanOrEqual(metrics.width+1);
  }
 });
}
test('budget editor recalculates without saving data',async({page})=>{
 await page.goto('/budjetti');
 await expect(page.getByRole('heading',{name:'Kuukausibudjetti'})).toBeVisible();
 await expect(page.getByText('Jäljellä: 150,50 €')).toBeVisible();
 await page.locator('#limit-Ruoka').fill('100');
 await page.locator('#limit-Ruoka').blur();
 await expect(page.getByText('Ylitys: 49,50 €')).toBeVisible();
 await page.reload();
 await expect(page.getByText('Jäljellä: 150,50 €')).toBeVisible();
});
test('navigation opens a separate budget view and remains HOLD',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 await page.getByRole('navigation',{name:'Mobiilinavigaatio'}).getByRole('link',{name:'Budjetti'}).click();
 await expect(page).toHaveURL(/\/budjetti$/);
 await expect(page.getByText('DEMO · HOLD')).toBeVisible();
});
