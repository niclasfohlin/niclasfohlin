// Kommentarerna på sajten.
//
// Waline sköter lagringen, inloggningen och panelen där kommentarerna godkänns (/ui). Den här
// filen är grinden framför: avstängningen, vilka anrop en läsare får göra, robotprovet, taket i
// krediter, registreringen av administratören, mellanlagringen av listorna i Netlifys CDN och
// mejlen genom Brevo. Hur lagret hänger ihop, slås av och på och mäts står i DRIFT.md under
// Kommentarer.
//
// Miljövariabler: KOMMENTARER (av eller på), KOMMENTARER_BUDGET (krediter per period, förval
// 50), TURNSTILE_KEY och TURNSTILE_SECRET (Cloudflares robotkontroll, sätts av Niclas), och de
// som redan finns: BREVO_API_KEY, UTSKICK_HEMLIGHET, SITE_URL. Databasen (Netlify Database)
// ger NETLIFY_DB_URL själv.

import { createHash, createHmac } from 'node:crypto';
import http from 'node:http';
import serverless from 'serverless-http';
import jwt from 'jsonwebtoken';
import Waline from '@waline/vercel';
// Samma version som Waline själv använder (0.1.1), så att lösenordet går att logga in med.
import phpass from 'phpass';
import { getConnectionString, getDatabase } from '@netlify/database';
import { purgeCache } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import {
  PREFIX, SAJT, ADMIN_EPOST, LAGER, kommentarerPa, budget, hemlighet, signera, verifiera, skydda,
  skickaMejl, mejl, lasForbrukning, raknaAnrop, uppskattning, varnaVidTak, inomTak, TAK,
} from '../lib/kommentarer.mjs';

const EPOST = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Panelen laddas från jsDelivr i en låst version i stället för Walines förval unpkg.
const PANEL = 'https://cdn.jsdelivr.net/npm/@waline/admin@0.35.0/dist/admin.js';
const PROV_MIN_MS = 3000;

// Walines egna felmeddelanden på svenska. Klienten skickar lang=sv.
const SVENSKA = {
  'Duplicate Content': 'Den kommentaren har redan skickats.',
  'Comment too fast': 'Vänta en minut innan du skickar nästa kommentar.',
  'Comment too fast!': 'Vänta en minut innan du skickar nästa kommentar.',
  USER_EXIST: 'Adressen är redan registrerad.',
  USER_NOT_EXIST: 'Användaren finns inte.',
  TOKEN_EXPIRED: 'Inloggningen har gått ut. Logga in igen.',
  TWO_FACTOR_AUTH_ERROR_DETAIL: 'Fel kod.',
};

const json = (status, data) => ({
  statusCode: status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  body: JSON.stringify(data),
});
const fel = (status, errmsg) => json(status, { errno: status, errmsg });

// ---------------------------------------------------------------------------------------------
// Waline, startat en gång per kall start.

let waline;

function startaWaline() {
  if (waline) return waline;
  const db = new URL(getConnectionString());
  const lokal = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(db.hostname);
  Object.assign(process.env, {
    PG_HOST: db.hostname,
    PG_PORT: db.port || '5432',
    PG_USER: decodeURIComponent(db.username),
    PG_PASSWORD: decodeURIComponent(db.password),
    PG_DB: decodeURIComponent(db.pathname.slice(1)) || 'postgres',
    PG_SSL: lokal ? 'false' : 'true',
    JWT_TOKEN: hemlighet('inloggning'),
    COMMENT_AUDIT: 'true',
    AKISMET_KEY: 'false',
    DISABLE_USERAGENT: 'true',
    DISABLE_REGION: 'true',
    MARKDOWN_TEX: 'false',
    MARKDOWN_HIGHLIGHT: 'false',
    MARKDOWN_EMOJI: 'false',
    MARKDOWN_SUB: 'false',
    MARKDOWN_SUP: 'false',
    IPQPS: '60',
    SITE_NAME: 'niclasfohlin.se',
    SITE_URL: SAJT,
    // Ingen avatartjänst: annars skickas en kontrollsumma av varje e-postadress till libravatar.
    GRAVATAR_STR: `${SAJT}/favicon.svg`,
    WALINE_ADMIN_MODULE_ASSET_URL: PANEL,
    // Waline frågar annars en extern OAuth-tjänst vid varje anrop. En data-adress svarar direkt.
    OAUTH_URL: 'data:application/json,%7B%22services%22%3A%5B%5D%7D',
    SECURE_DOMAINS: 'niclasfohlin.se,/^[a-z0-9-]+--niclasfohlin\\.netlify\\.app$/',
    // Waline räknar ut sitt prefix (/.netlify/functions/kommentarer) ur _HANDLER när den laddas.
    _HANDLER: 'kommentarer.handler',
  });
  const app = Waline({
    env: 'netlify',
    locales: { sv: SVENSKA },
    avatarUrl: () => `${SAJT}/favicon.svg`,
    preSave,
    postSave,
    preUpdate,
    preDelete,
    postUpdate,
    postDelete,
  });
  waline = serverless(http.createServer(app));
  return waline;
}

