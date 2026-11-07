// Mejlens standard, formen Repliken (K-729; Niclas 2026-11-07: "Replik blir det", efter "Går det att göra Brevo kampanjerna mer
// designade? Kan du testa olika grepp i en preview, designa och skapa en standard för artiklar, böcker och stödundervisning och
// metoder?"). Varje mejl öppnar med en mening ur innehållet, satt som sajtens lyftcitat, och sedan kommer rubriken och knappen.
// En sak gäller alla mejl: ram, huvud, fot, knapp och mörkt läge står här en gång, och innehållet kommer ur nytt.json
// (src/pages/nytt.json.ts), så att ett nytt inlägg får formen av sig själv. Provmejlen och bilderna står i
// underlag/prov/mejl/, och scripts/utskicksprov.mjs prövar mallarna.
//
// Det här är mejl och inga webbsidor: tabeller, stilen på varje element, högst 600 punkter brett och systemens typsnitt, så att
// de håller i Gmail, Outlook och Apple Mail. Allt bärande är text, så att mejlet går att läsa med bilderna avstängda.
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const FARG = { mork: '#14202b', text: '#14202b', svag: '#4b5866', vit: '#ffffff', ton: '#f3f6fa', kant: '#e1e6eb', accent: '#1d4f91', blek: '#c9d4e1' };
const AMNEN = { Läsning: '#1e6b45', Skrivning: '#6b2f6b', Socialt: '#8f3b14', Matematik: '#1d4f91' };
const SANS = `'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif`;
const ANTIKVA = `Charter,'Iowan Old Style','Sitka Text',Cambria,'Noto Serif',Georgia,serif`;
const TABELL = 'role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"';

// Mörkt läge går inte att skriva på elementen, så det står i ett litet block. Tas blocket bort av en mejlklient är ljust läge oförändrat.
const MORKT = '@media (prefers-color-scheme:dark){body,.m-ut{background-color:#0d151c!important}.m-yta{background-color:#14202b!important}.m-ton{background-color:#1d2c3a!important}.m-text{color:#eef2f7!important}.m-svag{color:#b4c0cd!important}.m-lank{color:#a9c9f5!important}.m-kant{border-color:#33434f!important}.m-bleke{color:#4a5c6d!important}.m-streck{background-color:#33434f!important}.m-knapp{background-color:#a9c9f5!important;border-color:#a9c9f5!important}.m-knapptext{color:#14202b!important}}';

// Långa sammansatta ord får brytas i en smal telefon, där en rubrik annars går utanför kanten.
const SAMMANSATTA = [['kognitions', 'vetenskaplig'], ['speciallärar', 'utbildning'], ['lärar', 'handledning'], ['läs', 'undervisning'], ['stöd', 'undervisning'], ['grupp', 'utveckling']];
const delbar = (t) => SAMMANSATTA.reduce((ut, [a, b]) => ut.replace(new RegExp(`(${a})(${b})`, 'gi'), '$1­$2'), esc(t));

/** Hela mejlet: ram, förhandstexten som syns i inkorgen, och innehållet som tabellrader. */
export function ram({ titel, pre, inne }) {
  return `<!doctype html>
<html lang="sv" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,date=no,address=no">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(titel)}</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<style>${MORKT}</style>
</head>
<body style="margin:0;padding:0;background-color:${FARG.ton};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${FARG.ton};opacity:0;">${esc(pre)}</div>
<table ${TABELL} bgcolor="${FARG.ton}" class="m-ut" style="background-color:${FARG.ton};"><tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table ${TABELL} bgcolor="${FARG.vit}" class="m-yta" style="width:100%;max-width:600px;background-color:${FARG.vit};">
${inne.join('\n')}
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>
`;
}

const sektion = (inne, { bg = FARG.vit, pad = '0 24px', k = 'm-yta' } = {}) => `<tr><td bgcolor="${bg}" class="${k}" style="background-color:${bg};padding:${pad};">${inne}</td></tr>`;
const stycke = (t, { f = SANS, s = 18, l = 28, c = FARG.text, m = '0 0 16px', w = 400, k = 'm-text', x = '' } = {}) => `<p class="${k}" style="margin:${m};font-family:${f};font-size:${s}px;line-height:${l}px;font-weight:${w};color:${c};mso-line-height-rule:exactly;${x}">${t}</p>`;
const svag = (t, o = {}) => stycke(t, { s: 15, l: 22, c: FARG.svag, k: 'm-svag', ...o });

