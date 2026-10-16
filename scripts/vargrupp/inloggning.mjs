// Niclas Google-konto för formulären (K-372): en inloggning med behörigheten drive.file (bara filer som appen själv
// skapar), genom samma OAuth-klient som Toishi-riggens clasp-profil. Skriptet väntar på Googles svar på 127.0.0.1,
// byter koden mot en förnyelsenyckel och sparar den utanför repot. Inga nycklar skrivs ut.
import { createServer } from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const KONTO = 'niclas.fohlin@gmail.com';
const UT = join(homedir(), '.niclasfohlin-google.json');
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const t = JSON.parse(readFileSync(join(homedir(), '.clasprc.json'), 'utf8')).tokens?.toishi;
if (!t?.client_id || !t?.client_secret) { console.error('Klienten saknas i claspens profil toishi.'); process.exit(1); }
const PORT = 8765;
const REDIRECT = `http://127.0.0.1:${PORT}`;
const state = randomBytes(16).toString('hex');

const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
  client_id: t.client_id, redirect_uri: REDIRECT, response_type: 'code', scope: SCOPE,
  access_type: 'offline', prompt: 'consent', login_hint: KONTO, state,
});

const server = createServer(async (req, res) => {
  const q = new URL(req.url, REDIRECT).searchParams;
  if (!q.get('code') && !q.get('error')) { res.writeHead(404).end(); return; }
  const svara = (text) => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(`<p style="font:18px system-ui;margin:2rem">${text}</p>`); };
  try {
    if (q.get('error')) throw new Error(`Google svarade ${q.get('error')}`);
    if (q.get('state') !== state) throw new Error('fel state');
    const svar = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code: q.get('code'), client_id: t.client_id, client_secret: t.client_secret, redirect_uri: REDIRECT, grant_type: 'authorization_code' }),
    });
    const j = await svar.json();
    if (!svar.ok || !j.refresh_token) throw new Error(`nyckeln kom inte: ${svar.status} ${j.error ?? ''}`);
    const om = await (await fetch('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)', { headers: { Authorization: `Bearer ${j.access_token}` } })).json();
    const konto = om.user?.emailAddress ?? '';
    writeFileSync(UT, JSON.stringify({ konto, scope: j.scope, klient: 'claspens profil toishi', refresh_token: j.refresh_token, sparad: new Date().toISOString() }, null, 2));
    console.log(`Klart: inloggad som ${konto}, behörigheten ${j.scope}, sparad i ${UT}.`);
    svara(`Klart. Inloggad som ${konto}. Du kan stänga fliken.`);
  } catch (e) {
    console.log('Fel:', e.message);
    svara(`Det gick inte: ${e.message}`);
  } finally {
    setTimeout(() => process.exit(0), 500);
  }
});
server.listen(PORT, '127.0.0.1', () => {
  console.log('Öppna länken och logga in som', KONTO + ':');
  console.log(url.toString());
});
setTimeout(() => { console.log('Ingen inloggning på 30 minuter, avslutar.'); process.exit(0); }, 30 * 60 * 1000);
