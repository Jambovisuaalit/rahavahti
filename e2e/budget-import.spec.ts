import {expect,test} from '@playwright/test';
const synthetic='Kirjauspäivä;Määrä EUR;Saaja / maksaja;Viesti\n07.11.2026;-10,50;DEMO-OSTOS-A;synteettinen\n08.11.2026;200,00;DEMO-TULO-B;synteettinen';
test('synthetic export maps and updates monthly budget without network or persistence',async({page})=>{
 const requests:string[]=[];
 page.on('request',r=>{if(r.method()!=='GET'||r.postData()?.includes('DEMO-OSTOS-A'))requests.push(r.url())});
 await page.goto('/budjetti');
 await page.locator('#budget-csv').setInputFiles({name:'synthetic.csv',mimeType:'text/csv',buffer:Buffer.from(synthetic)});
 await expect(page.getByText('2 hyväksyttyä')).toBeVisible();
 await page.getByRole('button',{name:'Käytä testitapahtumia budjetissa'}).click();
 await expect(page.getByText('CSV-testitapahtumat käytössä.',{exact:false})).toBeVisible();
 await expect(page.getByText('DEMO-OSTOS-A')).toBeVisible();
 await expect(page.getByText('Luokittelemattomia menoja: 1',{exact:false})).toBeVisible();
 await page.getByRole('combobox',{name:'Kategoria: DEMO-OSTOS-A'}).selectOption('Ruoka');
 await expect(page.getByText('Luokittelemattomia menoja: 0',{exact:false})).toBeVisible();
 expect(requests).toEqual([]);
 await page.reload();
 await expect(page.getByText('DEMO-OSTOS-A')).toHaveCount(0);
 await expect(page.getByText('Marraskuu 2026 · keksitty esimerkkiaineisto')).toBeVisible();
});
test('invalid CSV rows cannot be applied to budget',async({page})=>{
 await page.goto('/budjetti');
 await page.locator('#budget-csv').setInputFiles({name:'synthetic.csv',mimeType:'text/csv',buffer:Buffer.from('Päivä;Summa;Kuvaus\n07.11.2026;-3;Hyvä\n31.02.2026;-2;Virhe')});
 await expect(page.getByText('1 virheellistä riviä')).toBeVisible();
 await expect(page.getByRole('button',{name:'Käytä testitapahtumia budjetissa'})).toBeDisabled();
});
