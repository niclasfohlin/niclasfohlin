// Skrivkortet i webbläsaren: ett kort i skrivkortens form (global.css, Skrivkorten och sidan som slumpar dem), ritat ur
// bibliotekets data. Sidan som slumpar korten (src/pages/stodundervisning/[id]/skrivkort.astro) och delningskortet för
// den sidan (src/pages/delning/kort/[namn].astro) ritar korten med samma kod, så att kortet ser likadant ut i båda.
// Word-filens kort ritas av src/lib/skrivkortform.ts i samma form.
export type Kort = { id: string; niva: string; nr: number; form: 'bild' | 'citat' | 'handelse'; text?: string; bild?: string; citat?: { rad: string; vem: string; verk?: string; ar?: number | string; oversatt?: string }; handelse?: { ar: number | string; vad: string; plats?: string; bakgrund?: string } };
export type Bild = { stor: string; liten: string; alt: string; rad: string; motiv?: string; bakgrund?: string; ai?: boolean; adress?: string; licens?: string; licensadress?: string; upphov?: string };
export type Data = { fraga: string; fragaBild: string; nivaer: { namn: string; farg: string }[]; kort: Kort[]; bilder: Record<string, Bild> };

export const el = (tag: string, klass?: string, text?: string) => { const e = document.createElement(tag); if (klass) e.className = klass; if (text !== undefined) e.textContent = text; return e; };
// Raderna i en vers står på egna rader, och varje versrad står hel så länge texten inte blir mindre än två tredjedelar
// av sin storlek, som i Word (riggens skrivkortform.js: 36 punkter och nedåt till 24). Sedan får raderna brytas.
const rader = (p: HTMLElement, text: string) => {
  const delar = text.split('\n').filter(Boolean);
  if (delar.length < 2) { p.textContent = text; return; }
  p.classList.add('sk-vers', 'hel');
  for (const r of delar) p.append(el('span', 'sk-versrad', r));
};

/** Kortet. liten är formen bland tio: den lilla bilden, texten avskuren och bara nivån och numret i foten. */
export function kortet(data: Data, k: Kort, liten: boolean): HTMLElement {
  const bild = k.bild ? data.bilder[k.bild] : undefined;
  const egen = (k.text ?? '').trim();
  const utanFraga = k.form === 'bild' && !egen;
  const f = el('div', `skrivkort form-${k.form}${liten ? ' liten' : ''}`);
  f.style.setProperty('--niva', data.nivaer.find((n) => n.namn === k.niva)?.farg ?? '#4b3a2f');
  f.dataset.niva = k.niva;
  f.dataset.kort = k.id;
  const innehall = el('div', 'sk-innehall');
  const img = () => {
    const i = document.createElement('img');
    i.className = 'sk-bild';
    i.src = liten ? bild!.liten : bild!.stor;
    i.alt = bild!.alt;
    i.width = liten ? 480 : 1200;
    i.height = liten ? 320 : 800;
    i.decoding = 'async';
    return i;
  };
  if (k.form === 'bild') {
    if (bild) f.append(img());
    const t = el('p', `sk-text${utanFraga ? ' sk-uppgift' : ''}`);
    t.textContent = egen || data.fragaBild;
    innehall.append(t);
  } else if (k.form === 'citat' && k.citat) {
    innehall.append(el('span', 'sk-tecken', '”'));
    const q = el('blockquote', 'sk-citatrad');
    const p = el('p'); rader(p, k.citat.rad); q.append(p);
    innehall.append(q, el('span', 'sk-linje'));
    const vem = el('p', 'sk-vem');
    vem.append(el('span', 'sk-namn', k.citat.vem));
    const under = [k.citat.verk, k.citat.ar].filter(Boolean).join(', ');
    if (under) vem.append(' ', el('span', 'sk-verk', under));
    innehall.append(vem);
    if (egen) innehall.append(el('p', 'sk-text sk-egen', egen));
  } else if (k.form === 'handelse' && k.handelse) {
    innehall.append(el('p', 'sk-ar', String(k.handelse.ar)), el('p', 'sk-vad', k.handelse.vad));
    if (egen) innehall.append(el('p', 'sk-text sk-egen', egen));
  }
  f.append(innehall);
  // En händelse med foto har bilden närmast foten, som i Word.
  if (k.form === 'handelse' && bild) f.append(img());
  const fot = el('div', 'sk-fot');
  const rad1 = el('div', 'sk-fotrad');
  rad1.append(el('span', 'sk-fraga', utanFraga ? '' : data.fraga), el('span', 'sk-markning', `${k.niva} · ${k.nr}`));
  fot.append(rad1);
  if (bild) fot.append(el('p', 'sk-upphov', bild.rad));
  f.append(fot);
  return f;
}

/** Texten så stor som kortet rymmer: från nivåns storlek och nedåt, tills innehållet ryms över foten. */
export function passa(kort: HTMLElement) {
  const inne = kort.querySelector<HTMLElement>('.sk-innehall');
  if (!inne || kort.classList.contains('liten')) return;
  const bredd = kort.clientWidth;
  let skala = 1;
  kort.style.setProperty('--skala', '1');
  const vers = kort.querySelector<HTMLElement>('.sk-vers');
  if (vers) {
    vers.classList.add('hel');
    while (skala > 0.68 && vers.scrollWidth > vers.clientWidth + 1) { skala -= 0.02; kort.style.setProperty('--skala', skala.toFixed(2)); }
    if (vers.scrollWidth > vers.clientWidth + 1) vers.classList.remove('hel');
  }
  while (skala > 0.45 && inne.scrollHeight > inne.clientHeight + 1) {
    skala -= 0.04;
    kort.style.setProperty('--skala', skala.toFixed(2));
  }
  kort.dataset.bredd = String(bredd);
}