// Krokarna körs inne i Waline med styrenheten som this.
const arAdmin = (ctl) => ctl.ctx.state.userInfo?.type === 'administrator';
const rubrik = (ctl, url) => {
  try {
    const t = decodeURIComponent(ctl.ctx.req.headers['x-kommentar-titel'] || '');
    return t.trim().slice(0, 200) || url;
  } catch {
    return url;
  }
};

async function preSave(data) {
  if (arAdmin(this)) {
    // Svar från administratören får namnet och adressen från kontot.
    const { display_name: namn, email } = this.ctx.state.userInfo;
    data.nick = namn || data.nick || 'Niclas Fohlin';
    data.mail = email || data.mail;
    data.ua = '';
    return;
  }
  const lankar = (String(data.comment).match(/https?:\/\//gi) || []).length;
  if (lankar > 2) return { errmsg: 'En kommentar får innehålla högst två länkar.' };
  // Webbläsaren och hemsidan sparas inte. IP-adressen är redan utbytt mot en kontrollsumma.
  data.ua = '';
  data.link = '';
}

async function postSave(kommentar, foralder) {
  // En kommentar som väntar på granskning ändrar inte det läsarna ser; en godkänd gör det.
  if (kommentar.status === 'approved') await sidanAndrad(this, kommentar.url);
  const titel = rubrik(this, kommentar.url);
  if (!arAdmin(this)) {
    const { amne, text } = mejl.nyKommentar({
      nick: kommentar.nick, mail: kommentar.mail, kommentar: kommentar.comment, titel, url: kommentar.url,
      skrap: kommentar.status === 'spam',
    });
    await mejla({ till: ADMIN_EPOST, amne, text });
  }
  if (kommentar.status === 'approved') await mejlaSvar(foralder, kommentar, titel);
}

/** Kommentarerna ett anrop gäller. Panelen kan ändra flera på en gång: id kan vara 1,2,3. */
async function beroda(ctl, id) {
  const ids = String(id ?? '').split(',').filter(Boolean);
  if (!ids.length) return [];
  return ctl.modelInstance.select({ objectId: ids.length === 1 ? ids[0] : ['IN', ids] });
}
const sidorUr = (rader) => [...new Set(rader.map((r) => r.url).filter(Boolean))];

async function preUpdate(data) {
  const rader = await beroda(this, data.objectId);
  this.ctx.state.andradeSidor = sidorUr(rader);
  this.ctx.state.godkandaNu = data.status === 'approved' ? rader.filter((r) => r.status !== 'approved') : [];
}

async function postUpdate() {
  for (const url of this.ctx.state.andradeSidor || []) await sidanAndrad(this, url);
  for (const godkand of this.ctx.state.godkandaNu || []) {
    if (!godkand.pid) continue;
    const [foralder] = await this.modelInstance.select({ objectId: godkand.pid });
    await mejlaSvar(foralder, godkand, rubrik(this, godkand.url));
  }
}

async function preDelete(id) {
  this.ctx.state.andradeSidor = sidorUr(await beroda(this, id));
}

async function postDelete() {
  for (const url of this.ctx.state.andradeSidor || []) await sidanAndrad(this, url);
}

async function mejlaSvar(foralder, svar, titel) {
  const till = String(foralder?.mail || '').trim().toLowerCase();
  if (!EPOST.test(till) || till === ADMIN_EPOST || till === String(svar.mail || '').trim().toLowerCase()) return;
  const { amne, text } = mejl.svar({
    mottagare: foralder.nick, svarare: svar.nick || 'Niclas Fohlin', kommentar: svar.comment, titel,
    url: svar.url, id: svar.objectId,
  });
  await mejla({ till, amne, text });
}

/** Alla mejl från kommentarerna går hit, under dygnets tak, så att en flod av kommentarer inte kan
 *  ta Brevos 300 mejl per dygn från nyhetsbreven. Kommentarerna sparas ändå; bara mejlet uteblir. */
async function mejla(brev) {
  if (!(await inomTak(oppnaLager(), 'mejl-dygn', TAK.mejl))) {
    console.error('kommentarer: dygnets tak för mejl är nått, mejlet skickades inte:', brev.amne);
    return false;
  }
  return skickaMejl(brev);
}

// ---------------------------------------------------------------------------------------------
// Mellanlagringen. Det som gör att läsarna inte kostar krediter:
//   1. CDN:et svarar på listan för en sida utan att funktionen körs, i en timme eller tills sidan ändras.
//   2. Missar CDN:et svarar funktionen ur Blobs: sidor utan godkända kommentarer (lagret "sidor")
//      får en tom lista direkt, och andra sidors listor ligger sparade under lista/<sida>/.
//   3. Först när inget av det finns frågas Waline och databasen.
// När något ändras på en sida töms bara den sidans lista, i Blobs och i CDN:et.

const sidnyckel = (url) => createHash('sha1').update(String(url)).digest('hex').slice(0, 16);

/** Sidorna som har godkända kommentarer. Saknas listan i Blobs (första gången, eller efter
 *  npm run kommentarer -- bygg-om) läses den ur databasen och sparas; annars rörs databasen inte. */
async function kandaSidor(lager) {
  const lagrade = await lager.get('sidor', { type: 'json' }).catch(() => undefined);
  if (Array.isArray(lagrade)) return { sidor: new Set(lagrade), fragade: false };
  const rader = await getDatabase().sql`SELECT DISTINCT url FROM wl_comment WHERE status NOT IN ('waiting', 'spam') AND url IS NOT NULL`;
  const sidor = rader.map((r) => r.url);
  await lager.setJSON('sidor', sidor).catch(() => {});
  return { sidor: new Set(sidor), fragade: true };
}

async function sidanAndrad(ctl, url) {
  if (!url) return;
  const lager = oppnaLager();
  try {
    const antal = await ctl.modelInstance.count({ url, status: ['NOT IN', ['waiting', 'spam']] });
    const { sidor } = await kandaSidor(lager);
    if (antal > 0) sidor.add(url);
    else sidor.delete(url);
    await lager.setJSON('sidor', [...sidor]);
    const { blobs } = await lager.list({ prefix: `lista/${sidnyckel(url)}/` });
    await Promise.all(blobs.map((b) => lager.delete(b.key)));
  } catch (e) {
    console.error('kommentarer: sidans lista kunde inte tömmas i Blobs:', e?.message);
  }
  try {
    await purgeCache({ tags: [`kommentarer-${sidnyckel(url)}`] });
  } catch (e) {
    console.error('kommentarer: mellanlagret rensades inte:', e?.message);
  }
}

const listnyckel = (q) => `lista/${sidnyckel(q.path)}/${Number(q.page) || 1}-${Number(q.pageSize) || 10}-${q.sortBy || 'insertedAt_desc'}`;

/** Svaret på en lista, som Waline skulle ha gett det. */
const listsvar = (data) => ({
  statusCode: 200,
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ errno: 0, errmsg: '', data }),
});