function byggare(sajt) {
  const abs = (u) => (/^https?:/.test(u) ? u : `${sajt}${u}`);
  const lank = (t, url, { x = 'text-decoration:underline;' } = {}) => `<a href="${esc(abs(url))}" class="m-lank" style="color:${FARG.accent};${x}">${t}</a>`;
  const huvud = `<tr><td bgcolor="${FARG.mork}" style="background-color:${FARG.mork};padding:18px 24px;"><a href="${esc(sajt)}" style="font-family:${ANTIKVA};font-size:23px;line-height:28px;font-weight:700;color:#ffffff;text-decoration:none;">Niclas Fohlin</a></td></tr>`;
  const fot = (pad = '28px 24px 36px') => sektion(stycke(`Du får det här mejlet för att du prenumererar på nytt från Niclas Fohlin. <a href="{{ unsubscribe }}" class="m-svag" style="color:${FARG.svag};">Avsluta prenumerationen</a> · <a href="{{ mirror }}" class="m-svag" style="color:${FARG.svag};">Visa i webbläsaren</a>`, { s: 14, l: 21, c: FARG.svag, k: 'm-svag', m: '0' }), { pad });
  const knapp = (text, url) => `<table ${TABELL}><tr><td align="center" bgcolor="${FARG.accent}" class="m-knapp" style="background-color:${FARG.accent};border:2px solid ${FARG.accent};border-radius:12px;mso-padding-alt:16px 20px;"><a href="${esc(abs(url))}" class="m-knapptext" style="display:block;padding:16px 20px;font-family:${SANS};font-size:18px;line-height:22px;font-weight:700;color:#ffffff;text-decoration:none;text-align:center;border-radius:12px;">${esc(text)}</a></td></tr></table>`;
  const bild = (b, bredd, hojd, x = '', bg = FARG.ton) => `<img src="${esc(abs(b.src))}" alt="${esc(b.alt ?? '')}" width="${bredd}"${hojd ? ` height="${hojd}"` : ''} style="display:block;box-sizing:border-box;width:100%;max-width:${bredd}px;height:auto;border:0;background-color:${bg};font-family:${SANS};font-size:15px;line-height:21px;color:${FARG.svag};${x}">`;
  // Länkar runt bilder och text står i ett stycke eller en cell som bär luften, eftersom Outlook i Windows inte tar display:block på en länk.
  const bildlank = (url, inne, m = '0') => `<p style="margin:${m};padding:0;"><a href="${esc(abs(url))}" style="text-decoration:none;">${inne}</a></p>`;

  // Lyftcitatets tecken och linje, och meningen under dem.
  const tecknet = `<span class="m-bleke" style="font-family:${ANTIKVA};font-size:104px;line-height:62px;font-weight:700;color:${FARG.blek};">”</span>`;
  const streck = `<table ${TABELL}><tr><td height="2" bgcolor="${FARG.blek}" class="m-streck" style="height:2px;font-size:0;line-height:0;background-color:${FARG.blek};">&nbsp;</td></tr></table>`;
  const citatet = (inne) => `<table ${TABELL}><tr><td width="70" valign="top" style="padding:0 12px 0 0;">${tecknet}</td><td valign="top" style="padding:16px 0 0;">${streck}</td></tr></table>${inne}`;
  const stor = (t, s, l) => `<span class="m-text" style="font-family:${ANTIKVA};font-size:${s}px;line-height:${l}px;font-weight:700;font-style:italic;color:${FARG.text};">${t}</span>`;
  const repliken = (rader, url) => {
    const langd = rader.join(' ').length;
    const [s, l] = rader.length > 1 || langd <= 90 ? [29, 38] : langd <= 140 ? [27, 36] : langd <= 200 ? [24, 33] : [22, 31];
    return citatet(`<p style="margin:0 0 22px;padding:0;"><a href="${esc(abs(url))}" style="text-decoration:none;">${rader.map((r) => stor(delbar(r), s, l)).join('<br>')}</a></p>`);
  };

  const rubrik = (p, { f = SANS, s = 31, l = 35, w = 800, ls = '-.6px', m = '0 0 18px', tagg = 'h1' } = {}) => `<${tagg} style="margin:${m};font-family:${f};font-size:${s}px;line-height:${l}px;font-weight:${w};letter-spacing:${ls};mso-line-height-rule:exactly;overflow-wrap:break-word;"><a href="${esc(abs(p.url))}" class="m-text" style="color:${FARG.text};text-decoration:none;">${delbar(p.titel)}</a></${tagg}>`;
  const etikett = (t, c = FARG.svag) => stycke(esc(t), { s: 16, l: 22, c, k: 'm-svag', w: 600, m: '0 0 6px' });
  const rubrikForm = (p) => (p.typ === 'artikel' ? { f: ANTIKVA, s: 29, l: 35, w: 700, ls: '0' } : {});

  const lankRader = (rader) => `<table ${TABELL}>${rader.map((l) => `<tr><td class="m-kant" style="border-top:1px solid ${FARG.kant};padding:14px 0;"><a href="${esc(abs(l.url))}" class="m-svag" style="font-family:${SANS};font-size:17px;line-height:25px;color:${FARG.svag};text-decoration:none;"><span class="m-lank" style="color:${FARG.accent};font-weight:700;text-decoration:underline;">${esc(l.text)}</span>${l.efter ? `: ${esc(l.efter)}.` : ''}</a></td></tr>`).join('')}</table>`;
  const lektioner = (p) => (p.lektioner?.length ? stycke(`${p.lektioner.length === 1 ? `Med ${esc(p.lektioner[0].ord?.den ?? 'lektionen')}` : `Med ${p.lektioner.length} ${esc(p.lektioner[0].ord?.flera ?? 'lektioner')}`}: ${p.lektioner.map((l) => lank(esc(l.namn ?? l.titel), l.url)).join(', ')}.`, { s: 17, l: 26 }) : '');
  const originalet = (p) => (p.text?.original ? svag(`Publicerad först i ${lank(esc(p.text.publikation), p.text.original)}.`, { m: '0' }) : '');

  // Korten att skriva ut, som på metodens sida: fyra kort två och två, och färre som rader med metodens mening om saken.
  const korten = (k) => {
    const cell = (x, vanster) => `<td width="50%" valign="top" style="padding:${vanster ? '0 6px 14px 0' : '0 0 14px 6px'};"><a href="${esc(abs(x.url))}" style="text-decoration:none;">${bild({ src: x.bild, alt: `${k.namn}: ${x.namn}` }, 270, 183, `border:1px solid ${FARG.kant};border-radius:8px;`, FARG.vit)}</a><div style="padding:6px 0 0;"><a href="${esc(abs(x.url))}" class="m-text" style="font-family:${SANS};font-size:16px;line-height:22px;font-weight:700;color:${FARG.text};text-decoration:none;">${esc(x.namn)}</a></div></td>`;
    const rad = (x) => `<tr><td width="104" valign="middle" class="m-kant" style="border-top:1px solid ${FARG.kant};padding:10px 14px 10px 0;"><a href="${esc(abs(x.url))}" style="text-decoration:none;"><img src="${esc(abs(x.bild))}" alt="${esc(x.namn)}" width="104" height="70" style="display:block;width:104px;height:auto;border:1px solid ${FARG.kant};border-radius:6px;background-color:#ffffff;font-family:${SANS};font-size:13px;line-height:17px;color:${FARG.svag};"></a></td><td valign="middle" class="m-kant" style="border-top:1px solid ${FARG.kant};padding:10px 0;"><a href="${esc(abs(x.url))}" class="m-text" style="font-family:${SANS};font-size:17px;line-height:23px;font-weight:700;color:${FARG.text};text-decoration:none;">${esc(x.namn)}</a><br><span class="m-svag" style="font-family:${SANS};font-size:15px;line-height:21px;color:${FARG.svag};">${esc(x.rad)}</span></td></tr>`;
    const r = k.rader;
    const lista = r.length === 4
      ? `<table ${TABELL} style="table-layout:fixed;"><tr>${cell(r[0], true)}${cell(r[1], false)}</tr><tr>${cell(r[2], true)}${cell(r[3], false)}</tr></table>`
      : `<table ${TABELL}>${r.map(rad).join('')}</table>`;
    return sektion(
      stycke(esc(k.etikett), { s: 19, l: 25, w: 700, m: '0 0 14px' }) + lista +
      stycke(lank(esc(k.alla.text), k.alla.url, { x: 'text-decoration:underline;font-weight:700;' }), { s: 17, l: 23, m: '8px 0 6px' }),
      { bg: FARG.ton, k: 'm-ton', pad: '24px 24px 20px' });
  };

  // En bok har omslaget bredvid rubriken, och allt annat rubriken ensam.
  const rubrikdelen = (p) => {
    const c = AMNEN[p.omrade] ?? FARG.svag;
    if (p.typ === 'bok' && p.bild) {
      return `<table ${TABELL}><tr><td width="112" valign="top" style="padding:0 16px 0 0;">${bildlank(p.url, bild(p.bild, 112, 159, `border:1px solid ${FARG.kant};`))}</td><td valign="top">${etikett(p.etikett)}${rubrik(p, { s: 23, l: 27, ls: '-.4px', m: '0 0 8px' })}${p.forfattare ? svag(esc(p.forfattare), { m: '0' }) : ''}</td></tr></table><div style="height:18px;line-height:18px;font-size:0;">&nbsp;</div>`;
    }
    return etikett(p.etikett, c) + rubrik(p, rubrikForm(p));
  };
  // Repliken är ofta ingressens första mening, och då står den inte en gång till under knappen: brod i nytt.json är resten av ingressen.
  const brodet = (p) => p.brod ?? p.ingress;
  const kroppen = (p) =>
    (brodet(p) ? stycke(esc(brodet(p)), { m: p.bild && p.typ !== 'bok' ? '0 0 22px' : '0 0 18px' }) : '') +
    (p.bild && p.typ !== 'bok' ? bildlank(p.url, bild(p.bild, 552, 311, 'border-radius:10px;'), '0 0 20px') : '') +
    lektioner(p) +
    (p.lankar?.length ? lankRader(p.lankar) : '') +
    originalet(p);

  return { abs, lank, huvud, fot, knapp, bild, bildlank, citatet, stor, repliken, rubrik, etikett, korten, rubrikdelen, kroppen };
}

