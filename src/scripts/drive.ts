// "Spara i Drive": lägger en Word-fil i läsarens egen Google Drive. Google Identity Services
// laddas först när läsaren visar avsikt (pekar på eller fokuserar en Drive-knapp), så att vanliga
// besök inte anropar Google. Behörigheten drive.file gäller filer sajten själv skapar.
// Klient-id:t ligger i src/data/site.ts; Base.astro skriver det på html som data-drive-klient.
//
// Ordningen är viktig: Googles inloggningsruta måste öppnas direkt på läsarens tryck, innan
// filen hämtas eller byggs, annars kan webbläsaren blockera rutan.

declare global {
  interface Window { google?: any }
}

const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
let token: string | undefined;
let gisLaddas: Promise<void> | undefined;

const klientId = () => document.documentElement.dataset.driveKlient ?? '';

function laddaGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  gisLaddas ??= new Promise((ok, fel) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => ok();
    s.onerror = () => { s.remove(); gisLaddas = undefined; fel(new Error('Google gick inte att nå. Kontrollera uppkopplingen och försök igen.')); };
    document.head.appendChild(s);
  });
  return gisLaddas;
}

const FEL: Record<string, string> = {
  access_denied: 'Du gav inte sajten tillåtelse att spara i din Drive.',
  popup_closed: 'Inloggningen avbröts.',
  popup_failed_to_open: 'Webbläsaren stoppade Googles inloggningsruta. Tillåt popup-fönster för niclasfohlin.se och försök igen.',
};

function hamtaToken(): Promise<string> {
  if (token) return Promise.resolve(token);
  return new Promise((ok, fel) => {
    const oauth2 = window.google.accounts.oauth2;
    const klient = oauth2.initTokenClient({
      client_id: klientId(),
      scope: SCOPE,
      callback: (svar: { access_token?: string; error?: string }) => {
        if (svar.access_token && oauth2.hasGrantedAllScopes(svar, SCOPE)) { token = svar.access_token; ok(token); }
        else fel(new Error(FEL[svar.error ?? ''] ?? 'Behörighet till Drive gavs inte.'));
      },
      error_callback: (e: { type?: string }) => fel(new Error(FEL[e.type ?? ''] ?? 'Inloggningen misslyckades.')),
    });
    klient.requestAccessToken();
  });
}

/** Steg ett, direkt på läsarens tryck: ladda Google och be om behörighet. */
export async function forberedDrive(): Promise<void> {
  await laddaGis();
  await hamtaToken();
}

async function laddaUpp(blob: Blob, namn: string): Promise<{ id: string; webViewLink?: string }> {
  const t = await hamtaToken();
  // multipart/related som Drive-API:t beskriver: metadata som JSON, sedan filen.
  const grans = `niclasfohlin-${Date.now().toString(36)}`;
  const huvud = `--${grans}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: namn, mimeType: DOCX })}\r\n--${grans}\r\nContent-Type: ${DOCX}\r\n\r\n`;
  const kropp = new Blob([huvud, blob, `\r\n--${grans}--`]);
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
    method: 'POST',
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': `multipart/related; boundary=${grans}` },
    body: kropp,
  });
  if (res.status === 401) { token = undefined; throw new Error('Behörigheten gick ut. Försök igen.'); }
  if (!res.ok) throw new Error(`Drive svarade ${res.status}.`);
  return res.json();
}

function statusFor(knapp: HTMLElement): HTMLElement {
  const grupp = knapp.closest('.filval') ?? knapp;
  let el = grupp.nextElementSibling as HTMLElement | null;
  if (!el || !el.classList.contains('drive-status')) {
    el = document.createElement('span');
    el.className = 'drive-status';
    el.setAttribute('role', 'status');
    grupp.after(el);
  }
  return el;
}

/** Steg två: sparar en färdig fil i Drive och skriver utfallet i status. Kräver forberedDrive() först. */
export async function sparaIDrive(blob: Blob, namn: string, status: HTMLElement, knapp?: HTMLButtonElement) {
  if (knapp) knapp.disabled = true;
  status.textContent = 'Sparar i Drive …';
  try {
    const fil = await laddaUpp(blob, namn);
    status.replaceChildren('Sparad i Drive');
    if (fil.webViewLink) {
      const a = document.createElement('a');
      a.href = fil.webViewLink; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'öppna';
      status.append(': ', a);
    }
    status.append('.');
    if (knapp) knapp.title = 'Spara en ny kopia i din Google Drive';
  } catch (e) {
    status.textContent = `Det gick inte: ${(e as Error).message}`;
  } finally {
    if (knapp) knapp.disabled = false;
  }
}

const knappar = document.querySelectorAll<HTMLButtonElement>('[data-drive-src], [data-drive-valda]');
// Googles skript hämtas när läsaren visar avsikt, så att trycket sedan öppnar inloggningsrutan direkt.
const forladda = () => { laddaGis().catch(() => { /* felet visas vid trycket */ }); };
for (const k of knappar) {
  k.addEventListener('pointerenter', forladda, { once: true });
  k.addEventListener('focus', forladda, { once: true });
  k.addEventListener('touchstart', forladda, { once: true, passive: true });
}

for (const knapp of document.querySelectorAll<HTMLButtonElement>('[data-drive-src]')) {
  knapp.addEventListener('click', async () => {
    const status = statusFor(knapp);
    const src = knapp.dataset.driveSrc ?? '';
    const namn = knapp.dataset.driveNamn ?? 'fil.docx';
    knapp.disabled = true;
    try {
      await forberedDrive();
      status.textContent = 'Hämtar filen …';
      const res = await fetch(src);
      if (!res.ok) throw new Error('Filen gick inte att hämta.');
      await sparaIDrive(await res.blob(), namn, status, knapp);
    } catch (e) {
      status.textContent = `Det gick inte: ${(e as Error).message}`;
      knapp.disabled = false;
    }
  });
}
