/** Strict RFC4180-style CSV preview. Data stays in the current browser tab. */
export const REQUIRED = ['luotonantaja', 'luottotyyppi', 'saldo_eur'] as const;
export const OPTIONAL = ['kuukausierä_eur', 'luottoraja_eur', 'alkupäivä', 'maksuviive_päiviä'] as const;
const MAX_BYTES = 1024 * 1024;
const MAX_ROWS = 1000;
const MAX_FIELD = 5000;

type CreditRow = {
  line: number; creditor: string; type: string; balanceCents: number;
  monthlyCents: number | null; creditLimitCents: number | null;
  startDate: string | null; lateDays: number | null;
};

type CsvCell = { text: string; line: number };

function scanCSV(raw: string, delimiter: string): CsvCell[][] {
  const rows: CsvCell[][] = [];
  let cells: CsvCell[] = [];
  let value = '';
  let line = 1;
  let rowStart = 1;
  let quoted = false;
  let afterQuote = false;
  let fieldStarted = false;
  const pushCell = () => {
    cells.push({ text: value.trim(), line: rowStart });
    value = '';
    fieldStarted = false;
    afterQuote = false;
  };
  const pushRow = () => {
    pushCell();
    if (cells.some(c => c.text !== '')) rows.push(cells);
    if (rows.length > MAX_ROWS + 1) throw Error('Enintään 1000 luottoriviä');
    cells = [];
    rowStart = line;
  };
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '\0') throw Error('Virheellinen NUL-merkki');
    if (quoted) {
      if (ch === '"') {
        if (raw[i + 1] === '"') { value += '"'; i++; }
        else { quoted = false; afterQuote = true; }
      } else if (ch === '\r' || ch === '\n') {
        if (ch === '\r' && raw[i + 1] === '\n') i++;
        value += '\n'; line++;
      } else value += ch;
    } else if (ch === delimiter) {
      pushCell();
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && raw[i + 1] === '\n') i++;
      line++;
      pushRow();
    } else if (ch === '"') {
      if (fieldStarted || afterQuote) throw Error('Virheellinen lainausmerkki rivillä ' + line);
      quoted = true; fieldStarted = true;
    } else if (afterQuote) {
      if (!/\s/.test(ch)) throw Error('Merkkejä sulkevan lainausmerkin jälkeen rivillä ' + line);
    } else {
      value += ch;
      fieldStarted = true;
    }
    if (value.length > MAX_FIELD) throw Error('Yli 5000 merkin kenttä');
  }
  if (quoted) throw Error('Sulkematon lainausmerkki rivillä ' + rowStart);
  if (cells.length || value.length || fieldStarted || afterQuote) pushRow();
  return rows;
}

function delimiterFor(raw: string): string {
  // Search the first logical record, respecting quoted newlines.
  let quoted = false;
  let semicolon = 0, comma = 0;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"') {
      if (quoted && raw[i + 1] === '"') i++;
      else quoted = !quoted;
    } else if (!quoted && (ch === '\r' || ch === '\n')) break;
    else if (!quoted && ch === ';') semicolon++;
    else if (!quoted && ch === ',') comma++;
  }
  return semicolon >= comma ? ';' : ',';
}

function cents(s: string): number {
  const v = s.replace(/[\s\u00a0\u202f]/g, '').replace(',', '.');
  if (!/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(v)) throw Error('Virheellinen euromäärä');
  const [whole, fraction = ''] = v.split('.');
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(amount)) throw Error('Liian suuri euromäärä');
  return amount;
}

function validISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function parseCreditCSV(input: string) {
  const raw = input.replace(/^\uFEFF/, '');
  if (new TextEncoder().encode(raw).byteLength > MAX_BYTES) throw Error('Enimmäiskoko on 1 Mt');
  const csv = scanCSV(raw, delimiterFor(raw));
  if (csv.length < 2) throw Error('Otsikon lisäksi tarvitaan vähintään yksi rivi');
  const headers = csv[0].map(x => x.text.toLocaleLowerCase('fi'));
  if (new Set(headers).size !== headers.length) throw Error('Päällekkäisiä sarakeotsikoita');
  for (const key of REQUIRED) if (!headers.includes(key)) throw Error('Puuttuva sarake: ' + key);
  const col = (cells: CsvCell[], name: string) => { const idx = headers.indexOf(name); return idx < 0 ? '' : cells[idx].text; };
  const errors: { line: number; message: string }[] = [];
  const rows: CreditRow[] = [];
  for (const cells of csv.slice(1)) {
    const line = cells[0]?.line || 0;
    try {
      if (cells.length !== headers.length) throw Error('Sarakkeiden määrä poikkeaa otsikosta');
      const creditor = col(cells, 'luotonantaja');
      const type = col(cells, 'luottotyyppi');
      if (!creditor || creditor.length > 200) throw Error('Luotonantajan nimi puuttuu tai on liian pitkä');
      if (!['vakuudellinen', 'vakuudeton', 'jatkuva'].includes(type)) throw Error('Tuntematon luottotyyppi');
      const monthly = col(cells, 'kuukausierä_eur');
      const limit = col(cells, 'luottoraja_eur');
      const start = col(cells, 'alkupäivä');
      const late = col(cells, 'maksuviive_päiviä');
      if (start && !validISODate(start)) throw Error('Virheellinen alkupäivä (YYYY-MM-DD)');
      if (late && !/^(0|[1-9]\d{0,4})$/.test(late)) throw Error('Virheellinen maksuviive');
      rows.push({
        line, creditor, type, balanceCents: cents(col(cells, 'saldo_eur')),
        monthlyCents: monthly ? cents(monthly) : null,
        creditLimitCents: limit ? cents(limit) : null,
        startDate: start || null, lateDays: late ? Number(late) : null,
      });
    } catch (error) {
      errors.push({line, message: error instanceof Error ? error.message : 'Virheellinen rivi'});
    }
  }
  return {rows, errors, total: csv.length - 1, delimiter: delimiterFor(raw)};
}