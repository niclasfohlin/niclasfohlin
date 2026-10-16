// Klockan på sidorna som slumpar kort (src/components/Klocka.astro): Ta fram ett skrivkort och Ta fram en brainbreak.
// En nedräkning som visar tiden som en röd yta som krymper medurs mot tolv, som en time timer, och siffrorna under. Hela
// ytan är den inställda tiden. Tiden räknas mot klockan i datorn, och en timer (inte webbläsarens ritslinga, som står
// still i en dold flik) ritar om den och ringer, så att den ringer också när läraren har bytt fönster. Medan klockan går
// hålls skärmen vaken där webbläsaren kan det. Ljudet är en klocka som slår tre gånger, gjord i webbläsaren (Web Audio),
// så att sidan inte hämtar en ljudfil, och det förbereds när läraren trycker på Starta, eftersom webbläsaren bara släpper
// fram ljud efter ett tryck.

export type Klockval = { minuter: number; ljud: boolean };

export interface Klocka {
  /** Ställer klockan på minuterna, stannad, som Börja om. */
  satt(minuter: number): void;
  /** Stannar klockan där den är. */
  pausa(): void;
  /** Sant medan klockan går. */
  gar(): boolean;
}

/**
 * Klockan i rot (sektionen .sk-klocka). val är minuterna och ljudet från förra gången, och spara sparar dem när läraren
 * ändrar dem. vidStart körs när klockan startar från början (inte när den fortsätter efter paus), och vidSlut när tiden
 * är slut.
 */
