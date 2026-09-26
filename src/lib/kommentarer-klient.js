// Kommentarerna i webbläsaren. Byggs till /kommentarer/klient.js av src/pages/kommentarer/[fil].ts,
// och bara när kommentarerna är på. Laddaren i src/components/Kommentarer.astro hämtar filen först när
// läsaren närmar sig rutan, så en sidvisning där ingen läser kommentarerna bär bara rubriken och
// laddaren. Stilen (src/styles/kommentarer.css) läggs in av bygget som konstanten STIL.
//
// Servern är Waline bakom netlify/functions/kommentarer.mjs. Listan kommer ur Netlifys mellanlager,
// och bara den som skriver väcker funktionen. Är Niclas inloggad i panelen (/kommentarer/admin)
// ligger inloggningen i webbläsaren på samma adress, och då får varje kommentar också Godkänn och
// Ta bort, och hans svar syns direkt.

/* global STIL */

const API = '/.netlify/functions/kommentarer';
const MINNE = 'kommentar-avsandare';
const EPOST = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TYST = 'Kommentarerna svarar inte just nu. Försök igen om en stund.';
const datum = new Intl.DateTimeFormat('sv-SE', { dateStyle: 'long' });

// Formuläret och listan byggs här i stället för i sidans html.
const RUTAN = `<p class="kommentarer-lage meta" role="status"></p>
<div class="kommentarer-lista"></div>
<form class="kommentarer-form" novalidate hidden>
<p class="kommentarer-svarar meta" hidden><span></span> <button type="button" class="lank">Avbryt</button></p>
<label>Namn <input name="nick" autocomplete="name" required maxlength="60"></label>
<label>E-post, visas inte <input name="mail" type="email" autocomplete="email" required maxlength="120"></label>
<label>Kommentar <textarea name="comment" required maxlength="4000" rows="5"></textarea></label>
<div class="kommentarer-falla" aria-hidden="true"><label>Lämna tomt <input name="hemsida" tabindex="-1" autocomplete="off"></label></div>
<div class="kommentarer-robot"></div>
<p class="kommentarer-knapprad"><button type="submit" class="knapp">Skicka</button></p>
<p class="kommentarer-svar" role="status"></p>
<p class="kommentarer-integritet meta">Kommentarerna läses innan de visas. Namnet syns med kommentaren. E-postadressen visas inte och används bara för att meddela dig när någon svarar.</p>
</form>`;

function inloggning() {
  try {
    return localStorage.getItem('TOKEN') || sessionStorage.getItem('TOKEN');
  } catch {
    return null;
  }
}

/** Anropar servern och svarar alltid { errno, errmsg, data }. errno 0 betyder att det gick. */
async function anropa(sokvag, init = {}, token) {
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  try {
    const res = await fetch(API + sokvag, { ...init, headers });
    const svar = await res.json().catch(() => ({}));
    const errno = res.ok ? (svar.errno ?? 0) : svar.errno || res.status;
    return { errno, errmsg: svar.errmsg || (errno ? TYST : ''), data: svar.data };
  } catch {
    return { errno: -1, errmsg: TYST };
  }
}

function knapp(text, gor, klass = '') {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `lank ${klass}`.trim();
  b.textContent = text;
  b.addEventListener('click', gor);
  return b;
}

