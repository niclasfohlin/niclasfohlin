// Det som aldrig bryts över två rader i en text på sajten, på ett ställe: metodsidan (src/components/EjBryt.astro) och
// korten som ritas i webbläsaren (src/scripts/kortbanken.ts) tar regeln härifrån.
// Ett spann som "1–4" bryts inte efter tankstrecket (ejBryt i src/lib/metod.ts, som lathundarna och Word också läser).
// Vecka och pass står med ett hårt mellanslag före sitt nummer, så att "Efter vecka 3" inte bryts före siffran i en smal
// kolumn på telefonen (granskningen av Texttyper i grupp, 2026-10-09). Dag och del likadant, och talet före sekunder och
// minuter ("dag 1", "28 sekunder"; granskningen av skrivkurserna i telefonen, 2026-10-10; "5–10 min" på aktivitetskorten,
// granskningen 2026-10-16). Rad och en ensam versal ("rad A"), ett tal och ordet med versal efter ("8 Sidor") och tre
// punkter efter ordet ("Jag hörde att du …") hålls också ihop, liksom "hel klass" (granskningen av Högläsning i par i telefonen 2026-10-20).
// Ett bindestreck först i ett ord, som ändelserna "-ur" och "-lös", bryts inte från ordet (granskningen av elevens blad i
// telefonen samma dag). Ett exempel som "fi-sk" hålls ihop av riggen med ordfog efter bindestrecket, som Word läser också.
import { ejBryt } from './metod';

export const hallIhop = (text: string) =>
  ejBryt(text)
    .replace(/\b(vecka|pass|dag|del|Vecka|Pass|Dag|Del) (?=\d)/g, '$1 ')
    .replace(/(\d) (sekunder|minuter|min)\b/g, '$1 $2')
    .replace(/\b(rad|Rad) (?=[A-ZÅÄÖ]\b)/g, '$1\u00a0')
    .replace(/(\d) (?=[A-ZÅÄÖ][a-zåäö])/g, '$1\u00a0')
    .replace(/(\S) …/g, '$1\u00a0…')
    .replace(/\bhel klass\b/g, 'hel\u00a0klass')
    .replace(/(^|[\s(·])-(?=\p{L})/gu, '$1-\u2060');