// ---------------------------------------------------------------------------------------------
// Grinden.

/** Blobs bär kreditmätaren. Går lagret inte att öppna fortsätter kommentarerna utan mätare, och
 *  felet syns i funktionsloggen. */
// Lagret delas annars mellan alla versioner av sajten. En förhandsversion har en egen databasgren,
// och dess listor får inte hamna i den riktiga sajtens lager: den får ett eget, kommentarer-<sammanhang>.
let lagrets = LAGER;
const valjLager = (context) => {
  const sammanhang = context?.deploy?.context;
  lagrets = !sammanhang || sammanhang === 'production' ? LAGER : `${LAGER}-${sammanhang}`;
};

function oppnaLager() {
  try {
    return getStore(lagrets);
  } catch (e) {
    console.error('kommentarer: lagret för kreditmätaren gick inte att öppna:', e?.message);
    return { get: async () => null, set: async () => {}, setJSON: async () => {}, list: async () => ({ blobs: [] }), delete: async () => {} };
  }
}

/** Det en läsare utan inloggning får göra. Allt annat svarar 404 och når aldrig databasen. */
function anonymtAnrop(metod, del, q) {
  if (del === '/api/comment' && metod === 'GET' && q.path && !q.type) return 'las';
  if (del === '/api/comment' && metod === 'POST') return 'skriv';
  if (del === '/api/token' && (metod === 'POST' || metod === 'GET')) return 'inloggning';
  if (del === '/api/token/2fa' && metod === 'GET') return 'inloggning';
  return null;
}