export function klocka(rot: HTMLElement, o: { val: Klockval; spara: (v: Klockval) => void; vidStart?: () => void; vidSlut?: () => void }): Klocka {
  const hitta = <T extends Element>(v: string) => rot.querySelector<T>(v)!;
  const yta = hitta<SVGPathElement>('.sk-yta');
  const tidText = hitta<HTMLElement>('.sk-tid');
  const slutText = hitta<HTMLElement>('.sk-slut');
  const startKnapp = hitta<HTMLButtonElement>('.sk-start');
  const omstart = hitta<HTMLButtonElement>('.sk-omstart');
  const minFalt = hitta<HTMLInputElement>('.sk-minutinput');
  const ljudKnapp = hitta<HTMLButtonElement>('.sk-ljud');
  const streck = hitta<SVGGElement>('.sk-streck');
  const val = { ...o.val };
  const spara = () => o.spara({ ...val });

  for (let i = 0; i < 60; i++) {
    const v = (i / 60) * Math.PI * 2;
    const lang = i % 5 === 0 ? 14 : 6;
    const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l.setAttribute('x1', String(Math.sin(v) * 104)); l.setAttribute('y1', String(-Math.cos(v) * 104));
    l.setAttribute('x2', String(Math.sin(v) * (104 - lang))); l.setAttribute('y2', String(-Math.cos(v) * (104 - lang)));
    if (i % 5 === 0) l.classList.add('fem');
    streck.append(l);
  }
  const R = 96;
  function ritaYta(andel: number) {
    // andel: den del av tiden som är kvar, 1 till 0. Ytan går från visaren medurs till tolv.
    if (andel >= 0.9999) { yta.setAttribute('d', `M0 ${-R}A${R} ${R} 0 1 1 0 ${R}A${R} ${R} 0 1 1 0 ${-R}Z`); return; }
    if (andel <= 0) { yta.setAttribute('d', ''); return; }
    const v = (1 - andel) * Math.PI * 2;
    const x = Math.sin(v) * R, y = -Math.cos(v) * R;
    yta.setAttribute('d', `M0 0L${x.toFixed(2)} ${y.toFixed(2)}A${R} ${R} 0 ${andel > 0.5 ? 1 : 0} 1 0 ${-R}Z`);
  }
  const visaTid = (ms: number) => { const s = Math.ceil(ms / 1000); tidText.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  let langd = val.minuter * 60000;
  let kvar = langd;
  let slut = 0;
  let gar = false;
  let ram = 0; // timern som ritar om klockan
  let slag = 0;
  let vaken: { release: () => Promise<void> } | null = null;
  const hallVaken = async (pa: boolean) => {
    try {
      if (pa && !vaken) vaken = await (navigator as Navigator & { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen') ?? null;
      if (!pa && vaken) { await vaken.release(); vaken = null; }
    } catch { vaken = null; }
  };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && gar) { vaken = null; void hallVaken(true); } });
  function uppdatera() {
    const nu = gar ? Math.max(0, slut - performance.now()) : kvar;
    ritaYta(nu / langd);
    visaTid(nu);
    if (gar && nu <= 0) klar();
  }
  const stanna = () => { window.clearInterval(ram); window.clearTimeout(slag); };
  const ga = () => { stanna(); ram = window.setInterval(uppdatera, 200); slag = window.setTimeout(uppdatera, Math.max(0, slut - performance.now()) + 20); };
  function knappar() {
    startKnapp.textContent = gar ? 'Pausa' : kvar > 0 && kvar < langd ? 'Fortsätt' : 'Starta';
    rot.classList.toggle('gar', gar);
    minFalt.disabled = gar;
    rot.querySelectorAll<HTMLButtonElement>('.sk-steg').forEach((b) => { b.disabled = gar; });
  }
  function satt(minuter: number) {
    const m = Math.min(99, Math.max(1, Math.round(minuter) || 1));
    minFalt.value = String(m);
    val.minuter = m;
    spara();
    langd = m * 60000;
    kvar = langd;
    gar = false;
    stanna();
    rot.classList.remove('slut');
    slutText.textContent = '';
    knappar();
    uppdatera();
    void hallVaken(false);
  }
  function klar() {
    gar = false;
    kvar = 0;
    stanna();
    rot.classList.add('slut');
    slutText.textContent = 'Tiden är slut';
    knappar();
    void hallVaken(false);
    o.vidSlut?.();
    if (val.ljud) ring();
  }
  function pausa() {
    if (!gar) return;
    kvar = Math.max(0, slut - performance.now());
    gar = false;
    stanna();
    void hallVaken(false);
    knappar();
    uppdatera();
  }
  startKnapp.addEventListener('click', () => {
    forbered();
    if (gar) { pausa(); return; }
    if (kvar <= 0 || kvar === langd) o.vidStart?.();
    if (kvar <= 0) kvar = langd;
    rot.classList.remove('slut');
    slutText.textContent = '';
    slut = performance.now() + kvar;
    gar = true;
    void hallVaken(true);
    ga();
    knappar();
    uppdatera();
  });
  omstart.addEventListener('click', () => satt(Number(minFalt.value)));
  minFalt.addEventListener('change', () => satt(Number(minFalt.value)));
  rot.querySelectorAll<HTMLButtonElement>('.sk-steg').forEach((b) => b.addEventListener('click', () => satt(Number(minFalt.value) + Number(b.dataset.steg))));

  let ljud: AudioContext | undefined;
  function forbered() {
    try { ljud ??= new AudioContext(); if (ljud.state === 'suspended') void ljud.resume(); } catch { ljud = undefined; }
  }
  function ring() {
    if (!ljud) return;
    const t0 = ljud.currentTime + 0.05;
    for (let n = 0; n < 3; n++) {
      const t = t0 + n * 1.1;
      for (const [hz, styrka, tid] of [[784, 0.32, 2.2], [1568, 0.12, 1.4], [2352, 0.06, 0.9], [3136, 0.03, 0.6]] as const) {
        const osc = ljud.createOscillator();
        const g = ljud.createGain();
        osc.type = 'sine';
        osc.frequency.value = hz;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(styrka, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + tid);
        osc.connect(g).connect(ljud.destination);
        osc.start(t);
        osc.stop(t + tid + 0.05);
      }
    }
  }
  const visaLjud = () => { ljudKnapp.setAttribute('aria-pressed', String(val.ljud)); ljudKnapp.title = val.ljud ? 'Ljudet är på. Tryck för att stänga av det' : 'Ljudet är av. Tryck för att sätta på det'; };
  ljudKnapp.addEventListener('click', () => { val.ljud = !val.ljud; spara(); visaLjud(); if (val.ljud) forbered(); });
  visaLjud();
  satt(val.minuter);
  return { satt, pausa, gar: () => gar };
}