/** Knappens ord: Läs hela krönikan, Läs om boken, Öppna verktyget, Öppna metoden eller Öppna lektionen. */
export const knappensOrd = (p) => (p.text ? `Läs hela ${p.text.den}` : p.typ === 'bok' ? 'Läs om boken' : p.typ === 'verktyg' ? 'Öppna verktyget' : `Öppna ${p.ord?.den ?? 'metoden'}`);

/** Mejlet om nytt innehåll: det första inlägget med repliken överst, och fler inlägg i samma mejl under det, med varsin replik. */
export function postMejl(poster, sajt, { titel, pre } = {}) {
  const b = byggare(sajt);
  const inne = [b.huvud];
  for (const [i, p] of poster.entries()) {
    if (i) inne.push(`<tr><td bgcolor="${FARG.vit}" class="m-yta" style="background-color:${FARG.vit};padding:6px 24px 0;"><table ${TABELL}><tr><td class="m-kant" style="border-top:1px solid ${FARG.kant};font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>`);
    inne.push(sektion(b.repliken(p.replik?.length ? p.replik : p.text?.citat ? [p.text.citat] : [p.titel], p.url), { pad: '30px 24px 0' }));
    inne.push(sektion(b.rubrikdelen(p) + b.knapp(knappensOrd(p), p.url), { pad: '0 24px 26px' }));
    inne.push(sektion(b.kroppen(p), { pad: '0 24px 14px' }));
    if (p.kort) inne.push(b.korten(p.kort));
  }
  inne.push(b.fot());
  return ram({ titel: titel ?? poster[0].titel, pre: pre ?? poster[0].ingress, inne });
}