function inloggad(headers) {
  const h = headers.authorization || '';
  if (!/^Bearer /i.test(h)) return false;
  try {
    return Boolean(jwt.verify(h.slice(7), hemlighet('inloggning')));
  } catch {
    return false;
  }
}

/** Läsarens IP byts mot en kontrollsumma i ett privat nät. Waline spärrar fortfarande en
 *  avsändare som skriver för tätt, men ingen riktig adress hamnar i databasen. */
function falskIp(event) {
  const h = event.headers;
  const ip = h['x-nf-client-connection-ip'] || String(h['x-forwarded-for'] || '').split(',')[0].trim()
    || event.requestContext?.identity?.sourceIp || '';
  const b = createHmac('sha256', hemlighet('ip')).update(ip).digest();
  return `10.${b[0]}.${b[1]}.${b[2]}`;
}

function bytIp(event) {
  const h = event.headers;
  const falsk = falskIp(event);
  for (const namn of ['x-forwarded-for', 'x-nf-client-connection-ip', 'x-real-ip', 'client-ip']) {
    h[namn] = falsk;
    if (event.multiValueHeaders) event.multiValueHeaders[namn] = [falsk];
  }
  if (event.requestContext?.identity) event.requestContext.identity.sourceIp = falsk;
}

function lasKropp(event) {
  if (!event.body) return {};
  const text = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  try {
    return JSON.parse(text);
  } catch {
    return Object.fromEntries(new URLSearchParams(text));
  }
}

function provaKommentar(event, kropp) {
  const prov = verifiera('prov', event.headers['x-kommentar-prov']);
  const alder = prov ? Date.now() - prov.s : -1;
  if (!prov || alder < PROV_MIN_MS || alder > 86400000) return 'Kommentaren kunde inte skickas. Ladda om sidan och försök igen.';
  const nick = String(kropp.nick ?? '').trim();
  const mail = String(kropp.mail ?? '').trim();
  const text = String(kropp.comment ?? '').trim();
  if (nick.length < 2 || nick.length > 60) return 'Skriv ditt namn.';
  if (!EPOST.test(mail) || mail.length > 120) return 'Skriv en giltig e-postadress.';
  if (!text) return 'Skriv en kommentar.';
  if (text.length > 4000) return 'Kommentaren är för lång. Högst 4 000 tecken.';
  return null;
}

/** Svaret på listan mellanlagras i Netlifys CDN tills en kommentar skrivs, godkänns eller tas
 *  bort. Då vaknar varken funktionen eller databasen när en läsare öppnar kommentarerna. */
function mellanlagra(svar, url) {
  for (const k of Object.keys(svar.multiValueHeaders || {})) {
    if (/^(cache-control|netlify-)/i.test(k)) delete svar.multiValueHeaders[k];
  }
  svar.headers = {
    ...svar.headers,
    'cache-control': 'public, max-age=0, must-revalidate',
    // En timme. Listan töms när sidan ändras (sidanAndrad); tiden är skyddsnätet om en tömning
    // missar. Det kostar nästan inget: CDN:et frågar då funktionen, som svarar ur Blobs.
    'netlify-cdn-cache-control': 'public, durable, max-age=3600',
    'netlify-cache-tag': `kommentarer, kommentarer-${sidnyckel(url)}`,
    'netlify-vary': 'query,header=Authorization',
  };
  return svar;
}