function starta(del) {
  if (typeof STIL === 'string' && !document.getElementById('kommentarer-stil')) {
    const s = document.createElement('style');
    s.id = 'kommentarer-stil';
    s.textContent = STIL;
    document.head.append(s);
  }
  del.querySelector('h2').insertAdjacentHTML('afterend', RUTAN);

  const sida = del.dataset.sida || location.pathname;
  const titel = del.dataset.titel || document.title;
  const turnstileNyckel = del.dataset.turnstile;
  const lista = del.querySelector('.kommentarer-lista');
  const lage = del.querySelector('.kommentarer-lage');
  const form = del.querySelector('.kommentarer-form');
  const svarar = form.querySelector('.kommentarer-svarar');
  const besked = form.querySelector('.kommentarer-svar');
  const skicka = form.querySelector('button[type="submit"]');
  const robot = form.querySelector('.kommentarer-robot');
  const falt = (namn) => form.elements.namedItem(namn);

  let token = inloggning();
  let admin = false;
  let mal = null; // { pid, rid, namn } när läsaren svarar på en kommentar
  let prov = null;
  let provTid = 0;
  let robotLaddas = null;
  let robotId = '';
  let robotSvar = null;

  try {
    const minne = JSON.parse(localStorage.getItem(MINNE) || 'null');
    if (minne) {
      falt('nick').value = minne.nick || '';
      falt('mail').value = minne.mail || '';
    }
  } catch { /* utan lagring */ }

  function rita(k, rot) {
    const el = document.createElement('article');
    el.className = k.status && k.status !== 'approved' ? 'kommentar vantar' : 'kommentar';
    el.id = `kommentar-${k.objectId}`;
    const huvud = document.createElement('p');
    huvud.className = 'kommentar-huvud';
    const namn = document.createElement('strong');
    namn.textContent = k.nick || 'Anonym';
    huvud.append(namn);
    if (k.type === 'administrator') {
      const etikett = document.createElement('span');
      etikett.className = 'kommentar-etikett';
      etikett.textContent = 'Författaren';
      huvud.append(etikett);
    }
    const tid = document.createElement('time');
    tid.className = 'meta';
    tid.dateTime = new Date(k.time).toISOString();
    tid.textContent = datum.format(k.time)
      + (k.reply_user ? ` · svar till ${k.reply_user.nick}` : '')
      + (k.status === 'waiting' ? ' · väntar på granskning' : k.status === 'spam' ? ' · troligen skräp' : '');
    huvud.append(tid);
    const text = document.createElement('div');
    text.className = 'kommentar-text';
    text.innerHTML = k.comment; // Waline gör om markdown till html och rensar den på servern.
    const knappar = document.createElement('p');
    knappar.className = 'kommentar-knappar';
    knappar.append(knapp('Svara', () => svaraPa(el, { pid: String(k.objectId), rid: rot, namn: k.nick })));
    if (admin) {
      if (k.status !== 'approved') knappar.append(knapp('Godkänn', () => andra(k, 'godkann')));
      knappar.append(knapp('Ta bort', () => andra(k, 'ta-bort'), 'fara'));
    }
    el.append(huvud, text, knappar);
    const svaren = [...(k.children || [])].sort((a, b) => a.time - b.time);
    if (svaren.length) {
      const grupp = document.createElement('div');
      grupp.className = 'kommentar-svaren';
      for (const s of svaren) grupp.append(rita(s, rot));
      el.append(grupp);
    }
    return el;
  }

  async function ladda(sidnr = 1, visa) {
    if (sidnr === 1) lage.textContent = 'Hämtar kommentarerna …';
    const fraga = new URLSearchParams({ path: sida, page: String(sidnr), pageSize: '50', sortBy: 'insertedAt_asc', lang: 'sv' });
    const svar = await anropa(`/api/comment?${fraga}`, {}, admin ? token : null);
    if (svar.errno === 410) {
      del.remove(); // Kommentarerna är avstängda: rutan försvinner helt.
      return;
    }
    if (svar.errno || !svar.data) {
      lage.textContent = svar.errmsg || TYST;
      return;
    }
    if (sidnr === 1) lista.replaceChildren();
    for (const k of svar.data.data) lista.append(rita(k, String(k.objectId)));
    lage.textContent = svar.data.count ? '' : 'Inga kommentarer än. Skriv gärna den första.';
    if (svar.data.totalPages > sidnr) {
      const mer = knapp('Visa fler kommentarer', () => {
        mer.remove();
        ladda(sidnr + 1);
      });
      lista.append(mer);
    }
    form.hidden = false;
    const hit = document.getElementById(visa || location.hash.slice(1));
    if (hit && del.contains(hit)) hit.scrollIntoView({ block: 'center' });
  }

  function svaraPa(el, nytt) {
    mal = nytt;
    svarar.querySelector('span').textContent = `Du svarar ${nytt.namn}.`;
    svarar.hidden = false;
    besked.textContent = '';
    el.querySelector(':scope > .kommentar-knappar').after(form);
    falt('comment').focus();
  }

  function avbryt() {
    mal = null;
    svarar.hidden = true;
    lista.after(form);
  }
  svarar.querySelector('button').addEventListener('click', avbryt);

  async function andra(k, vad) {
    if (vad === 'ta-bort' && !confirm('Ta bort kommentaren och alla svar på den?')) return;
    const svar = await anropa(`/api/comment/${k.objectId}?lang=sv`, vad === 'godkann'
      ? { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-kommentar-titel': encodeURIComponent(titel) }, body: JSON.stringify({ status: 'approved' }) }
      : { method: 'DELETE' }, token);
    if (svar.errno) alert(svar.errmsg);
    else ladda();
  }

  async function hamtaProv() {
    const res = await fetch(`${API}/prov`);
    if (!res.ok) throw new Error('prov');
    provTid = Date.now();
    return (await res.json()).t;
  }

  // Cloudflares osynliga robotkontroll, när Niclas har satt nycklarna. Skriptet laddas först när
  // någon börjar skriva, så att läsare som bara läser inte anropar Cloudflare.
  function laddaRobot() {
    robotLaddas ??= new Promise((klart, fel) => {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = () => {
        robotId = window.turnstile.render(robot, {
          sitekey: turnstileNyckel,
          execution: 'execute',
          appearance: 'interaction-only',
          language: 'sv',
          callback: (t) => robotSvar?.(t),
          'error-callback': () => robotSvar?.(''),
        });
        klart();
      };
      s.onerror = () => fel(new Error('turnstile'));
      document.head.append(s);
    });
    return robotLaddas;
  }

  async function robotToken() {
    await laddaRobot();
    return new Promise((klart) => {
      robotSvar = klart;
      window.turnstile.execute(robotId);
    });
  }

  form.addEventListener('focusin', () => {
    prov ??= hamtaProv().catch(() => {
      prov = null;
      return '';
    });
    if (turnstileNyckel) laddaRobot().catch(() => { robotLaddas = null; });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nick = falt('nick').value.trim();
    const mail = falt('mail').value.trim();
    const kommentar = falt('comment').value.trim();
    const saknas = !admin && nick.length < 2 ? ['nick', 'Skriv ditt namn.']
      : !admin && !EPOST.test(mail) ? ['mail', 'Skriv en giltig e-postadress.']
      : !kommentar ? ['comment', 'Skriv en kommentar.'] : null;
    if (saknas) {
      besked.textContent = saknas[1];
      falt(saknas[0]).focus();
      return;
    }
    skicka.disabled = true;
    besked.textContent = 'Skickar …';
    try {
      const t = await (prov ??= hamtaProv());
      // Servern tar inte emot en kommentar inom tre sekunder från att formuläret öppnades.
      const vanta = 3200 - (Date.now() - provTid);
      if (vanta > 0) await new Promise((r) => setTimeout(r, vanta));
      let turnstile;
      if (turnstileNyckel && !admin) {
        turnstile = await robotToken().catch(() => '');
        if (!turnstile) {
          besked.textContent = 'Robotkontrollen kunde inte laddas. Pröva att ladda om sidan eller en annan webbläsare.';
          return;
        }
      }
      const svar = await anropa('/api/comment?lang=sv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-kommentar-prov': t, 'x-kommentar-titel': encodeURIComponent(titel) },
        body: JSON.stringify({
          comment: kommentar, nick, mail, link: '', url: sida, ua: '',
          pid: mal?.pid, rid: mal?.rid, at: mal?.namn,
          hemsida: falt('hemsida').value || undefined, turnstile,
        }),
      }, admin ? token : null);
      if (svar.errno) {
        besked.textContent = svar.errmsg;
        return;
      }
      try {
        if (!admin) localStorage.setItem(MINNE, JSON.stringify({ nick, mail }));
      } catch { /* utan lagring */ }
      falt('comment').value = '';
      const varSvar = mal;
      avbryt();
      if (svar.data?.status === 'approved') {
        await ladda(1, svar.data.objectId ? `kommentar-${svar.data.objectId}` : undefined);
        besked.textContent = 'Publicerat.';
      } else if (varSvar) {
        const tack = document.createElement('p');
        tack.className = 'kommentar-knappar meta';
        tack.textContent = 'Tack! Svaret syns när det har lästs.';
        document.getElementById(`kommentar-${varSvar.pid}`)?.querySelector(':scope > .kommentar-knappar')?.after(tack);
        besked.textContent = '';
      } else {
        besked.textContent = 'Tack! Kommentaren syns när den har lästs.';
      }
    } catch {
      besked.textContent = TYST;
    } finally {
      skicka.disabled = false;
      if (robotId) window.turnstile?.reset(robotId);
    }
  });

  (async () => {
    if (token) {
      const jag = await anropa('/api/token', {}, token);
      admin = !jag.errno && jag.data?.type === 'administrator';
      if (!admin) token = null;
      // Administratörens namn och adress kommer från kontot.
      else for (const namn of ['nick', 'mail']) falt(namn).closest('label').hidden = true;
    }
    await ladda();
  })();
}

const del = document.getElementById('kommentarer');
if (del && !del.dataset.startad) {
  del.dataset.startad = '1';
  starta(del);
}
