#!/usr/bin/env node
// Provet av utskicket (netlify/lib/utskick.mjs, K-704), mejlens standard (netlify/lib/mejl.mjs, K-729), dagsgränsen (K-731) och
// månadsbrevet (netlify/lib/manadsbrev.mjs, K-730): sändtiden, ingen kampanj mellan 21.00 och 07.00 svensk tid och en
// deploy nattetid schemalagd till 07.00 (CLAUDE.md under Prenumeration och utskick), också nätterna när sommartiden börjar
// och slutar, och nya verktyg i ett eget utskick. mejlaNytt prövas med en härmad Brevo, nattetid och på dagen.
import { sandtid, utskicken, mejlaNytt, brev, ledigTid } from '../netlify/lib/utskick.mjs';
import { forraManaden, manaden, manadensBrev, skickaManadsbrev } from '../netlify/lib/manadsbrev.mjs';
import { allaHits, besokPerSida, periodensBesok, sidornasBesok } from '../netlify/lib/goatcounter.mjs';
import { knappensOrd, manadsMejl } from '../netlify/lib/mejl.mjs';
import texter from '../src/data/manadsbrev.json' with { type: 'json' };

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
let dagensKvar = 300;
let listan = 100;
globalThis.fetch = async (url, o) => {
  const sokvag = String(url).replace('https://api.brevo.com/v3', '');
  if (sokvag === '/account') return { ok: true, text: async () => JSON.stringify({ plan: [{ type: 'free', credits: dagensKvar, creditsType: 'sendLimit' }] }) };
  if (sokvag.startsWith('/contacts/lists/')) return { ok: true, text: async () => JSON.stringify({ count: listan }) };
  anrop.push([sokvag, JSON.parse(o.body)]);
  return { ok: true, text: async () => JSON.stringify({ id: anrop.length }) };
};
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
if (!b.includes('Citatet.') || !b.includes('Läs hela krönikan') || !b.includes('Publicerad först i <a') || !b.includes('https://www.vilarare.se/x/')) { fel++; console.error('textens mall', b.replace(/<[^>]+>/g, ' ').replace(/s+/g, ' ').slice(0, 300)); }
anrop.length = 0;
lagret.varde = { urler: ['/gammal'] };
await mejlaNytt({ poster: [poster[0] ?? poster, text].flat().filter((p) => p.url === '/gammal' || p === text), sajt: 'https://niclasfohlin.se', lager: lagret, brevoNyckel: 'k', listId: '3', nu: new Date('2026-11-04T08:00:00Z') });
if (anrop.find(([p]) => p === '/emailCampaigns')?.[1].subject !== 'Ny krönika: Rubriken') { fel++; console.error('textens ämne', anrop.find(([p]) => p === '/emailCampaigns')?.[1].subject); }

