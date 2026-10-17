// Prov för kommentarernas grind (netlify/functions/kommentarer.mjs): vilka anrop som väcker databasen. Läsarna och
// administratören i rutan på sidorna ska läsa ur mellanlagret, och bara det som behöver databasen når Waline (K-396;
// Niclas egen inloggning väckte databasen varje gång han öppnade en sida, omkring en kredit per gång, 40 av 50 krediter
// 2026-09-20 till 10-17). Funktionen körs här med Blobs, databasen och Waline utbytta: lagret är en Map, databasen
// räknar sina frågor och Waline säger bara att den startades. Inget nätverk, ingen riktig databas och inga riktiga
// hemligheter: beviset signeras med en provnyckel.
//
//   npm run kommentarer:prov
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

process.env.UTSKICK_HEMLIGHET = 'bara-ett-prov';
process.env.KOMMENTARER = 'på';

const lagret = new Map();
let fragor = 0;
let walineStartad = 0;
mock.module('@netlify/blobs', {
  exports: {
    getStore: () => ({
      get: async (k) => (lagret.has(k) ? structuredClone(lagret.get(k)) : null),
      setJSON: async (k, v) => { lagret.set(k, structuredClone(v)); },
      set: async (k, v) => { lagret.set(k, v); },
      list: async () => ({ blobs: [] }),
      delete: async (k) => { lagret.delete(k); },
    }),
  },
});
mock.module('@netlify/database', {
  exports: {
    getDatabase: () => ({ sql: async (strangar) => { fragor += 1; return /status = 'waiting'/.test(strangar.join('?')) ? [{ url: '/stodundervisning/med-vantande' }] : []; } }),
    getConnectionString: () => 'postgres://prov',
  },
});
mock.module('@netlify/functions', { exports: { purgeCache: async () => {} } });
mock.module('@waline/vercel', { exports: { default: () => { walineStartad += 1; throw new Error('Waline startades'); } } });

const { default: handler } = await import('../netlify/functions/kommentarer.mjs');
const { PREFIX, hemlighet } = await import('../netlify/lib/kommentarer.mjs');

const bevis = jwt.sign('admin-id', hemlighet('inloggning'));
const anrop = (sokvag, { admin = false, ruta = false } = {}) => {
  const headers = new Headers();
  if (admin) headers.set('authorization', `Bearer ${bevis}`);
  if (ruta) headers.set('x-kommentar-ruta', 'ja');
  return handler(new Request(`https://niclasfohlin.se${PREFIX}${sokvag}`, { headers }), { deploy: { context: 'production' }, ip: '203.0.113.7' });
};
const nollstall = () => { lagret.clear(); lagret.set('sidor', []); lagret.set('vantande', []); fragor = 0; walineStartad = 0; };
const lista = '/api/comment?path=%2Fstodundervisning%2Fljudlek-rim&page=1&pageSize=50&sortBy=insertedAt_asc&lang=sv';
const svaret = async (r) => ({ status: r.status, data: (await r.json()).data, cache: r.headers.get('cache-control'), cdn: r.headers.get('netlify-cdn-cache-control') });

test('administratören i rutan: vem hen är, ur beviset, utan databasen och Waline', async () => {
  nollstall();
  const s = await svaret(await anrop('/api/token', { admin: true, ruta: true }));
  assert.equal(s.status, 200);
  assert.equal(s.data.type, 'administrator');
  assert.equal(s.cache, 'private, no-store');
  assert.equal(fragor, 0);
  assert.equal(walineStartad, 0);
});

test('administratören i rutan: listan för en sida utan väntande kommer ur mellanlagret, inte genom CDN:et', async () => {
  nollstall();
  const s = await svaret(await anrop(lista, { admin: true, ruta: true }));
  assert.equal(s.status, 200);
  assert.deepEqual(s.data.data, []);
  assert.equal(s.cache, 'private, no-store');
  assert.equal(s.cdn, null);
  assert.equal(fragor, 0);
  assert.equal(walineStartad, 0);
});

test('administratören i rutan: en sida med väntande kommentarer går till Waline', async () => {
  nollstall();
  lagret.set('vantande', ['/stodundervisning/ljudlek-rim']);
  await anrop(lista, { admin: true, ruta: true });
  assert.equal(walineStartad, 1);
});

test('panelen, utan rutans märke: vem hen är går till Waline som förut', async () => {
  nollstall();
  await anrop('/api/token', { admin: true });
  assert.equal(walineStartad, 1);
});

test('utan bevis: vem hen är är ingen, och tvåstegsprovet kräver adressen; inget når Waline', async () => {
  nollstall();
  const s = await svaret(await anrop('/api/token', { ruta: true }));
  assert.equal(s.status, 200);
  assert.equal(s.data, null);
  const r = await anrop('/api/token/2fa');
  assert.equal(r.status, 400);
  assert.equal(walineStartad, 0);
  assert.equal(fragor, 0);
});

test('en läsare: listan ur mellanlagret, genom CDN:et, utan databasen', async () => {
  nollstall();
  const s = await svaret(await anrop(lista, { ruta: true }));
  assert.equal(s.status, 200);
  assert.deepEqual(s.data.data, []);
  assert.match(s.cdn ?? '', /max-age=3600/);
  assert.equal(fragor, 0);
  assert.equal(walineStartad, 0);
});

test('saknas listan över väntande läses den ur databasen en gång och sparas', async () => {
  nollstall();
  lagret.delete('vantande');
  await anrop(lista, { admin: true, ruta: true });
  assert.equal(fragor, 1);
  assert.deepEqual(lagret.get('vantande'), ['/stodundervisning/med-vantande']);
  await anrop(lista, { admin: true, ruta: true });
  assert.equal(fragor, 1);
});
