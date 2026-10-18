// Lösningsförslaget som HTML (src/lib/problemform.ts; metodriggens TILL-SAJTEN 2026-10-18): bladet på problemets sida i
// metoden (Losningsforslag.astro) och i Visa stort på Ta fram ett matteproblem (src/scripts/tafram.ts) ritas av samma
// funktion, så att de två inte kan glida isär. Formen är Word-bladets (losningsforslagSida i src/lib/metoddocx.ts):
// "Lösningsförslag · <innehållstagg>" över titeln, problemet i en ruta med bilden bredvid och svaret och kontrollen under,
// idén i en mening, lösning A och B bredvid varandra, lösning C med tankevurpan och lärarens rader, frågorna om tankarna
// bakom och rutan om att visa och jämföra lösningar. Stilen står i src/styles/global.css (.lf). Inga Node-beroenden:
// funktionen körs också i webbläsaren.
// Bladet som data (losningsforslagVy) görs i src/lib/problemform.ts, där måtten finns, så att webbläsaren bara hämtar
// det som ritar.

/** Bilden som bladet visar: adressen (med version på Ta fram-sidan) och textalternativet. */
export interface LfBild { adress: string; alt: string }
/** Lösningsförslaget som data: det bladet visar, utan metodens ramar, så att det går att skicka i Ta fram-sidans datafil. */
export interface LosningsforslagVy {
  titel: string; niva: string; vad: string; tagg: string; kalla: string;
  problem: { stycken: string[]; fragor: string[]; bild?: LfBild };
  svaret: string; kontroll: string; iden: string;
  losningar: { namn: string; text: string; bild: LfBild }[];
  c?: { namn: string; rader: string[]; larare: string[] };
  fragor: string[];
  ruta: { rubrik: string; punkter: { namn: string; text: string }[] };
  /** Lösningarnas bilder som andel av spaltens bredd, som i Word (losningsforslagMatt i src/lib/boksida.ts). */
  skala: number;
}