// Netlifys nyare funktionsform (Request in, Response ut), som sajtens andra funktioner. Waline är
// skriven för Lambdas form, så anropet görs om till en Lambda-händelse och svaret tillbaka.
export default async (req, context) => {
  const url = new URL(req.url);
  const kropp = ['GET', 'HEAD'].includes(req.method) ? null : Buffer.from(await req.arrayBuffer());
  const headers = Object.fromEntries(req.headers);
  const fraga = {};
  const flerFraga = {};
  for (const [k, v] of url.searchParams) {
    fraga[k] = v;
    (flerFraga[k] ??= []).push(v);
  }
  const svar = await behandla({
    httpMethod: req.method,
    path: url.pathname,
    headers,
    multiValueHeaders: Object.fromEntries(Object.entries(headers).map(([k, v]) => [k, [v]])),
    queryStringParameters: fraga,
    multiValueQueryStringParameters: flerFraga,
    body: kropp ? kropp.toString('base64') : null,
    isBase64Encoded: Boolean(kropp),
    requestContext: { identity: { sourceIp: context?.ip || '' } },
  }, context);
  const ut = new Headers();
  for (const [k, v] of Object.entries(svar.headers || {})) if (v !== undefined) ut.set(k, String(v));
  for (const [k, varden] of Object.entries(svar.multiValueHeaders || {})) {
    ut.delete(k);
    for (const v of varden) ut.append(k, String(v));
  }
  // Längden räknas om av Response; grinden kan ha ändrat kroppen.
  ut.delete('content-length');
  const tom = svar.body == null || [204, 304].includes(svar.statusCode);
  return new Response(tom ? null : svar.isBase64Encoded ? Buffer.from(svar.body, 'base64') : svar.body, { status: svar.statusCode, headers: ut });
};

async function behandla(event, context) {
  const start = Date.now();
  if (!kommentarerPa()) return fel(410, 'Kommentarerna är avstängda.');

  const metod = event.httpMethod;
  const sokvag = event.path || '/';
  const del = sokvag.startsWith(PREFIX) ? sokvag.slice(PREFIX.length) || '/' : sokvag;
  const q = event.queryStringParameters || {};
  valjLager(context);
  const lager = oppnaLager();
  // Walines egen adress, som panelen ropar på. Tas ur anropet så att den stämmer lokalt (http) och
  // i en förhandsversion lika väl som på sajten.
  process.env.SERVER_URL = `${process.env.NETLIFY_DEV ? `http://${event.headers.host}` : bas(event)}${PREFIX}`;
  let databas = false;

  try {
    if (del === '/prov' && metod === 'GET') return json(200, { t: signera('prov', { s: Date.now() }) });
    if (del === '/' || del === '/admin') return { statusCode: 302, headers: { location: `${PREFIX}/ui` }, body: '' };
    if (del === '/registrera') {
      databas = true;
      return await registrering(event, lager);
    }

    let svar;
    if (/^\/ui(\/|$)/.test(del)) {
      if (metod !== 'GET') return fel(405, 'Bara GET.');
      svar = await startaWaline()(event, context);
      // Panelen finns inte på svenska och väljer annars kinesiska. Engelska tills Niclas väljer annat.
      if (typeof svar.body === 'string' && !svar.isBase64Encoded) {
        // Registrering och glömt lösenord går genom länken till Niclas gmail (/kommentarer/registrera),
        // eftersom Waline här saknar egen e-post. Panelens egna länkar dit döljs.
        svar.body = svar.body.replace('<body>', `<body>
    <script>try { localStorage.getItem('i18nextLng') || localStorage.setItem('i18nextLng', 'en-US'); } catch (e) {}</script>
    <style>a[href$="/ui/forgot"], a[href$="/ui/register"] { display: none !important; }</style>`);
      }
      return svar;
    }
    if (!del.startsWith('/api/')) return fel(404, 'Finns inte.');

    const admin = inloggad(event.headers);
    let slag = null;
    if (!admin) {
      delete event.headers.authorization;
      if (event.multiValueHeaders) delete event.multiValueHeaders.authorization;
      slag = anonymtAnrop(metod, del, q);
      if (!slag) return fel(404, 'Finns inte.');
    }

    // Inloggningen kan inte gissas i all oändlighet: tio försök i timmen per avsändare, fyrtio för alla.
    if (slag === 'inloggning' && metod === 'POST') {
      const inom = (await inomTak(lager, `inloggning/${falskIp(event)}`, TAK.inloggning))
        && (await inomTak(lager, 'inloggning-alla', TAK.inloggningAlla));
      if (!inom) return fel(429, 'För många inloggningsförsök. Vänta en timme och försök igen.');
    }

    if (slag === 'skriv') {
      const f = await lasForbrukning(lager);
      if (uppskattning(f).summa >= budget()) {
        return fel(503, 'Kommentarerna tar paus resten av månaden. De som redan finns syns som vanligt.');
      }
      const kropp = lasKropp(event);
      if (kropp.hemsida) return json(200, { errno: 0, errmsg: '', data: { status: 'waiting' } });
      const problem = provaKommentar(event, kropp);
      if (problem) return fel(400, problem);
    }

    // Listan för en läsare: ur Blobs om det går, så att databasen får sova.
    if (slag === 'las') {
      const { sidor, fragade } = await kandaSidor(lager);
      databas = fragade;
      if (!sidor.has(q.path)) {
        const storlek = Number(q.pageSize) || 10;
        return mellanlagra(listsvar({ page: Number(q.page) || 1, totalPages: 0, pageSize: storlek, count: 0, data: [] }), q.path);
      }
      const sparad = await lager.get(listnyckel(q), { type: 'json' }).catch(() => null);
      if (sparad) return mellanlagra(listsvar(sparad), q.path);
    }

    bytIp(event);
    databas = true;
    svar = await startaWaline()(event, context);
    // Walines fel bär databasens egna meddelanden. De går till loggen, inte till läsaren.
    if (svar.statusCode >= 500) {
      console.error('kommentarer: Waline svarade', svar.statusCode, String(svar.body).slice(0, 500));
      return fel(svar.statusCode, 'Något gick fel. Försök igen om en stund.');
    }
    if (slag === 'las' && svar.statusCode === 200) {
      const lista = JSON.parse(svar.isBase64Encoded ? Buffer.from(svar.body, 'base64').toString('utf8') : svar.body);
      if (lista.errno === 0 && lista.data) await lager.setJSON(listnyckel(q), lista.data).catch(() => {});
      mellanlagra(svar, q.path);
    }
    return svar;
  } catch (e) {
    console.error('kommentarer:', e);
    if (e?.name === 'MissingDatabaseConnectionError') return fel(503, 'Kommentarerna är inte i gång ännu.');
    return fel(500, 'Något gick fel. Försök igen om en stund.');
  } finally {
    try {
      const f = await raknaAnrop(lager, { ms: Date.now() - start, databas });
      await varnaVidTak(lager, f);
    } catch (e) {
      console.error('kommentarer: räkningen misslyckades:', e?.message);
    }
  }
};

