// Kommentarerna är ett lager som läggs på och tas bort med miljövariabeln KOMMENTARER i Netlify.
// Står den på "av" byggs sidorna utan kommentarer: ingen ruta, inget skript och ingen stil. Funktionen
// netlify/functions/kommentarer.mjs läser samma variabel och slutar svara direkt. Se DRIFT.md.

const miljo = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const AV = ['av', 'off', 'false', '0', 'nej'];

export const kommentarerPa = !AV.includes(String(miljo.KOMMENTARER ?? 'på').trim().toLowerCase());

/** Cloudflares robotkontroll. Nyckeln för webbplatsen är ingen hemlighet; den hemliga ligger i
 *  TURNSTILE_SECRET och läses bara av funktionen. Tomt: ingen robotkontroll i rutan. */
export const turnstileNyckel = String(miljo.TURNSTILE_KEY ?? '').trim();