// Ordningen i topplistan syns i storleken: den första raden störst, och talen behövs inte (Niclas valde formen utan tal 2026-11-07).
const STORLEK = [[25, 30, 800], [20, 26, 700], [17, 23, 600]];
function topplistan(l, b) {
  const f = l.namn === 'Artiklar' ? ANTIKVA : SANS;
  const rubrik = `<p style="margin:0 0 6px;padding:0;"><a href="${esc(b.abs(l.url))}" class="m-lank" style="font-family:${SANS};font-size:17px;line-height:23px;font-weight:700;color:${FARG.accent};text-decoration:none;">${esc(l.namn)}</a></p>`;
  const not = l.not ? svag(esc(l.not), { s: 14, l: 20, m: '6px 0 0' }) : '';
  // Böckerna står på en hylla där omslagen krymper.
  if (l.namn === 'Böcker' && l.rader.every((r) => r.bild)) {
    const antal = l.rader.length;
    const bredd = [[100], [58, 42], [42, 32, 26]][antal - 1];
    const px = [[150], [150, 112], [150, 112, 92]][antal - 1];
    const sista = (i) => (i < antal - 1 ? 10 : 0);
    const hylla = l.rader.map((r, i) => `<td width="${bredd[i]}%" valign="bottom" style="padding:0 ${sista(i)}px 0 0;">${b.bildlank(r.url, b.bild({ src: r.bild.src, alt: `Omslaget till ${r.titel}` }, px[i], Math.round(px[i] * 1.42), `border:1px solid ${FARG.kant};`))}</td>`).join('');
    const namn = l.rader.map((r, i) => `<td valign="top" style="padding:8px ${sista(i)}px 0 0;"><a href="${esc(b.abs(r.url))}" class="m-text" style="font-family:${SANS};font-size:${[15, 14, 13][i]}px;line-height:${[20, 19, 18][i]}px;font-weight:${[700, 600, 600][i]};color:${FARG.text};text-decoration:none;">${delbar(r.titel)}</a></td>`).join('');
    return `<tr><td class="m-kant" style="border-top:1px solid ${FARG.kant};padding:18px 0 22px;">${rubrik}<table ${TABELL} style="table-layout:fixed;"><tr>${hylla}</tr><tr>${namn}</tr></table>${not}</td></tr>`;
  }
  // Har alla rader samma rad säger den inget, som Hela klassen, F–9 tre gånger i Metoder.
  const lika = l.rader.length > 1 && l.rader.every((r) => r.rad === l.rader[0].rad);
  const rader = l.rader.map((r, i) => {
    const [s, lh, w] = STORLEK[i] ?? STORLEK[2];
    return `<tr><td style="padding:6px 0;overflow-wrap:break-word;"><a href="${esc(b.abs(r.url))}" class="m-text" style="font-family:${f};font-size:${s}px;line-height:${lh}px;font-weight:${w};${s > 20 ? 'letter-spacing:-.3px;' : ''}color:${FARG.text};text-decoration:none;">${delbar(r.titel)}</a>${r.rad && !lika ? `<br><span class="m-svag" style="font-family:${SANS};font-size:15px;line-height:21px;color:${FARG.svag};">${esc(r.rad)}</span>` : ''}</td></tr>`;
  }).join('');
  return `<tr><td class="m-kant" style="border-top:1px solid ${FARG.kant};padding:18px 0 16px;">${rubrik}<table ${TABELL}>${rader}</table>${not}</td></tr>`;
}