// ---------------------------------------------------------------------------------------------
// Administratören. Bara ADMIN_EPOST kan bli administratör, och bara genom en länk som mejlas dit:
// den som registrerar sig måste alltså kunna läsa den inkorgen. Lösenordet väljer Niclas själv på
// sidan, och det hashas som Waline gör innan det sparas.

async function finnsAdmin() {
  const rader = await getDatabase().sql`SELECT count(*)::int AS n FROM wl_users WHERE type = 'administrator'`;
  return (rader[0]?.n ?? 0) > 0;
}

function bas(event) {
  const h = event.headers;
  const proto = String(h['x-forwarded-proto'] || 'https').split(',')[0];
  return h.host ? `${proto}://${h.host}` : SAJT;
}

function sida(titel, innehall) {
  return {
    statusCode: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' },
    body: `<!doctype html>
<html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>${skydda(titel)} · niclasfohlin.se</title>
<style>
body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:1.0625rem;line-height:1.6;color:#14202b;max-width:32rem;margin:3rem auto;padding:0 1.25rem}
h1{font-size:1.6rem;line-height:1.2}label{display:grid;gap:.25rem;margin:0 0 1rem;font-weight:600}
input{font:inherit;font-weight:400;padding:.6rem .8rem;border:1px solid #c9d1da;border-radius:6px}
button{font:inherit;font-weight:600;min-height:2.75rem;padding:.6rem 1.1rem;border:0;border-radius:6px;background:#1d4f91;color:#fff;cursor:pointer}
a{color:#1d4f91}.fel{color:#9b1c1c}
</style></head><body><h1>${skydda(titel)}</h1>
${innehall}
</body></html>`,
  };
}

