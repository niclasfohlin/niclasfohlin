#!/usr/bin/env node
// Provet av utskicket (netlify/lib/utskick.mjs, K-704): sändtiden, ingen kampanj mellan 21.00 och 07.00 svensk tid och en
// deploy nattetid schemalagd till 07.00 (CLAUDE.md under Prenumeration och utskick), också nätterna när sommartiden börjar
// och slutar, och nya verktyg i ett eget utskick. mejlaNytt prövas med en härmad Brevo, nattetid och på dagen.
import { sandtid, utskicken, mejlaNytt, brev } from '../netlify/lib/utskick.mjs';

const fall = [
  ['2026-11-03T21:30:00Z', '2026-11-04T07:00:00+01:00'], // 22.30 svensk tid
  ['2026-11-03T19:59:00Z', null], // 20.59
  ['2026-11-03T20:00:00Z', '2026-11-04T07:00:00+01:00'], // 21.00
  ['2026-11-04T05:30:00Z', '2026-11-04T07:00:00+01:00'], // 06.30
  ['2026-11-04T06:00:00Z', null], // 07.00
  ['2026-03-29T00:30:00Z', '2026-03-29T07:00:00+02:00'], // 01.30 natten när sommartiden börjar
  ['2026-10-24T22:00:00Z', '2026-10-25T07:00:00+01:00'], // 00.00 natten när sommartiden slutar
  ['2026-06-30T20:30:00Z', '2026-07-01T07:00:00+02:00'], // 22.30 sommartid
  ['2026-11-04T05:56:00Z', '2026-11-04T07:10:00+01:00'], // 06.56, för nära 07.00
  ['2026-11-04T05:54:59Z', '2026-11-04T07:00:00+01:00'], // 06.54.59
];
let fel = 0;
for (const [nu, vantat] of fall) { const t = sandtid(new Date(nu)); if (t !== vantat) { fel++; console.error('sandtid', nu, t, 'väntat', vantat); } }
const delar = utskicken([{ typ: 'metod', url: '/a' }, { typ: 'verktyg', url: '/strukturer' }, { typ: 'verktyg', url: '/strategier' }]);
if (delar.length !== 2 || delar[1].length !== 2) { fel++; console.error('utskicken', JSON.stringify(delar)); }

// mejlaNytt med en härmad Brevo: nattetid två kampanjer schemalagda till 07.00 utan sendNow, på dagen sendNow efter båda.
const anrop = [];
globalThis.fetch = async (url, o) => { anrop.push([String(url).replace('https://api.brevo.com/v3', ''), JSON.parse(o.body)]); return { ok: true, text: async () => JSON.stringify({ id: anrop.length }) }; };
const lagret = { varde: { urler: ['/gammal'] }, async get() { return this.varde; }, async setJSON(_, v) { this.varde = v; } };
const poster = [{ url: '/gammal', titel: 'G', ingress: '', etikett: '' }, { typ: 'metod', url: '/metoder/ny', titel: 'Ny metod', ingress: 'x', etikett: 'Ny metod' }, { typ: 'verktyg', url: '/strukturer', titel: 'Strukturer', ingress: 'y', etikett: 'Nytt verktyg' }, { typ: 'verktyg', url: '/strategier', titel: 'Strategier', ingress: 'z', etikett: 'Nytt verktyg' }];
await mejlaNytt({ poster, sajt: 'https://niclasfohlin.se', lager: lagret, brevoNyckel: 'k', listId: '3', nu: new Date('2026-11-03T21:30:00Z') });
const skapade = anrop.filter(([p]) => p === '/emailCampaigns');
if (skapade.length !== 2 || anrop.some(([p]) => p.includes('sendNow')) || skapade.some(([, b]) => b.scheduledAt !== '2026-11-04T07:00:00+01:00') || lagret.varde.senast.status !== 'schemalagd') { fel++; console.error('natten', JSON.stringify(anrop.map(([p, b]) => [p, b.subject, b.scheduledAt]))); }
if (skapade[1]?.[1].subject !== 'Nya verktyg på niclasfohlin.se: Strukturer och Strategier') { fel++; console.error('verktygens ämne', skapade[1]?.[1].subject); }
anrop.length = 0;
lagret.varde = { urler: ['/gammal'] };
await mejlaNytt({ poster, sajt: 'https://niclasfohlin.se', lager: lagret, brevoNyckel: 'k', listId: '3', nu: new Date('2026-11-04T08:00:00Z') });
if (anrop.filter(([p]) => p.includes('sendNow')).length !== 2 || anrop.some(([, b]) => b.scheduledAt)) { fel++; console.error('dagen', JSON.stringify(anrop.map(([p]) => p))); }
// Mallen för en ny text: ämnesraden med texttypen, citatet, Läs hela krönikan och originalet (CLAUDE.md under Prenumeration och utskick).
const text = { typ: 'artikel', url: '/artiklar/x', titel: 'Rubriken', ingress: 'Ingressen.', etikett: 'Ny krönika i Vi Lärare, 3 november 2026', text: { amne: 'Ny krönika', den: 'krönikan', citat: 'Citatet.', publikation: 'Vi Lärare', original: 'https://www.vilarare.se/x/' } };
const b = brev([text], 'https://niclasfohlin.se');
if (!b.includes('Citatet.') || !b.includes('Läs hela krönikan på niclasfohlin.se') || !b.includes('Publicerad först i Vi Lärare') || !b.includes('https://www.vilarare.se/x/')) { fel++; console.error('textens mall', b.replace(/<[^>]+>/g, ' ').replace(/s+/g, ' ').slice(0, 300)); }
anrop.length = 0;
lagret.varde = { urler: ['/gammal'] };
await mejlaNytt({ poster: [poster[0] ?? poster, text].flat().filter((p) => p.url === '/gammal' || p === text), sajt: 'https://niclasfohlin.se', lager: lagret, brevoNyckel: 'k', listId: '3', nu: new Date('2026-11-04T08:00:00Z') });
if (anrop.find(([p]) => p === '/emailCampaigns')?.[1].subject !== 'Ny krönika: Rubriken') { fel++; console.error('textens ämne', anrop.find(([p]) => p === '/emailCampaigns')?.[1].subject); }
if (fel) { console.error(`utskicksprov: ${fel} fel`); process.exit(1); }
console.log('utskicksprov: sändtiden 07.00–21.00 med sommartiden, schemaläggningen nattetid, verktygen i ett eget utskick och mallen för en ny text svarar rätt.');
