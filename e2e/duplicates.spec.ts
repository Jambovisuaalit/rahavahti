import {expect,test} from '@playwright/test';
test('suspected duplicates require explicit review and preserve rows by default',async({page})=>{
 await page.goto('/budjetti');
 const csv='Päivä;Summa;Kuvaus\n07.11.2026;-10;SYNTEETTINEN OSTOS\n07.11.2026;-10;SYNTEETTINEN OSTOS\n08.11.2026;100;SYNTEETTINEN TULO';
 await page.locator('#budget-csv').setInputFiles({name:'synthetic.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
 const review=page.getByLabel('Mahdolliset kaksoiskappaleet');
 await expect(review.getByText('1 mahdollista kaksoiskappaletta')).toBeVisible();
 const apply=page.getByRole('button',{name:'Käytä testitapahtumia budjetissa'});
 await expect(apply).toBeDisabled();
 await review.getByRole('checkbox',{name:/Olen tarkistanut/}).check();
 await expect(apply).toBeEnabled();
 await apply.click();
 await expect(page.getByText('3 CSV-testitapahtumaa')).toBeVisible();
});
test('explicit exclusion removes only selected duplicate test row',async({page})=>{
 await page.goto('/budjetti');
 await page.locator('#budget-csv').setInputFiles({name:'synthetic.csv',mimeType:'text/csv',buffer:Buffer.from('Päivä;Summa;Kuvaus\n07.11.2026;-10;DEMO-1\n07.11.2026;-10;DEMO-1')});
 const review=page.getByLabel('Mahdolliset kaksoiskappaleet');
 await review.getByRole('checkbox',{name:/Jätä pois rivi 3/}).check();
 await review.getByRole('checkbox',{name:/Olen tarkistanut/}).check();
 await page.getByRole('button',{name:'Käytä testitapahtumia budjetissa'}).click();
 await expect(page.getByText('1 CSV-testitapahtumaa')).toBeVisible();
});
test('bank evidence selector never claims format compatibility',async({page})=>{
 await page.goto('/budjetti');
 await page.locator('#bank-export-source').selectOption('nordea');
 await expect(page.getByText('Vienti vahvistettu; CSV-skeema vahvistamatta.',{exact:false})).toBeVisible();
 await expect(page.getByText('Tämä valinta ei muuta jäsennystä eikä vahvista yhteensopivuutta.',{exact:false})).toBeVisible();
});