async function registrering(event, lager) {
  const metod = event.httpMethod;
  const kropp = metod === 'POST' ? lasKropp(event) : {};
  const t = kropp.t || event.queryStringParameters?.t;
  const logga = `<p><a href="${PREFIX}/ui">Logga in i panelen</a></p>`;
  const finns = await finnsAdmin();

  if (!t) {
    if (metod !== 'POST') {
      return finns
        ? sida('Kommentarernas administratör', `<p>Kommentarerna har en administratör: ${skydda(ADMIN_EPOST)}.</p>${logga}
<p>Har du glömt lösenordet? Tryck på knappen, så kommer en länk till ${skydda(ADMIN_EPOST)} där du väljer ett nytt.</p>
<form method="post"><button type="submit">Skicka länken</button></form>`)
        : sida('Bli administratör', `<p>Kommentarerna på sajten sköts av en administratör. Det kan bara vara ${skydda(ADMIN_EPOST)}.</p>
<p>Tryck på knappen, så kommer en länk dit. I länken väljer du lösenord.</p>
<form method="post"><button type="submit">Skicka länken</button></form>`);
    }
    const senast = Number(await lager.get('registrera-senast').catch(() => 0)) || 0;
    if (Date.now() - senast < 5 * 60000) return sida('Länken är redan skickad', '<p>Vänta fem minuter innan du ber om en ny länk.</p>');
    if (!(await inomTak(lager, 'registrera-mejl', TAK.registrera))) {
      return sida('Inga fler länkar i dag', '<p>Tre länkar har skickats det senaste dygnet. Försök igen i morgon.</p>');
    }
    await lager.set('registrera-senast', String(Date.now()));
    const lank = `${bas(event)}${PREFIX}/registrera?t=${signera('registrera', { e: ADMIN_EPOST, x: Date.now() + 30 * 60000 })}`;
    if (process.env.KOMMENTARER_BREVO_SANDBOX) console.log('kommentarer: registreringslänk (lokalt prov):', lank);
    const { amne, text } = mejl.registrera({ lank });
    const skickat = await mejla({ till: ADMIN_EPOST, amne, text });
    return skickat
      ? sida('Kolla din inkorg', `<p>Länken är skickad till ${skydda(ADMIN_EPOST)}. Den gäller i 30 minuter.</p>`)
      : sida('Mejlet gick inte iväg', '<p class="fel">Länken kunde inte skickas. Försök igen om en stund.</p>');
  }

  const token = verifiera('registrera', t);
  if (!token || token.e !== ADMIN_EPOST || Date.now() > token.x) {
    return sida('Länken gäller inte längre', `<p>Be om en ny länk.</p><p><a href="${PREFIX}/registrera">Skicka en ny länk</a></p>`);
  }

  const formular = (felText = '') => sida(finns ? 'Välj nytt lösenord' : 'Välj lösenord', `${felText ? `<p class="fel">${skydda(felText)}</p>` : ''}
<form method="post">
<input type="hidden" name="t" value="${skydda(t)}">
${finns ? '' : '<label>Namnet som visas vid dina svar <input name="namn" value="Niclas Fohlin" required maxlength="60" autocomplete="name"></label>\n'}<label>E-post <input value="${skydda(ADMIN_EPOST)}" disabled></label>
<label>Lösenord, minst 10 tecken <input type="password" name="losen" required minlength="10" autocomplete="new-password"></label>
<label>Samma lösenord igen <input type="password" name="losen2" required minlength="10" autocomplete="new-password"></label>
<button type="submit">${finns ? 'Spara lösenordet' : 'Bli administratör'}</button>
</form>`);

  if (metod !== 'POST' || !kropp.losen) return formular();
  const losen = String(kropp.losen);
  if (losen.length < 10) return formular('Lösenordet ska vara minst 10 tecken.');
  if (losen !== String(kropp.losen2 || '')) return formular('Lösenorden är inte lika.');
  const hash = new phpass.PasswordHash().hashPassword(losen);

  if (finns) {
    await getDatabase().sql`UPDATE wl_users SET password = ${hash}, "2fa" = NULL, updatedAt = CURRENT_TIMESTAMP
      WHERE email = ${ADMIN_EPOST} AND type = 'administrator'`;
    return sida('Klart', `<p>Lösenordet är bytt. Logga in med ${skydda(ADMIN_EPOST)} och det nya lösenordet.</p>${logga}`);
  }

  const namn = String(kropp.namn || '').trim().slice(0, 60) || 'Niclas Fohlin';
  await getDatabase().sql`INSERT INTO wl_users (display_name, email, password, type, url)
    VALUES (${namn}, ${ADMIN_EPOST}, ${hash}, 'administrator', ${SAJT})`;
  return sida('Klart', `<p>Du är administratör. Logga in med ${skydda(ADMIN_EPOST)} och lösenordet du valde.</p>${logga}
<p>Är du inloggad i panelen kan du också svara, godkänna och ta bort direkt under varje artikel, bok och metod på sajten.</p>`);
}
