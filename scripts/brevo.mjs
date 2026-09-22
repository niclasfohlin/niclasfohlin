#!/usr/bin/env node
// Brevo från riggen. Nyckeln tas ur miljövariabeln BREVO_API_KEY eller ur .env i repots rot
// (git-ignorerad); Netlify CLI maskar hemliga värden, så den vägen fungerar bara för värden som
// inte är märkta hemliga. Nyckeln skrivs aldrig ut: allt som skrivs maskas. Saknas den: DRIFT.md.
//
//   node scripts/brevo.mjs status              konto, plan, avsändare, domäner, listor, mallar
//   node scripts/brevo.mjs doman               DNS-posterna Brevo vill ha för domänen och deras status
//   node scripts/brevo.mjs autentisera         ber Brevo kontrollera domänens DNS-poster igen
//   node scripts/brevo.mjs kampanjer [antal]   de senaste kampanjerna (namn, status, skickad)
//   node scripts/brevo.mjs anrop GET /contacts/lists            valfritt anrop
//   node scripts/brevo.mjs anrop PUT /smtp/templates/1 '{"replyTo":"..."}'
//
// Var det som finns i Brevo står i DRIFT.md. Ändra avsändare, mallar och listor med anrop,
// och skriv sedan in det nya läget i DRIFT.md.

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DOMAN = 'niclasfohlin.se';
const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [kommando = 'status', ...rest] = process.argv.slice(2);

function nyckel() {
  const giltig = (v) => (v && /^xkeysib-/.test(v.trim()) ? v.trim() : undefined);
  if (giltig(process.env.BREVO_API_KEY)) return process.env.BREVO_API_KEY.trim();
  const envFil = join(rot, '.env');
  if (existsSync(envFil)) {
    const rad = readFileSync(envFil, 'utf8').split(/\r?\n/).find((r) => r.startsWith('BREVO_API_KEY='));
    const v = giltig(rad?.slice('BREVO_API_KEY='.length).replace(/^["']|["']$/g, ''));
    if (v) return v;
  }
  const env = { ...process.env };
  delete env.NETLIFY_AUTH_TOKEN; // skuggar CLI:ts inloggning
  try {
    const v = giltig(execSync('netlify env:get BREVO_API_KEY --context production', { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    if (v) return v;
  } catch { /* faller igenom */ }
  console.error('Hittar ingen Brevo-nyckel: sätt BREVO_API_KEY i miljön eller i .env, eller logga in Netlify CLI (netlify login). Se DRIFT.md.');
  process.exit(1);
}
const KEY = nyckel();

const maska = (s) => String(s).replace(/xkeysib-[A-Za-z0-9-]+/g, '[nyckel]');
const visa = (v) => console.log(maska(typeof v === 'string' ? v : JSON.stringify(v, null, 2)));

async function brevo(metod, sokvag, body) {
  const res = await fetch(`https://api.brevo.com/v3${sokvag}`, {
    method: metod,
    headers: { 'api-key': KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { text }; }
  return { ok: res.ok, status: res.status, data };
}

const domanStatus = async () => {
  const d = await brevo('GET', `/senders/domains/${DOMAN}`);
  if (!d.ok) return { fel: d.status, svar: d.data };
  const poster = Object.entries(d.data.dns_records ?? {})
    .filter(([, p]) => p && typeof p === 'object')
    .map(([namn, p]) => ({ namn, typ: p.type, vard: p.host_name, varde: p.value, ok: p.status }));
  return { verified: d.data.verified, authenticated: d.data.authenticated, poster };
};

if (kommando === 'status') {
  const konto = await brevo('GET', '/account');
  visa({ konto: konto.data.email, plan: (konto.data.plan ?? []).map((p) => `${p.type}: ${p.credits ?? ''} ${p.creditsType ?? ''}`.trim()) });
  const avs = await brevo('GET', '/senders');
  visa({ avsandare: (avs.data.senders ?? []).map((s) => ({ id: s.id, namn: s.name, epost: s.email, aktiv: s.active })) });
  const dom = await brevo('GET', '/senders/domains');
  visa({ domaner: (dom.data.domains ?? []).map((d) => ({ doman: d.domain_name, verifierad: d.verified, autentiserad: d.authenticated })) });
  // Listornas räknare (totalSubscribers) släpar efter i Brevo och kan visa 0 fast listan är full:
  // antalet räknas i stället ur kontakterna.
  const listor = await brevo('GET', '/contacts/lists?limit=10');
  const kontakter = await brevo('GET', '/contacts?limit=500&sort=desc');
  const per = {};
  for (const c of kontakter.data.contacts ?? []) for (const id of c.listIds ?? []) per[id] = (per[id] ?? 0) + 1;
  visa({ kontakterTotalt: kontakter.data.count, listor: (listor.data.lists ?? []).map((l) => ({ id: l.id, namn: l.name, kontakter: per[l.id] ?? 0 })) });
  const mallar = await brevo('GET', '/smtp/templates?limit=10');
  visa({ mallar: (mallar.data.templates ?? []).map((t) => ({ id: t.id, namn: t.name, avsandare: t.sender?.email, svarTill: t.replyTo, aktiv: t.isActive })) });
} else if (kommando === 'doman') {
  visa(await domanStatus());
} else if (kommando === 'autentisera') {
  const svar = await brevo('PUT', `/senders/domains/${DOMAN}/authenticate`);
  visa({ svar: svar.status, ...(svar.ok ? {} : { fel: svar.data }), ...(await domanStatus()) });
} else if (kommando === 'kampanjer') {
  // Listan över kampanjer saknar statistik; den hämtas per kampanj. Listornas räknare i Brevo släpar
  // efter, så antalet mottagare läses här, inte i status.
  const antal = Number(rest[0] ?? 5);
  const k = await brevo('GET', `/emailCampaigns?limit=${antal}&sort=desc`);
  const ut = [];
  for (const c of k.data.campaigns ?? []) {
    const d = await brevo('GET', `/emailCampaigns/${c.id}?statistics=globalStats`);
    const s = d.data.statistics?.globalStats ?? {};
    ut.push({ id: c.id, namn: c.name, status: c.status, skickad: d.data.sentDate ?? c.scheduledAt ?? '', skickade: s.sent ?? '', levererade: s.delivered ?? '', oppnade: s.uniqueViews ?? '', klick: s.uniqueClicks ?? '', avregistrerade: s.unsubscriptions ?? '' });
  }
  visa(ut);
} else if (kommando === 'anrop') {
  const [metod, sokvag, kropp] = rest;
  if (!metod || !sokvag) { console.error('anrop <METOD> <sökväg> [json]'); process.exit(1); }
  const svar = await brevo(metod.toUpperCase(), sokvag, kropp ? JSON.parse(kropp) : undefined);
  visa({ status: svar.status, svar: svar.data });
  if (!svar.ok) process.exit(1);
} else {
  console.error(`Okänt kommando: ${kommando}. Se huvudet i scripts/brevo.mjs.`);
  process.exit(1);
}