// Dagsgränsen (K-731): en kampanj som inte ryms i dag går till nästa morgon med plats. Kampanj 34 stannade så 2026-11-04.
const dag = new Date('2026-11-04T19:33:00Z'); // 20.33 svensk tid
const tider = [
  [{ nu: dag, kvar: 300, behov: 150 }, null],
  [{ nu: dag, kvar: 18, behov: 150 }, '2026-11-05T07:00:00+01:00'],
  [{ nu: dag, kvar: 18, behov: 150, bokat: { '2026-11-05': 200 } }, '2026-11-06T07:00:00+01:00'],
  [{ nu: new Date('2026-11-04T21:30:00Z'), kvar: 300, behov: 150, bokat: { '2026-11-05': 150 } }, '2026-11-05T07:00:00+01:00'],
  [{ nu: new Date('2026-11-04T21:30:00Z'), kvar: 300, behov: 160, bokat: { '2026-11-05': 150 } }, '2026-11-06T07:00:00+01:00'],
  [{ nu: new Date('2026-03-28T12:00:00Z'), kvar: 0, behov: 150 }, '2026-03-29T07:00:00+02:00'],
  [{ nu: dag, kvar: Infinity, behov: 0 }, null],
  // Före 07.00: dagens plats är Brevos rest minus det som väntar. Direkt efter 07.00 väntar bokningen fortfarande.
  [{ nu: new Date('2026-11-05T05:00:00Z'), kvar: 0, behov: 140 }, '2026-11-06T07:00:00+01:00'],
  [{ nu: new Date('2026-11-05T05:00:00Z'), kvar: 300, behov: 170, bokat: { '2026-11-05': 140 } }, '2026-11-06T07:00:00+01:00'],
  [{ nu: new Date('2026-11-05T06:01:00Z'), kvar: 300, behov: 170, bokat: { '2026-11-05': 140 } }, '2026-11-06T07:00:00+01:00'],
  [{ nu: new Date('2026-11-05T08:00:00Z'), kvar: 160, behov: 140, bokat: { '2026-11-05': 140 } }, null],
];
for (const [a, vantat] of tider) { const t = ledigTid(a); if (t !== vantat) { fel++; console.error('ledigTid', JSON.stringify(a), t, 'väntat', vantat); } }
anrop.length = 0;
dagensKvar = 16;
listan = 153;
lagret.varde = { urler: ['/gammal'], kom: { '/gammal': '2026-01-01' } };
await mejlaNytt({ poster, sajt: 'https://niclasfohlin.se', lager: lagret, brevoNyckel: 'k', listId: '3', nu: new Date('2026-11-04T19:33:00Z') });
const tvaDagar = anrop.filter(([p]) => p === '/emailCampaigns').map(([, b]) => b.scheduledAt);
if (tvaDagar.join() !== '2026-11-05T07:00:00+01:00,2026-11-06T07:00:00+01:00' || anrop.some(([p]) => p.includes('sendNow'))) { fel++; console.error('två kampanjer utan utrymme', tvaDagar); }
if (lagret.varde.kom['/metoder/ny'] !== '2026-11-04' || lagret.varde.kom['/gammal'] !== '2026-01-01' || lagret.varde.bokat['2026-11-05'] !== 153) { fel++; console.error('kom och bokat', JSON.stringify(lagret.varde)); }
// Går utrymmet inte att läsa väntar kampanjen till morgonen, och inget skickas på chans.
anrop.length = 0;
const lasFel = globalThis.fetch;
globalThis.fetch = async (url, o) => { if (String(url).includes('/account')) return { ok: false, status: 503, text: async () => 'nere' }; return lasFel(url, o); };
lagret.varde = { urler: ['/gammal'] };
await mejlaNytt({ poster: [poster[0], poster[1]], sajt: 'https://niclasfohlin.se', lager: lagret, brevoNyckel: 'k', listId: '3', nu: new Date('2026-11-04T10:00:00Z') });
if (anrop.some(([p]) => p.includes('sendNow')) || anrop.find(([p]) => p === '/emailCampaigns')?.[1].scheduledAt !== '2026-11-05T07:00:00+01:00') { fel++; console.error('okänt utrymme', JSON.stringify(anrop.map(([p, b]) => [p, b.scheduledAt]))); }
globalThis.fetch = lasFel;
dagensKvar = 300;
listan = 100;

