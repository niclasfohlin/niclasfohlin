// "Spara i Drive": lägger en Word-fil i läsarens egen Google Drive, där den öppnas i Google
// Dokument. Google Identity Services laddas först när någon trycker, så att vanliga besök inte
// anropar Google. Behörigheten drive.file gäller bara filer som sajten själv skapar.
// Klient-id:t ligger i src/data/site.ts (Filval.astro skriver det på html som data-drive-klient).

declare global {
  interface Window { google?: any }
}

const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
let token: string | undefined;
let gisLaddas: Promise<void> | undefined;

function klientId(): string {
  return document.documentElement.dataset.driveKlient ?? '';
}

function laddaGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  gisLaddas ??= new Promise((ok, fel) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => ok();
    s.onerror = () => fel(new Error('Google gick inte att nå.'));
    document.head.appendChild(s);
  });
  return gisLaddas;
}

function hamtaToken(): Promise<string> {
  if (token) return Promise.resolve(token);
  return new Promise((ok, fel) => {
    const klient = window.google.accounts.oauth2.initTokenClient({
      client_id: klientId(),
      scope: SCOPE,
      callback: (svar: { access_token?: string; error?: string }) => {
        if (svar.access_token) { token = svar.access_token; ok(token); } else fel(new Error(svar.error ?? 'Ingen behörighet.'));
      },
      error_callback: (e: { type?: string }) => fel(new Error(e.type === 'popup_closed' ? 'Inloggningen avbröts.' : 'Inloggningen misslyckades.')),
    });
    klient.requestAccessToken();
  });
}

async function laddaUpp(blob: Blob, namn: string): Promise<{ id: string; webViewLink?: string }> {
  const t = await hamtaToken();
  const kropp = new FormData();
  kropp.append('metadata', new Blob([JSON.stringify({ name: namn, mimeType: DOCX })], { type: 'application/json' }));
  kropp.append('file', blob, namn);
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
    method: 'POST',
    headers: { Authorization: `Bearer ${t}` },
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

/** Sparar en färdig fil (t.ex. en byggd i webbläsaren) i Drive och skriver utfallet i status. */
export async function sparaIDrive(blob: Blob, namn: string, status: HTMLElement, knapp?: HTMLButtonElement) {
  if (knapp) knapp.disabled = true;
  status.textContent = 'Sparar i Drive …';
  try {
    await laddaGis();
    const fil = await laddaUpp(blob, namn);
    status.replaceChildren();
    status.append('Sparad i Drive');
    if (fil.webViewLink) {
      const a = document.createElement('a');
      a.href = fil.webViewLink; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'öppna';
      status.append(': ', a);
    }
    status.append('.');
  } catch (e) {
    status.textContent = `Det gick inte: ${(e as Error).message}`;
  } finally {
    if (knapp) knapp.disabled = false;
  }
}

for (const knapp of document.querySelectorAll<HTMLButtonElement>('[data-drive-src]')) {
  knapp.addEventListener('click', async () => {
    const status = statusFor(knapp);
    const src = knapp.dataset.driveSrc ?? '';
    const namn = knapp.dataset.driveNamn ?? 'fil.docx';
    knapp.disabled = true;
    status.textContent = 'Hämtar filen …';
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error('Filen gick inte att hämta.');
      await sparaIDrive(await res.blob(), namn, status, knapp);
    } catch (e) {
      status.textContent = `Det gick inte: ${(e as Error).message}`;
      knapp.disabled = false;
    }
  });
}
