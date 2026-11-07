import { expect, test } from '@playwright/test';

test('browser headers are present and sensitive content is not cached', async ({ request }) => {
  const response = await request.get('/luotonantajat');
  expect(response.status()).toBe(200);
  const h = response.headers();
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['referrer-policy']).toBe('no-referrer');
  expect(h['x-frame-options']).toBe('DENY');
  expect(h['x-robots-tag']).toContain('noindex');
  expect(h['cache-control']).toContain('no-store');
  const csp = h['content-security-policy'];
  expect(csp).toContain("object-src 'none'");
  expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
  expect(csp).not.toContain("'unsafe-eval'");
  expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
  expect(h['content-security-policy-report-only']).toBeUndefined();
});

test('synthetic credit CSV is not transmitted; data vanishes after reload', async ({ page }) => {
  const sentinel = 'SYNTHETIC_ONLY_DO_NOT_USE_REAL_DATA_7831';
  const outgoing: string[] = [];
  page.on('request', (request) => {
    const body = request.postData() ?? '';
    if (request.method() !== 'GET' || request.url().includes(sentinel) || body.includes(sentinel)) {
      outgoing.push(request.method() + ' ' + request.url() + ' ' + body);
    }
  });
  await page.goto('/luotonantajat');
  await page.locator('#credit-csv').setInputFiles({
    name: 'synthetic.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('luotonantaja;luottotyyppi;saldo_eur\n' + sentinel + ';vakuudeton;100,00', 'utf8'),
  });
  await expect(page.getByText(sentinel)).toBeVisible();
  expect(outgoing).toEqual([]);
  await page.reload();
  await expect(page.getByText(sentinel)).toHaveCount(0);
});

test('fresh browser context cannot see prior synthetic data', async ({ browser }) => {
  const one = await browser.newContext();
  const two = await browser.newContext();
  try {
    const pageA = await one.newPage();
    const pageB = await two.newPage();
    await pageA.goto('/luotonantajat');
    await pageA.locator('#credit-csv').setInputFiles({
      name: 'a.csv', mimeType: 'text/csv',
      buffer: Buffer.from('luotonantaja;luottotyyppi;saldo_eur\nTEST_CONTEXT_A_7842;jatkuva;5'),
    });
    await expect(pageA.getByText('TEST_CONTEXT_A_7842')).toBeVisible();
    await pageB.goto('/luotonantajat');
    await expect(pageB.getByText('TEST_CONTEXT_A_7842')).toHaveCount(0);
  } finally { await one.close(); await two.close(); }
});

test('file import stays labelled HOLD and persistence stays disabled', async ({ page }) => {
  await page.goto('/luotonantajat');
  await expect(page.getByText('HOLD – vain synteettinen testidata.', { exact: false })).toBeVisible();
  await expect(page.getByLabel('CSV-tiedosto (UTF-8, enintään 1 Mt, enintään 1000 riviä)')).toBeVisible();
  await page.locator('#credit-csv').setInputFiles({
    name: 'test.csv', mimeType: 'text/csv',
    buffer: Buffer.from('luotonantaja;luottotyyppi;saldo_eur\nTestipankki;vakuudeton;1'),
  });
  await expect(page.getByRole('button', { name: 'Tallenna luottotiedot (HOLD)' })).toBeDisabled();
});

test('CSP has unique nonce on sequential requests', async ({request}) => {
  const a=(await request.get('/luotonantajat')).headers()['content-security-policy'];
  const b=(await request.get('/luotonantajat')).headers()['content-security-policy'];
  expect(a).toContain("'nonce-");
  expect(b).toContain("'nonce-");
  expect(a).not.toEqual(b);
});

test('private credit records deny all requests regardless of caller-supplied identity', async ({request}) => {
  for(const method of ['GET','POST','PUT','PATCH','DELETE'] as const){
    const response=await request.fetch('/api/private/credit-records',{
      method,
      headers:{'x-user-id':'test-user-one','authorization':'Bearer forged-test-token'},
      ...(method==='GET'?{}:{data:{user_id:'test-user-two',balance:9999}}),
    });
    expect(response.status()).toBe(403);
    expect((await response.json()).error).toBe('CREDIT_RECORD_ACCESS_DISABLED');
    expect(response.headers()['cache-control']).toContain('no-store');
  }
});
