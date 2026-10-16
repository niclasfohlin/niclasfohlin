// Åtkomstnyckel för Niclas Google-konto (niclas.fohlin@gmail.com, behörigheten drive.file: bara filer som appen själv
// har skapat), ur förnyelsenyckeln i ~/.niclasfohlin-google.json och klienten i claspens profil toishi (Google-projektet
// 811768631160, där Google Forms API slogs på 2026-10-16). Inloggningen görs med inloggning.mjs. Nycklar skrivs aldrig
// ut. Kör filen själv, så prövar den att formulärtjänsten svarar. DRIFT.md under Google Formulär.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export async function nyckel() {
  const k = JSON.parse(readFileSync(join(homedir(), '.clasprc.json'), 'utf8')).tokens?.toishi;
  const n = JSON.parse(readFileSync(join(homedir(), '.niclasfohlin-google.json'), 'utf8'));
  const svar = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: k.client_id, client_secret: k.client_secret, refresh_token: n.refresh_token, grant_type: 'refresh_token' }),
  });
  const j = await svar.json();
  if (!svar.ok) throw new Error(`nyckeln: ${svar.status} ${j.error ?? ''}`);
  return j.access_token;
}

export async function anrop(url, init = {}) {
  const svar = await fetch(url, { ...init, headers: { Authorization: `Bearer ${await nyckel()}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(init.headers ?? {}) } });
  const text = await svar.text();
  let j; try { j = JSON.parse(text); } catch { j = { text }; }
  return { status: svar.status, j };
}

if (process.argv[1]?.endsWith('google.mjs')) {
  const r = await anrop('https://forms.googleapis.com/v1/forms/finnsinte0000000000000000000000000000000000');
  console.log('status', r.status, (r.j.error?.status ?? ''), (r.j.error?.message ?? '').slice(0, 200));
}
