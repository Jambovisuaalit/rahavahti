import {expect,test} from '@playwright/test';

for (const width of [320,390,768,1024,1440]) {
 test(`responsive page has no horizontal overflow at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:820});
  await page.goto('/luotonantajat');
  await expect(page.getByRole('heading',{name:/Luotonantajat ja omien luottotietojen tuonti/})).toBeVisible();
  const metrics=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:window.innerWidth}));
  expect(metrics.scroll).toBeLessThanOrEqual(metrics.viewport+1);
  if(width<768){
   await expect(page.getByRole('navigation',{name:'Mobiilinavigaatio'})).toBeVisible();
   await expect(page.getByRole('complementary',{name:'Päänavigaatio'})).toBeHidden();
  } else {
   await expect(page.getByRole('complementary',{name:'Päänavigaatio'})).toBeVisible();
   await expect(page.getByRole('navigation',{name:'Mobiilinavigaatio'})).toBeHidden();
  }
 });
}

test('mobile navigation opens and closes menu and preserves HOLD',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 const mobile=page.getByRole('navigation',{name:'Mobiilinavigaatio'});
 const menu=mobile.getByRole('button',{name:'Valikko'});
 await menu.click();
 await expect(menu).toHaveAttribute('aria-expanded','true');
 await expect(page.getByRole('navigation',{name:'Lisävalinnat'})).toBeVisible();
 await expect(page.getByRole('navigation',{name:'Lisävalinnat'}).getByText('Raportit · HOLD')).toBeVisible();
 await menu.click();
 await expect(menu).toHaveAttribute('aria-expanded','false');
 await expect(page.getByRole('navigation',{name:'Lisävalinnat'})).toHaveCount(0);
 await mobile.getByRole('link',{name:'Luotot'}).click();
 await expect(page).toHaveURL(/\/luotonantajat$/);
 await expect(page.getByText('HOLD – vain synteettinen testidata.',{exact:false})).toBeVisible();
});
test('keyboard skip link targets main content',async({page})=>{
 await page.goto('/');
 await page.keyboard.press('Tab');
 const skip=page.getByRole('link',{name:'Siirry sisältöön'});
 await expect(skip).toBeFocused();
 await expect(page.locator('#main-content')).toHaveCount(1);
});