// Mallarna: repliken, knappens ord, att allt är absoluta adresser och att varje bild har ett textalternativ.
const SAJT = 'https://niclasfohlin.se';
const metod = { typ: 'metod', etikett: 'Ny metod i stödundervisning: Läsning, åk 2–5', omrade: 'Läsning', url: '/stodundervisning/x', titel: 'Högläsning & par', ingress: 'Första meningen. Andra meningen.', replik: ['Första meningen.'], brod: 'Andra meningen.', bild: { src: '/stodundervisning/x-film-omslag.png', alt: 'Filmen' }, lankar: [{ url: '/stodundervisning/x/lathund', text: 'Lathund', efter: 'fyra sidor' }] };
const kort4 = { typ: 'metod', etikett: 'Ny metod för hela klassen, F–9', url: '/metoder/y', titel: 'Reciprok', ingress: 'I.', replik: ['Vad tror jag?', 'Vad undrar jag?'], kort: { namn: 'Kort', etikett: 'Kort att skriva ut', alla: { text: 'Alla fyra', url: '/metoder/y#blad' }, rader: ['a', 'b', 'c', 'd'].map((n) => ({ namn: n, rad: 'R', url: '/metoder/y#blad', bild: `/metoder/y-minibild-${n}.png` })) } };
const bok = { typ: 'bok', etikett: 'Ny bok', url: '/bocker/z', titel: 'Boken', ingress: 'Om boken.', replik: ['Om boken.'], bild: { src: '/images/bocker/z.jpg', alt: 'Omslaget till Boken' }, forfattare: 'Med Jennie Wilson', lankar: [{ url: 'https://bokus.com/z', text: 'Hos Bokus' }] };
const verktyg = { typ: 'verktyg', etikett: 'Nytt verktyg', url: '/strategier', titel: 'Strategier', ingress: 'Kort.', replik: ['Kort.'] };
const serie = { typ: 'metod', etikett: 'Ny lektion i Ljudlek', url: '/stodundervisning/s', titel: 'Rim', ingress: 'I.', replik: ['I.'], ord: { den: 'lektionen', flera: 'lektioner' } };
for (const [p, ord] of [[metod, 'Öppna metoden'], [text, 'Läs hela krönikan'], [bok, 'Läs om boken'], [verktyg, 'Öppna verktyget'], [serie, 'Öppna lektionen']]) if (knappensOrd(p) !== ord) { fel++; console.error('knappen', p.titel, knappensOrd(p)); }
const mejlen = [[metod], [kort4], [bok], [verktyg], [text], [metod, bok]].map((m) => brev(m, SAJT));
for (const m of mejlen) {
  if (!m.includes('{{ unsubscribe }}') || !m.includes('{{ mirror }}')) { fel++; console.error('foten saknas'); }
  if ([...m.matchAll(/<img\b[^>]*>/g)].some(([x]) => !/\balt="[^"]+"/.test(x) || !/src="https:/.test(x))) { fel++; console.error('en bild utan textalternativ eller hel adress', m.slice(0, 200)); }
  if ([...m.matchAll(/<a\b[^>]*href="([^"]+)"/g)].some(([, u]) => !/^(https:|\{\{)/.test(u))) { fel++; console.error('en länk utan hel adress'); }
  // Outlook i Windows tar inte display:block på en länk, och en tabell i en länk ger ingen klickyta. Knappen har luften på cellen.
  if ([...m.matchAll(/<a\b[^>]*style="([^"]*)"/g)].some(([, s]) => /display:block/.test(s) && !/border-radius:12px/.test(s))) { fel++; console.error('en länk med display:block utanför knappen'); }
  if (/<a\b[^>]*>(?:(?!<\/a>)[\s\S])*<table/.test(m)) { fel++; console.error('en tabell inne i en länk'); }
  if (/ [–—] /.test(m.replace(/<[^>]+>/g, ' '))) { fel++; console.error('ett tankstreck i mejlet'); }
  if (Buffer.byteLength(m) > 100 * 1024) { fel++; console.error('mejlet är för stort, Gmail klipper efter 102 kB'); }
}
if (!mejlen[0].includes('Högläsning &amp; par') || mejlen[0].includes('Högläsning & par')) { fel++; console.error('titeln är inte skyddad'); }
// Repliken är ingressens första mening och står inte en gång till, men resten av ingressen står kvar.
if (mejlen[0].slice(mejlen[0].indexOf('<table')).split('Första meningen.').length !== 2 || !mejlen[0].includes('Andra meningen.')) { fel++; console.error('repliken står två gånger'); }
if (!mejlen[1].includes('Vad tror jag?') || !mejlen[1].includes('Vad undrar jag?') || !mejlen[1].includes('y-minibild-a.png')) { fel++; console.error('metodens kort'); }
if (!mejlen[2].includes('Med Jennie Wilson') || !mejlen[2].includes('Hos Bokus')) { fel++; console.error('bokens mejl'); }

// Månadsbrevet: månaden, topplistorna, Månadens nya och ett brev per månad.
if (forraManaden(new Date('2026-12-01T06:00:00Z')).nyckel !== '2026-11' || forraManaden(new Date('2027-01-01T06:00:00Z')).nyckel !== '2026-12') { fel++; console.error('forraManaden'); }
const okt = manaden('2026-10');
if (okt.start.toISOString() !== '2026-09-30T22:00:00.000Z' || okt.slut.toISOString() !== '2026-10-31T23:00:00.000Z') { fel++; console.error('månadens gränser', okt.start, okt.slut); }
for (const m of ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december']) {
  const forsta = texter[m]?.match(/^[^.]*\./)?.[0];
  // Första meningen blir brevets rubrik, så den är kort i alla tolv.
  if (forsta !== `${m[0].toUpperCase()}${m.slice(1)} är slut.`) { fel++; console.error('månadens första mening', m, forsta); }
}
const allaPoster = [
  { typ: 'metod', url: '/stodundervisning/a', titel: 'A', rad: 'Läsning', ingress: 'A1. A2. A3.', etikett: '', bild: { src: '/a.png', alt: 'a' } },
  { typ: 'metod', url: '/stodundervisning/b', titel: 'B', rad: 'Matematik', ingress: 'B1.', etikett: '' },
  { typ: 'metod', url: '/stodundervisning/c', titel: 'C', rad: 'Skrivning', ingress: 'C1.', etikett: '', datum: '2026-10-05' },
  { typ: 'metod', url: '/stodundervisning/d', titel: 'D', rad: 'Socialt', ingress: 'D1.', etikett: '' },
  { typ: 'metod', url: '/metoder/m', titel: 'M', rad: 'Hela klassen', ingress: 'M1.', etikett: '', datum: '2026-09-01' },
  { typ: 'artikel', url: '/artiklar/t', titel: 'T', rad: 'Krönika', ingress: 'T1.', etikett: '', datum: '2026-10-20', text: { den: 'krönikan' } },
  { typ: 'bok', url: '/bocker/k', titel: 'K', rad: 'Natur', ingress: 'K1.', etikett: '', datum: '2025-01-01', bild: { src: '/k.jpg', alt: 'k' } },
];
const sidor = [{ path: '/stodundervisning/a', count: 1000 }, { path: '/stodundervisning/b/', count: 900 }, { path: '/stodundervisning/c', count: 50 }, { path: '/stodundervisning/d', count: 10 }, { path: '/metoder/m', count: 30 }, { path: '/artiklar/t', count: 20 }, { path: '/bocker/k', count: 5 }, { path: '/okand/sida', count: 500 }, { path: 'fil:x.pdf', event: true, count: 9999 }];
const besok = besokPerSida(sidor);
if (besok.get('/stodundervisning/b') !== 900 || besok.has('fil:x.pdf')) { fel++; console.error('besökPerSida'); }
const samlingar = [{ led: 'stodundervisning', namn: 'Stödundervisning' }, { led: 'metoder', namn: 'Metoder' }, { led: 'artiklar', namn: 'Artiklar' }, { led: 'bocker', namn: 'Böcker' }];
const brevet = manadensBrev({ besok, poster: allaPoster, samlingar, summa: 2525, kom: { '/stodundervisning/d': '2026-10-02' }, manad: okt });
const stodLista = brevet.listor.find((l) => l.namn === 'Stödundervisning');
if (brevet.listor.map((l) => l.namn).join() !== 'Stödundervisning,Metoder,Artiklar,Böcker' || stodLista.rader.map((r) => r.titel).join('') !== 'ABC') { fel++; console.error('listorna', JSON.stringify(brevet.listor)); }
if (brevet.mest.map((x) => x.titel).join('') !== 'AB' || brevet.mestOrd !== 'tätt följd av') { fel++; console.error('mest läst', brevet.mest, brevet.mestOrd); }
// En metod i Stödundervisning är ny bara med dagen den kom: C har ett färskt datum men är ändrad och inte ny, och artikeln har sitt datum.
if (brevet.nyast?.titel !== 'T' || brevet.nyast.rad !== 'Blev månadens mest lästa text.') { fel++; console.error('månadens nya', JSON.stringify(brevet.nyast)); }
if (brevet.forsta !== 'Oktober är slut.' || brevet.summa !== 'Sajtens sidor hade över 2 000 besök i oktober.' || brevet.amne !== 'Månadsbrev: mest läst i oktober' || brevet.manad !== 'Månadsbrev, oktober 2026' || brevet.nyast?.etikett !== 'Nytt i oktober') { fel++; console.error('brevets ord', brevet.forsta, brevet.summa, brevet.amne, brevet.manad, brevet.nyast?.etikett); }
const nytt2 = manadensBrev({ besok, poster: allaPoster, samlingar, summa: 2525, kom: { '/stodundervisning/d': '2026-10-02', '/artiklar/t': '2026-08-01' }, manad: okt });
if (nytt2.nyast?.titel !== 'D' || !nytt2.nyast.rad.includes('Lästes mest av det som var nytt')) { fel++; console.error('nyast utan topplacering', JSON.stringify(nytt2.nyast)); }
const nytt4 = manadensBrev({ besok, poster: allaPoster, samlingar, summa: 2525, kom: { '/stodundervisning/b': '2026-10-02', '/artiklar/t': '2026-08-01' }, manad: okt });
if (!nytt4.nyast?.rad.includes('en av de mest lästa metoderna')) { fel++; console.error('nyast i topplistan', JSON.stringify(nytt4.nyast)); }
const nytt3 = manadensBrev({ besok, poster: allaPoster, samlingar, summa: 2525, kom: { '/stodundervisning/a': '2026-10-02', '/artiklar/t': '2026-08-01' }, manad: okt });
if (nytt3.nyast?.titel !== 'A' || nytt3.nyast.rad !== 'Blev månadens mest lästa metod.' || nytt3.mest) { fel++; console.error('den mest lästa är månadens nya', JSON.stringify(nytt3.nyast), nytt3.mest); }
const m = manadsMejl(brevet, SAJT);
if (!m.includes('Oktober är slut.') || !m.includes('Mest läst i oktober') || !m.includes('Nytt i oktober') || !m.includes('{{ unsubscribe }}') || Buffer.byteLength(m) > 100 * 1024) { fel++; console.error('månadsmejlet'); }
if (/\b1000\b|\b900\b/.test(m.replace(/<[^>]+>/g, ' '))) { fel++; console.error('besökstalen står i mejlet'); }

// Hela kedjan med härmad GoatCounter, Brevo och lager: den 1 skickas brevet, en gång, ett fel försöks igen dagen efter, och Brevos
// kampanjlista avgör när en körning stannade mitt i. Lagret kopierar som JSON, så att koden inte kan dela objekt med provet.
const lagerNytt = () => ({ varden: {}, trasig: false, async get(k) { return this.varden[k] === undefined ? null : JSON.parse(this.varden[k]); }, async setJSON(k, v) { if (this.trasig) throw new Error('lagret svarar inte'); this.varden[k] = JSON.stringify(v); } });
const brevoLaget = { anrop: [], kampanjer: [], sendNowFel: false, kvar: 300, antal: 150 };
let gcFel = false;
let gcSumma = 2525;
const hamta = async (url) => {
  const u = String(url);
  if (u.includes('goatcounter')) {
    if (gcFel) return { ok: false, status: 503 };
    if (u.includes('/stats/total')) return { ok: true, json: async () => ({ total: gcSumma + 800, total_events: 800 }) };
    const namn = new URL(u).searchParams.get('include_paths').split(',');
    return { ok: true, json: async () => ({ hits: sidor.filter((s) => !s.event && namn.includes(s.path)).map((s, i) => ({ ...s, path_id: i })), more: false }) };
  }
  if (u.endsWith('/nytt.json')) return { ok: true, json: async () => ({ poster: allaPoster, samlingar }) };
  throw new Error(u);
};
globalThis.fetch = async (url, o = {}) => {
  const sokvag = String(url).replace('https://api.brevo.com/v3', '');
  const ok = (v) => ({ ok: true, text: async () => JSON.stringify(v) });
  if (sokvag === '/account') return ok({ plan: [{ credits: brevoLaget.kvar, creditsType: 'sendLimit' }] });
  if (sokvag.startsWith('/contacts/lists/')) return ok({ count: brevoLaget.antal });
  if (sokvag.startsWith('/emailCampaigns?')) return ok({ campaigns: brevoLaget.kampanjer });
  if (/^\/emailCampaigns\/\d+\?/.test(sokvag)) return ok({ status: brevoLaget.kampanjer.find((k) => sokvag.includes(String(k.id)))?.status ?? 'draft' });
  if (sokvag === '/smtp/email' && brevoLaget.larmFel) { brevoLaget.anrop.push([sokvag]); return { ok: false, status: 500, text: async () => 'fel' }; }
  brevoLaget.anrop.push([sokvag, o.body ? JSON.parse(o.body) : undefined, o.method]);
  if (sokvag === '/emailCampaigns') { const id = 70 + brevoLaget.kampanjer.length; brevoLaget.kampanjer.push({ id, name: JSON.parse(o.body).name, status: 'draft' }); return ok({ id }); }
  if (sokvag.endsWith('/sendNow')) {
    if (brevoLaget.sendNowFel) return { ok: false, status: 500, text: async () => 'fel' };
    brevoLaget.kampanjer.find((k) => sokvag.includes(String(k.id))).status = 'sent';
  }
  return ok({});
};
const kedjan = (lager, nu) => skickaManadsbrev({ sajt: SAJT, lager, brevoNyckel: 'k', listId: '2', gcNyckel: 'g', hamta, paus: 0, nu: new Date(nu) });
const sant = (villkor, ...text) => { if (!villkor) { fel++; console.error(...text); } };
const utskick = () => brevoLaget.anrop.filter(([p]) => p.endsWith('/sendNow')).length;
const antalKampanjer = () => brevoLaget.anrop.filter(([p]) => p === '/emailCampaigns').length;
const larm = () => brevoLaget.anrop.filter(([p]) => p === '/smtp/email').length;
const nollstall = () => { brevoLaget.anrop = []; brevoLaget.kampanjer = []; brevoLaget.sendNowFel = false; brevoLaget.larmFel = false; brevoLaget.kvar = 300; brevoLaget.antal = 150; gcFel = false; gcSumma = 2525; };

{
  // Provkörningen skriver inget.
  const lager = lagerNytt();
  const provet = await skickaManadsbrev({ sajt: SAJT, lager, brevoNyckel: 'k', listId: '2', gcNyckel: 'g', hamta, paus: 0, nu: new Date('2026-11-01T06:00:00Z'), prov: true });
  sant(provet.steg === 'prov: inget skickat' && !brevoLaget.anrop.length && !lager.varden.manadsbrev, 'provkörningen skickade något', provet);
  // GoatCounter är nere den 1: Niclas får besked, och den 2 går brevet. Den 3 händer inget.
  gcFel = true;
  await kedjan(lager, '2026-11-01T06:00:00Z').then(() => sant(false, 'felet försvann'), () => {});
  sant(JSON.parse(lager.varden.manadsbrev)['2026-10'].status === 'fel' && larm() === 1 && !antalKampanjer(), 'felet sades inte till');
  gcFel = false;
  brevoLaget.anrop = [];
  const andra = await kedjan(lager, '2026-11-02T06:00:00Z');
  sant(andra.steg === 'månadsbrevet skickat' && antalKampanjer() === 1 && utskick() === 1 && brevoLaget.anrop[0][1].subject === 'Månadsbrev: mest läst i oktober', 'andra dagen', andra);
  // Månadens tal sparas med brevet: alla besök, posternas, listorna och det nya.
  const sparat = JSON.parse(lager.varden.manadsbrev)['2026-10'].siffror;
  sant(sparat?.besok === 2525 && sparat.posternas === 2015 && sparat.listor[0].rader[0].besok === 1000 && sparat.nyast === '/artiklar/t', 'månadens tal sparades inte', JSON.stringify(sparat));
  brevoLaget.anrop = [];
  const tredje = await kedjan(lager, '2026-11-03T06:00:00Z');
  sant(!brevoLaget.anrop.length && tredje.steg.startsWith('redan gjort'), 'brevet gick två gånger', tredje);
}
{
  // Utskicket lyckas men sista skrivningen misslyckas: nästa körning ser kampanjen i Brevo och skickar inte igen.
  nollstall();
  const lager = lagerNytt();
  const lagra = lager.setJSON.bind(lager);
  lager.setJSON = async (k, v) => { if (k === 'manadsbrev' && v['2026-10']?.status === 'skickad') throw new Error('lagret svarar inte'); return lagra(k, v); };
  await kedjan(lager, '2026-11-01T06:00:00Z').then(() => sant(false, 'skrivfelet försvann'), () => {});
  lager.setJSON = lagra;
  const nasta = await kedjan(lager, '2026-11-02T06:00:00Z');
  sant(utskick() === 1 && antalKampanjer() === 1 && nasta.steg.startsWith('redan gjort'), 'skickat brev skickades igen', utskick(), antalKampanjer(), nasta);
}
{
  // Kampanjen skapas men utskicket faller: nästa körning tar samma kampanj och skapar ingen ny.
  nollstall();
  const lager = lagerNytt();
  brevoLaget.sendNowFel = true;
  await kedjan(lager, '2026-11-01T06:00:00Z').then(() => sant(false, 'sendNow-felet försvann'), () => {});
  brevoLaget.sendNowFel = false;
  await kedjan(lager, '2026-11-02T06:00:00Z');
  sant(antalKampanjer() === 1 && brevoLaget.kampanjer[0].status === 'sent', 'en andra kampanj skapades', antalKampanjer());
}
{
  // En schemalagd kampanj som Brevo sedan stoppar: nästa körning säger till, en gång när beskedet kom fram, och skapar ingen ny.
  nollstall();
  brevoLaget.kvar = 20;
  const lager = lagerNytt();
  await kedjan(lager, '2026-11-01T10:00:00Z');
  brevoLaget.kvar = 300;
  brevoLaget.kampanjer[0].status = 'suspended';
  brevoLaget.larmFel = true;
  brevoLaget.anrop = [];
  const utanBesked = await kedjan(lager, '2026-11-02T06:00:00Z');
  sant(larm() === 1 && JSON.parse(lager.varden.manadsbrev)['2026-10'].status === 'stoppad' && JSON.parse(lager.varden.manadsbrev)['2026-10'].larmad === false && utanBesked.steg.startsWith('redan gjort'), 'en stoppad kampanj', larm(), lager.varden.manadsbrev);
  brevoLaget.larmFel = false;
  brevoLaget.anrop = [];
  await kedjan(lager, '2026-11-03T06:00:00Z');
  sant(larm() === 1 && !antalKampanjer() && JSON.parse(lager.varden.manadsbrev)['2026-10'].larmad === true, 'beskedet försöktes inte igen', larm(), antalKampanjer());
  brevoLaget.anrop = [];
  await kedjan(lager, '2026-11-03T07:00:00Z');
  sant(!larm(), 'beskedet kom två gånger', larm());
}
{
  // Stannade körningen efter att loggen sa skapad utan någon kampanj i Brevo går brevet ändå.
  nollstall();
  const lager = lagerNytt();
  await lager.setJSON('manadsbrev', { '2026-10': { status: 'skapad' } });
  const r = await kedjan(lager, '2026-11-02T06:00:00Z');
  sant(r.steg === 'månadsbrevet skickat' && antalKampanjer() === 1, 'brevet försvann efter en körning som stannade', r);
}
{
  // Besöken på posterna är orimligt få: då läser brevet fel, och inget går ut. Niclas får besked.
  nollstall();
  gcSumma = 500000;
  const lager0 = lagerNytt();
  await kedjan(lager0, '2026-11-01T06:00:00Z').then(() => sant(false, 'rimlighetsspärren släppte igenom'), () => {});
  sant(!antalKampanjer() && larm() === 1, 'rimlighetsspärren', antalKampanjer(), larm());
  // Lagret är nere: Niclas får ändå besked. Listan är större än gränsen: inget går ut, och han får besked.
  nollstall();
  const lager = lagerNytt();
  lager.get = async () => { throw new Error('lagret svarar inte'); };
  await kedjan(lager, '2026-11-01T06:00:00Z').then(() => sant(false, 'lagerfelet försvann'), () => {});
  sant(larm() === 1, 'lagerfelet sades inte till', larm());
  nollstall();
  brevoLaget.antal = 301;
  const lager2 = lagerNytt();
  await kedjan(lager2, '2026-11-01T06:00:00Z').then(() => sant(false, 'den stora listan gick igenom'), () => {});
  sant(!antalKampanjer() && larm() === 1, 'den stora listan', antalKampanjer(), larm());
  // Dagens rest räcker inte: brevet läggs på nästa morgon och bokas.
  nollstall();
  brevoLaget.kvar = 20;
  const lager3 = lagerNytt();
  const r = await kedjan(lager3, '2026-11-01T10:00:00Z');
  sant(r.steg.includes('schemalagt') && brevoLaget.anrop.some(([p, , m]) => m === 'PUT') && JSON.parse(lager3.varden.skickat).bokat['2026-11-02'] === 150 && !utskick(), 'nästa morgon', r);
}

// Roten för statistiken: frågan med namn, med och utan snedstreck, 100 sidor i varje fråga, och det som går fel.
{
  const period = { start: new Date('2026-10-01T00:00:00Z'), slut: new Date('2026-11-01T00:00:00Z') };
  const fragor = [];
  const hits = [{ path: '/a', count: 5 }, { path: '/a/', count: 2 }, { path: '/b', count: 1 }];
  const svara = (json, status = 200) => ({ ok: status < 400, status, json: async () => json });
  const hamta2 = async (u) => { const p = new URL(String(u)).searchParams; const namn = p.get('include_paths').split(','); fragor.push({ namn, byNamn: p.get('path_by_name'), limit: p.get('limit'), start: p.get('start') }); return svara({ hits: hits.filter((h) => namn.includes(h.path)), more: false }); };
  const sidlista = Array.from({ length: 120 }, (_, i) => (i === 0 ? '/a' : i === 1 ? '/b' : `/x${i}`));
  const b2 = await sidornasBesok('k', [...sidlista, '/a'], { ...period, hamta: hamta2, paus: 0 });
  sant(b2.get('/a') === 7 && b2.get('/b') === 1 && b2.size === 2, 'sidornas besök', [...b2]);
  sant(fragor.length === 3 && fragor.every((q) => q.byNamn === 'true' && q.limit === '100' && q.namn.length <= 100) && fragor[0].namn.includes('/a/') && fragor[0].start === '2026-10-01T00:00:00Z', 'frågan med namn', JSON.stringify(fragor.map((q) => q.namn.length)));
  const ofull = await sidornasBesok('k', ['/a'], { ...period, hamta: async () => svara({ hits: [], more: true }), paus: 0 }).then(() => null, (e) => e.message);
  sant(/inte är helt/.test(ofull ?? ''), 'ett ofullständigt svar stannar inte', ofull);
  let stoppad = 0;
  const hamta429 = async () => (++stoppad < 3 ? svara({}, 429) : svara({ hits: [{ path: '/a', count: 1 }], more: false }));
  const b3 = await sidornasBesok('k', ['/a'], { ...period, hamta: hamta429, paus: 0 });
  sant(b3.get('/a') === 1 && stoppad === 3, 'ett stoppat anrop görs inte om', stoppad);
  const komma = await sidornasBesok('k', ['/a,b'], { ...period, hamta: hamta2, paus: 0 }).then(() => null, (e) => e.message);
  sant(/kommatecken/.test(komma ?? ''), 'en adress med kommatecken stannar inte', komma);
  const nere = await sidornasBesok('k', ['/a'], { ...period, hamta: async () => svara({}, 500), paus: 0 }).then(() => null, (e) => e.message);
  sant(/500/.test(nere ?? ''), 'ett fel från GoatCounter stannar inte', nere);
  const summan = await periodensBesok('k', { ...period, hamta: async () => svara({ total: 42636, total_events: 11309 }) });
  sant(summan === 31327, 'periodens besök', summan);
  let anropen = 0;
  const alla = await allaHits('k', { ...period, paus: 0, hamta: async () => (++anropen === 1 ? svara({ hits: [{ path_id: 1, path: '/a', count: 1 }], more: true }) : svara({ hits: [{ path_id: 2, path: 'fil:x', event: true, count: 1 }], more: false })) });
  sant(alla.length === 2 && anropen === 2, 'alla hits', alla.length, anropen);
}

if (fel) { console.error(`utskicksprov: ${fel} fel`); process.exit(1); }
console.log('utskicksprov: sändtiden 07.00–21.00 med sommartiden, dagsgränsen, verktygen i ett eget utskick, mejlens mallar och månadsbrevet med topplistor, Månadens nya, fel och ett brev per månad svarar rätt.');