/**
 * Månadsbrevet (K-730): månadens första mening som repliken, brevet med underskrift, månadens nya och topp tre i de fyra
 * kategorierna. Innehållet kommer ur manadensBrev i netlify/lib/manadsbrev.mjs.
 */
export function manadsMejl(m, sajt) {
  const b = byggare(sajt);
  const BREV = { f: ANTIKVA, s: 19, l: 31, m: '0 0 18px' };
  const mest = m.mest ? `Mest lästa metoden i ${esc(m.manadsnamn)} var ${b.lank(delbar(m.mest[0].titel), m.mest[0].url)}${m.mest[1] ? `, ${esc(m.mestOrd)} ${b.lank(delbar(m.mest[1].titel), m.mest[1].url)}` : ''}.` : '';
  const n = m.nyast;
  return ram({ titel: m.amne, pre: m.pre, inne: [
    b.huvud,
    sektion(b.citatet(`<h1 style="margin:0;padding:0 0 18px;">${b.stor(esc(m.forsta), 42, 48)}</h1>`), { pad: '30px 24px 0' }),
    sektion(
      stycke(esc(m.manad), { s: 16, l: 22, c: FARG.svag, k: 'm-svag', w: 600, m: '0 0 12px' }) +
      stycke(esc(m.text), BREV) +
      (mest ? stycke(mest, BREV) : '') +
      stycke('Niclas', { f: ANTIKVA, s: 21, l: 30, w: 700, m: '6px 0 12px', x: 'font-style:italic;' }) +
      (m.summa || m.ps ? stycke(`P.S. ${esc([m.ps, m.summa].filter(Boolean).join(' '))}`, { f: ANTIKVA, s: 17, l: 27, c: FARG.svag, k: 'm-svag', m: '0' }) : ''),
      { pad: '12px 24px 26px' }),
    ...(n ? [sektion(
      b.etikett(n.etikett) +
      b.rubrik(n, { s: 30, l: 34, ls: '-.5px', m: '0 0 8px', tagg: 'h2' }) +
      stycke(esc(n.rad), { s: 18, l: 27, m: '0 0 16px' }) +
      (n.bild ? b.bildlank(n.url, b.bild(n.bild, 552, n.typ === 'bok' ? 0 : 311, 'border-radius:8px;'), '0 0 16px') : '') +
      stycke(esc(n.ingress), { s: 17, l: 26, m: '0 0 18px' }) +
      b.knapp(knappensOrd(n), n.url),
      { bg: FARG.ton, k: 'm-ton', pad: '24px 24px 26px' })] : []),
    sektion(
      stycke(`Mest läst i ${esc(m.manadsnamn)}`, { f: ANTIKVA, s: 25, l: 31, w: 700, m: '0 0 16px', x: 'font-style:italic;' }) +
      `<table ${TABELL}>${m.listor.map((l) => topplistan(l, b)).join('')}</table>`,
      { pad: '28px 24px 0' }),
    b.fot('10px 24px 36px'),
  ] });
}