const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// En rad med **fet** och *kursiv*, som formRuns i Word, och radbrytningarna som <br>.
const inline = (s: string) => String(s).split('\n').map((rad) => esc(rad).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>')).join('<br>');
const bildHtml = (b: LfBild, klass: string) => `<p class="${klass}"><a href="${esc(b.adress)}" class="bild-lank" title="Öppna bilden i full storlek"><img src="${esc(b.adress)}" alt="${esc(b.alt)}" width="960" height="540" loading="lazy" decoding="async" data-utskriftsbild></a></p>`;

/** Bladet som HTML. id och ankare är sektionens och titelns id, farg nivåns färg och rubrik titelns rubriknivå; bladets
 *  egna rubriker (Problemet, lösningarnas namn, Frågor om tankarna bakom och rutan) står en nivå under. utanProblem är
 *  bladet bredvid problemet i Visa stort (Niclas 2026-10-18: "när det är brevid problemet behövs ju inte problemet igen
 *  att visas", och "Då blir Iden... Först i visningsläget"): idén först, och svaret och kontrollen, som annars står i
 *  problemets ruta, i en egen ruta under. Utskriften och problemets sida i metoden har hela A4:et. */
export function losningsforslagHtml(v: LosningsforslagVy, o: { id?: string; ankare?: string; farg: string; rubrik?: 'h2' | 'h3'; utanProblem?: boolean }): string {
  const h = o.rubrik ?? 'h3';
  const u = h === 'h2' ? 'h3' : 'h4';
  const rubrik = (text: string, klass = '') => `<${u} class="lf-rubrik${klass}">${esc(text)}</${u}>`;
  const svaret = [
    `<p class="lf-svar lf-forsta"><strong>Svaret:</strong> ${inline(v.svaret)}</p>`,
    ...(v.kontroll ? [`<p class="lf-svar"><strong>Kontroll:</strong> ${inline(v.kontroll)}</p>`] : []),
  ];
  const iden = `<p class="lf-iden"><span class="lf-rubrik">Idén:</span> <em>${inline(v.iden)}</em></p>`;
  const delar = [
    `<p class="lf-etikett">${esc(['Lösningsförslag', v.tagg].filter(Boolean).join(' · '))}</p>`,
    `<${h} class="boksida-titel"${o.ankare ? ` id="${esc(o.ankare)}"` : ''}><span class="visually-hidden">Lösningsförslag: ${esc(v.niva)}, ${esc(v.vad)}: </span>${esc(v.titel)}</${h}>`,
    ...(o.utanProblem
      ? [iden, `<div class="lf-svarsruta">${svaret.join('')}</div>`]
      : [
        '<div class="lf-problem">',
        '<div class="lf-problem-text">',
        rubrik('Problemet'),
        ...v.problem.stycken.map((t) => `<p class="lf-elev">${inline(t)}</p>`),
        ...v.problem.fragor.map((t) => `<p class="lf-elev lf-fraga">${inline(t)}</p>`),
        ...svaret,
        '</div>',
        ...(v.problem.bild ? [bildHtml(v.problem.bild, 'lf-problem-bild')] : []),
        '</div>',
        iden,
      ]),
    '<div class="lf-losningar">',
    ...v.losningar.map((l) => `<div class="lf-losning">${rubrik(l.namn)}${bildHtml(l.bild, 'lf-losning-bild')}<p class="lf-losning-text">${inline(l.text)}</p></div>`),
    '</div>',
    ...(v.c ? [`<div class="lf-c"><div class="lf-c-elev">${rubrik(v.c.namn)}<p class="lf-hand">${v.c.rader.map(inline).join('<br>')}</p></div><div class="lf-c-larare">${v.c.larare.map((r) => `<p>${inline(r)}</p>`).join('')}</div></div>`] : []),
    rubrik('Frågor om tankarna bakom', ' lf-fragor-rubrik'),
    `<ol class="lf-fragor">${v.fragor.map((f, i) => `<li><span class="lf-nr">${i + 1}.</span><span>${inline(f)}</span></li>`).join('')}</ol>`,
    `<div class="lf-ruta">${rubrik(v.ruta.rubrik)}<ul>${v.ruta.punkter.map((p) => `<li>${p.namn ? `<strong>${esc(p.namn)}.</strong> ` : ''}${inline(p.text)}</li>`).join('')}</ul></div>`,
  ];
  const stil = `--bok-niva: ${esc(o.farg)}; --lf-skala: ${Math.round(v.skala * 100)}%`;
  return `<section class="m-ram boksida lf${o.utanProblem ? ' lf-utan-problem' : ''}"${o.id ? ` id="${esc(o.id)}"` : ''} style="${stil}"><div class="boksida-ram">${delar.join('')}</div><p class="boksida-fot"><span>${inline(v.kalla)}</span> <span class="boksida-knapp">${esc(v.niva.toUpperCase())} · ${esc(v.vad)} · lösningsförslag</span></p></section>`;
}

// Lösningarna på helskärm i Visa stort (Niclas 2026-10-18: "tycker du varje problem också BARA ska ha de tre
// lösningsförslagen A, B och C efter varandra lite större för att kunna visa på helskärm?", med metodriggens ordning):
// problemet, lösning A ensam, lösning B ensam, A och B bredvid varandra för jämförelsen, och lösning C ensam i elevens
// handstil, utan lärarens rader och frågan, så att det är läraren som frågar. Det är rutans gång: visa två sätt, ett i
// taget, och sedan tankevurpan som en elevs på en annan skola. Lösningarnas meningar står inte här, eftersom eleverna
// förklarar dem med egna ord. Steget Problemet ritar Visa stort själv.
export const LOSNINGSSTEG = ['Problemet', 'Lösning A', 'Lösning B', 'A och B', 'Lösning C'];
/** Stegen som finns för ett lösningsförslag: Lösning C bara när det har en tankevurpa. */
export const losningsstegen = (v: Pick<LosningsforslagVy, 'c'>) => LOSNINGSSTEG.slice(0, v.c ? 5 : 4);
export function losningsstegHtml(v: Pick<LosningsforslagVy, 'losningar' | 'c'>, steg: number): string {
  const losning = (l: LosningsforslagVy['losningar'][number]) => `<figure class="lfv-losning"><figcaption class="lf-rubrik">${esc(l.namn)}</figcaption><img src="${esc(l.bild.adress)}" alt="${esc(l.bild.alt)}" width="960" height="540"></figure>`;
  if (steg === 1 || steg === 2) return `<div class="lfv lfv-en">${losning(v.losningar[steg - 1])}</div>`;
  if (steg === 3) return `<div class="lfv lfv-tva">${v.losningar.map(losning).join('')}</div>`;
  if (steg === 4 && v.c) return `<div class="lfv lfv-c"><p class="lf-rubrik">${esc(v.c.namn)}</p><p class="lfv-hand">${v.c.rader.map(inline).join('<br>')}</p></div>`;
  return '';
}
