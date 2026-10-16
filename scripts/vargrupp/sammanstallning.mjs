// Sammanställningen för formuläret Vår grupp (K-372, K-373). Niclas 2026-10-16: svar från samma vecka slås ihop till
// ett tillfälle ("Tillfälle 1 (v. 42)"), samma formulär visar gruppens utveckling över tid, designen ska vara tydlig
// med en bra visualisering, flikarna lätta att hitta i, och det ska fungera för vilka datum som helst. Kalkylarket är
// kopplat till formuläret av Niclas, och svaren hamnar i fliken Formulärsvar 1. Skriptet bygger flikarna
// Sammanställning, Per påstående, Elevernas svar och den dolda Underlag med vanliga formler (ingen behörighet för
// läraren att godkänna), formaten, en rad med länkar mellan flikarna och två diagram. Kalkylarket är svenskt: formlerna
// har semikolon och decimalkomma, och en grupperad fråga sorterar bara på en vald kolumn (Google:
// COL_IN_ORDER_MUST_BE_IN_SELECT), så veckans nyckel väljs och tas bort med CHOOSECOLS. Veckan är ISO-veckan, och året
// är torsdagens år i den veckan, så att en vecka över årsskiftet blir ett tillfälle. Kör skriptet igen, så skrivs
// flikarna om.
import { readFileSync } from 'node:fs';
import { anrop } from './google.mjs';

const f = JSON.parse(readFileSync(new URL('./vargrupp.json', import.meta.url), 'utf8'));
const S = `https://sheets.googleapis.com/v4/spreadsheets/${f.ark}`;
const ok = (r, vad) => { if (r.status >= 300) throw new Error(`${vad}: ${r.status} ${JSON.stringify(r.j.error ?? r.j).slice(0, 500)}`); return r.j; };
const PASTAENDEN = [
  ['Eleverna i gruppen trivs tillsammans.', 'Trivs tillsammans'],
  ['De flesta i gruppen är snälla och hjälpsamma.', 'Snälla och hjälpsamma'],
  ['Vi samarbetar bra i gruppen.', 'Samarbetar bra'],
  ['De andra i gruppen accepterar mig som jag är.', 'Accepterar mig'],
  ['Jag känner mig trygg i gruppen.', 'Trygg i gruppen'],
  ['Jag hjälper till så att gruppen har det bra.', 'Hjälper till'],
];
const FRITT = 'Det här vill jag säga om vår grupp';
const kortnamn = PASTAENDEN.map(([, k]) => k);

// ---------- Svarsfliken ----------
const meta = ok(await anrop(`${S}?fields=sheets(properties(sheetId,title))`), 'kalkylarket läses');
const svarsflik = meta.sheets.map((s) => s.properties).find((p) => /^(Formulärsvar|Form Responses)/.test(p.title));
if (!svarsflik) { console.log('Formuläret är inte kopplat till kalkylarket än: fliken Formulärsvar saknas.'); process.exit(2); }
const R = `'${svarsflik.title}'`;
const rubriker = ok(await anrop(`${S}/values/${encodeURIComponent(`${R}!1:1`)}`), 'svarsflikens rubriker').values?.[0] ?? [];
const kolumn = (titel) => { const i = rubriker.findIndex((h) => h.trim() === titel); if (i < 0) throw new Error(`Kolumnen saknas i ${svarsflik.title}: ${titel}`); return String.fromCharCode(65 + i); };
const K = PASTAENDEN.map(([t]) => kolumn(t));
const X = kolumn(FRITT);
const T = `${R}!A2:A`;
const c = (k) => `${R}!${k}2:${k}`;

// ---------- Flikarna: skapa de som saknas, töm de som finns ----------
const FLIKAR = ['Sammanställning', 'Per påstående', 'Elevernas svar', 'Underlag'];
const nya = FLIKAR.filter((t) => !meta.sheets.some((s) => s.properties.title === t));
if (nya.length) ok(await anrop(`${S}:batchUpdate`, { method: 'POST', body: JSON.stringify({ requests: nya.map((title) => ({ addSheet: { properties: { title } } })) }) }), 'flikarna skapas');
const m2 = ok(await anrop(`${S}?fields=sheets(properties(sheetId,title),charts(chartId),conditionalFormats,protectedRanges(protectedRangeId),merges)`), 'kalkylarket läses igen');
const id = (t) => m2.sheets.find((s) => s.properties.title === t).properties.sheetId;
const vara = m2.sheets.filter((s) => FLIKAR.includes(s.properties.title));
ok(await anrop(`${S}:batchUpdate`, { method: 'POST', body: JSON.stringify({ requests: [
  ...m2.sheets.flatMap((s) => (s.charts ?? []).map((ch) => ({ deleteEmbeddedObject: { objectId: ch.chartId } }))),
  ...vara.flatMap((s) => (s.conditionalFormats ?? []).map(() => ({ deleteConditionalFormatRule: { sheetId: s.properties.sheetId, index: 0 } }))),
  ...vara.flatMap((s) => (s.protectedRanges ?? []).map((p) => ({ deleteProtectedRange: { protectedRangeId: p.protectedRangeId } }))),
  ...vara.map((s) => ({ unmergeCells: { range: { sheetId: s.properties.sheetId } } })),
  ...vara.map((s) => ({ updateCells: { range: { sheetId: s.properties.sheetId }, fields: 'userEnteredValue,userEnteredFormat,textFormatRuns' } })),
] }) }), 'flikarna töms');
const [sa, pp, es, ul] = FLIKAR.map(id);

// ---------- Underlag: en rad per svar ----------
const om = (uttryck) => `=ARRAYFORMULA(IF(${T}="";;${uttryck}))`;
const isoAr = `YEAR(${T}-WEEKDAY(${T};3)+3)`;
const underlag = [
  ['Nyckel', 'Tillfälle', 'Gruppen', 'Jag i gruppen', ...kortnamn, ...kortnamn.map((k) => `${k} 4–5`), 'Eget svar'],
  [
    om(`${isoAr}*100+ISOWEEKNUM(${T})`),
    om(`"Tillfälle "&MATCH(A2:A;SORT(UNIQUE(FILTER(A2:A;A2:A<>"")));0)&" (v. "&ISOWEEKNUM(${T})&")"`),
    om(`(${c(K[0])}+${c(K[1])}+${c(K[2])})/3`),
    om(`(${c(K[3])}+${c(K[4])}+${c(K[5])})/3`),
    ...K.map((k) => om(c(k))),
    ...K.map((k) => om(`(${c(k)}>=4)*1`)),
    om(c(X)),
  ],
];

// ---------- Frågorna ----------
const per = 'Underlag!A2:Q';
const lista = (xs) => `{${xs.map((x) => `"${x}"`).join('\\')}}`;
const etiketter = (kol) => kol.map(([q, namn]) => `${q} '${namn}'`).join(', ');
const grupperad = (kolumner, namn) => {
  const sel = ['A', 'B', ...kolumner.map(([q]) => q)].join(', ');
  const fraga = `select ${sel} where A is not null group by A, B order by A label ${etiketter([['B', 'Tillfälle'], ...kolumner])}`;
  const behall = Array.from({ length: kolumner.length + 1 }, (_, i) => i + 2).join(';');
  return `=IFERROR(CHOOSECOLS(QUERY(${per};"${fraga}";0);${behall});${lista(['Tillfälle', ...namn])})`;
};
const SNITT = ['E', 'F', 'G', 'H', 'I', 'J'];
const ANDEL = ['K', 'L', 'M', 'N', 'O', 'P'];

// Sammanställning: rubriken, länkarna, det senaste tillfället i stora siffror och tabellen över alla tillfällen
// (rubrikraden 10, svaren från rad 11). Per påstående har sina rubrikrader på rad 5 och svaren från rad 6, så rad 11
// här är rad 6 där.
const SA = 11, PP = 6;
const sista = (kol) => `=IF(COUNTA($A${SA}:$A)=0;"";INDEX(${kol}${SA}:${kol};COUNTA($A${SA}:$A)))`;
const andring = (kol) => `=IF(COUNTA($A${SA}:$A)<2;"";INDEX(${kol}${SA}:${kol};COUNTA($A${SA}:$A))-INDEX(${kol}${SA}:${kol};COUNTA($A${SA}:$A)-1))`;
const sammanstallning = [
  ['Vår grupp · Sammanställning'],
  // Läraren landar här efter kopieringen, och formuläret ligger bredvid i Drive (Niclas 2026-10-16: "När man tryckt
  // på den öppnas spreadsheeten, inte formuläret"). Kalkylarket kan inte länka till kopians formulär, och en fast länk
  // skulle gå till originalet, så raden säger var det ligger.
  ['Formuläret ligger i din Drive som Kopia av Vår grupp. Publicera det och skicka det i Classroom, så kommer svaren hit av sig själva. Svar från samma vecka blir ett tillfälle, så att samma formulär visar gruppens utveckling över tid. Snittet går från 1 Aldrig till 5 Alltid, och De flesta 4–5 betyder att mer än hälften har svarat Oftast eller Alltid på varje påstående.'],
  [],
  ['Senaste tillfället'],
  ['Tillfälle', 'Svar', 'Gruppen', 'Jag i gruppen', 'Lägsta andel 4–5', 'De flesta 4–5', 'Svagast'],
  [`=IF(COUNTA($A${SA}:$A)=0;"Inga svar än";INDEX(A${SA}:A;COUNTA($A${SA}:$A)))`, sista('B'), sista('C'), sista('D'), sista('E'), sista('F'), sista('G')],
  ['Sedan förra tillfället', '', andring('C'), andring('D'), andring('E')],
  // Innan de första svaren har kommit visar Googles diagram en egen text om att lägga till en serie; raden säger att
  // de ritas av sig själva (en ny kopia ser annars trasig ut).
  [`=IF(COUNTA($A${SA}:$A)=0;"Diagrammen ritas av sig själva när de första svaren har kommit.";"")`],
  ['Alla tillfällen'],
  [grupperad([['count(E)', 'Svar'], ['avg(C)', 'Gruppen'], ['avg(D)', 'Jag i gruppen']], ['Svar', 'Gruppen', 'Jag i gruppen']),
    '', '', '', 'Lägsta andel 4–5', 'De flesta 4–5', 'Svagast'],
  ['', '', '', '',
    `=BYROW('Per påstående'!J${PP}:O;LAMBDA(r;IF(COUNT(r)=0;;MIN(r))))`,
    `=BYROW('Per påstående'!J${PP}:O;LAMBDA(r;IF(COUNT(r)=0;;IF(MIN(r)>0,5;"Ja";"Inte än"))))`,
    `=BYROW('Per påstående'!B${PP}:G;LAMBDA(r;IF(COUNT(r)=0;;INDEX(${lista(kortnamn)};1;MATCH(MIN(r);r;0)))))`],
];
const perPastaende = [
  ['Vår grupp · Per påstående'],
  ['Snittet för varje påstående och hur stor del som har svarat 4 eller 5, tillfälle för tillfälle.'],
  [],
  ['Snitt', '', '', '', '', '', '', '', 'Andel som svarat 4 eller 5', '', '', '', '', '', '', '', 'Senaste tillfället'],
  [grupperad(SNITT.map((k, i) => [`avg(${k})`, kortnamn[i]]), kortnamn), '', '', '', '', '', '', '',
    grupperad(ANDEL.map((k, i) => [`avg(${k})`, kortnamn[i]]), kortnamn), '', '', '', '', '', '', '',
    'Påstående', 'Snitt'],
  ...kortnamn.map((k, i) => [...Array(16).fill(''), k, i === 0 ? `=IF(COUNTA(A${PP}:A)=0;;TRANSPOSE(INDEX(B${PP}:G;COUNTA(A${PP}:A);0)))` : '']),
];
const egna = [
  ['Vår grupp · Elevernas svar'],
  ['Det eleverna har skrivit om gruppen, det senaste tillfället först.'],
  [],
  [`=IFERROR(QUERY(${per};"select B, Q where A is not null and Q is not null and Q <> '' order by A desc label B 'Tillfälle', Q '${FRITT}'";0);${lista(['Tillfälle', FRITT])})`],
];
const skriv = (titel, rader) => anrop(`${S}/values/${encodeURIComponent(`'${titel}'!A1`)}?valueInputOption=USER_ENTERED`, { method: 'PUT', body: JSON.stringify({ values: rader }) });
ok(await skriv('Underlag', underlag), 'Underlag skrivs');
ok(await skriv('Per påstående', perPastaende), 'Per påstående skrivs');
ok(await skriv('Sammanställning', sammanstallning), 'Sammanställning skrivs');
ok(await skriv('Elevernas svar', egna), 'Elevernas svar skrivs');

// ---------- Formen ----------
const farg = (hex) => ({ red: parseInt(hex.slice(1, 3), 16) / 255, green: parseInt(hex.slice(3, 5), 16) / 255, blue: parseInt(hex.slice(5, 7), 16) / 255 });
const MORK = '#1F3A5F', LJUS = '#E8EEF6', GRA = '#5F6B7A', TEXT = '#1F2933', LANK = '#2D5DA1', GRUPPEN = '#2D5DA1', JAG = '#E07A1F';
const ra = (sheetId, r0, r1, c0, c1) => ({ sheetId, startRowIndex: r0, endRowIndex: r1, startColumnIndex: c0, endColumnIndex: c1 });
const format = (range, fmt, falt) => ({ repeatCell: { range, cell: { userEnteredFormat: fmt }, fields: falt.map((x) => `userEnteredFormat.${x}`).join(',') } });
// Raden med länkar mellan flikarna, på rad 3 i varje flik som läraren läser: fliken man står i är fet, de andra länkar.
const FLIKLANKAR = [['Sammanställning', sa], ['Per påstående', pp], ['Elevernas svar', es], ['Alla svar', svarsflik.sheetId]];
const lankrad = (sheetId, c1) => {
  const delar = [];
  let text = '';
  FLIKLANKAR.forEach(([namn, gid], i) => {
    if (i) text += '   ·   ';
    delar.push({ startIndex: text.length, format: gid === sheetId ? { bold: true, foregroundColor: farg(TEXT) } : { link: { uri: `#gid=${gid}` }, foregroundColor: farg(LANK), underline: true } });
    text += namn;
    delar.push({ startIndex: text.length, format: { foregroundColor: farg(GRA) } });
  });
  return [
    { mergeCells: { range: ra(sheetId, 2, 3, 0, c1), mergeType: 'MERGE_ALL' } },
    { updateCells: { range: ra(sheetId, 2, 3, 0, 1), fields: 'userEnteredValue,textFormatRuns,userEnteredFormat', rows: [{ values: [{ userEnteredValue: { stringValue: text }, textFormatRuns: delar.filter((d) => d.startIndex < text.length), userEnteredFormat: { textFormat: { fontSize: 10 }, padding: { left: 10 }, verticalAlignment: 'MIDDLE' } }] }] } },
    { updateDimensionProperties: { range: { sheetId, dimension: 'ROWS', startIndex: 2, endIndex: 3 }, properties: { pixelSize: 30 }, fields: 'pixelSize' } },
  ];
};
const titel = (sheetId, c1) => [
  { mergeCells: { range: ra(sheetId, 0, 1, 0, c1), mergeType: 'MERGE_ALL' } },
  { mergeCells: { range: ra(sheetId, 1, 2, 0, c1), mergeType: 'MERGE_ALL' } },
  format(ra(sheetId, 0, 1, 0, c1), { backgroundColor: farg(MORK), textFormat: { bold: true, fontSize: 16, foregroundColor: farg('#FFFFFF') }, verticalAlignment: 'MIDDLE', padding: { left: 10, top: 6, bottom: 6 } }, ['backgroundColor', 'textFormat', 'verticalAlignment', 'padding']),
  format(ra(sheetId, 1, 2, 0, c1), { textFormat: { fontSize: 10, foregroundColor: farg(GRA) }, wrapStrategy: 'WRAP', verticalAlignment: 'TOP', padding: { left: 10, top: 4 } }, ['textFormat', 'wrapStrategy', 'verticalAlignment', 'padding']),
  { updateDimensionProperties: { range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 44 }, fields: 'pixelSize' } },
  { updateDimensionProperties: { range: { sheetId, dimension: 'ROWS', startIndex: 1, endIndex: 2 }, properties: { pixelSize: 40 }, fields: 'pixelSize' } },
  { updateSheetProperties: { properties: { sheetId, gridProperties: { hideGridlines: true } }, fields: 'gridProperties.hideGridlines' } },
  ...lankrad(sheetId, c1),
];
const avsnitt = (range) => format(range, { textFormat: { bold: true, fontSize: 11, foregroundColor: farg(MORK) } }, ['textFormat']);
const huvud = (range) => format(range, { backgroundColor: farg(LJUS), textFormat: { bold: true, fontSize: 10, foregroundColor: farg(TEXT) }, wrapStrategy: 'WRAP', verticalAlignment: 'MIDDLE', borders: { bottom: { style: 'SOLID', color: farg(MORK) } } }, ['backgroundColor', 'textFormat', 'wrapStrategy', 'verticalAlignment', 'borders']);
const tal = (range, pattern, typ = 'NUMBER') => format(range, { numberFormat: { type: typ, pattern } }, ['numberFormat']);
const skala = (range, lag, mitt, hog) => ({ addConditionalFormatRule: { index: 0, rule: { ranges: [range], gradientRule: {
  minpoint: { type: 'NUMBER', value: lag, color: farg('#F4CCC8') },
  midpoint: { type: 'NUMBER', value: mitt, color: farg('#FFF2BF') },
  maxpoint: { type: 'NUMBER', value: hog, color: farg('#CDEBD1') } } } } });
const ja = (range) => ({ addConditionalFormatRule: { index: 0, rule: { ranges: [range], booleanRule: { condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'Ja' }] }, format: { backgroundColor: farg('#CDEBD1'), textFormat: { bold: true } } } } } });
const inteAn = (range) => ({ addConditionalFormatRule: { index: 0, rule: { ranges: [range], booleanRule: { condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'Inte än' }] }, format: { backgroundColor: farg('#FFF2BF') } } } } });
const bredd = (sheetId, c0, c1, px) => ({ updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: c0, endIndex: c1 }, properties: { pixelSize: px }, fields: 'pixelSize' } });
const hojd = (sheetId, r0, r1, px) => ({ updateDimensionProperties: { range: { sheetId, dimension: 'ROWS', startIndex: r0, endIndex: r1 }, properties: { pixelSize: px }, fields: 'pixelSize' } });
const skydd = (sheetId) => ({ addProtectedRange: { protectedRange: { range: { sheetId }, description: 'Räknas av sig själv ur svaren', warningOnly: true } } });
const linje = { addChart: { chart: { position: { overlayPosition: { anchorCell: { sheetId: sa, rowIndex: 3, columnIndex: 8 }, offsetXPixels: 10, widthPixels: 640, heightPixels: 340 } }, spec: {
  title: 'Gruppens utveckling, snitt per tillfälle', titleTextFormat: { bold: true, fontSize: 13, foregroundColor: farg(MORK) }, fontName: 'Arial',
  basicChart: {
    chartType: 'LINE', legendPosition: 'BOTTOM_LEGEND', headerCount: 1, lineSmoothing: false,
    axis: [{ position: 'BOTTOM_AXIS', title: 'Tillfälle' }, { position: 'LEFT_AXIS', title: '1 Aldrig till 5 Alltid', viewWindowOptions: { viewWindowMin: 1, viewWindowMax: 5, viewWindowMode: 'EXPLICIT' } }],
    domains: [{ domain: { sourceRange: { sources: [ra(sa, SA - 2, SA + 60, 0, 1)] } } }],
    series: [[2, GRUPPEN], [3, JAG]].map(([col, hex]) => ({ series: { sourceRange: { sources: [ra(sa, SA - 2, SA + 60, col, col + 1)] } }, targetAxis: 'LEFT_AXIS', colorStyle: { rgbColor: farg(hex) }, lineStyle: { width: 3 }, pointStyle: { size: 7, shape: 'CIRCLE' } })),
  } } } } };
const staplar = { addChart: { chart: { position: { overlayPosition: { anchorCell: { sheetId: sa, rowIndex: 21, columnIndex: 8 }, offsetXPixels: 10, widthPixels: 640, heightPixels: 300 } }, spec: {
  title: 'Senaste tillfället, snitt per påstående', titleTextFormat: { bold: true, fontSize: 13, foregroundColor: farg(MORK) }, fontName: 'Arial',
  basicChart: {
    chartType: 'BAR', legendPosition: 'NO_LEGEND', headerCount: 1,
    axis: [{ position: 'BOTTOM_AXIS', title: '1 Aldrig till 5 Alltid', viewWindowOptions: { viewWindowMin: 1, viewWindowMax: 5, viewWindowMode: 'EXPLICIT' } }],
    domains: [{ domain: { sourceRange: { sources: [ra(pp, PP - 2, PP + 6, 16, 17)] } } }],
    series: [{ series: { sourceRange: { sources: [ra(pp, PP - 2, PP + 6, 17, 18)] } }, targetAxis: 'BOTTOM_AXIS', colorStyle: { rgbColor: farg(GRUPPEN) }, dataLabel: { type: 'DATA', placement: 'INSIDE_END', textFormat: { bold: true, foregroundColor: farg('#FFFFFF') } } }],
  } } } } };
ok(await anrop(`${S}:batchUpdate`, { method: 'POST', body: JSON.stringify({ requests: [
  ...titel(sa, 7), ...titel(pp, 18), ...titel(es, 2),
  hojd(sa, 1, 2, 62),
  { mergeCells: { range: ra(sa, 7, 8, 0, 7), mergeType: 'MERGE_ALL' } },
  format(ra(sa, 7, 8, 0, 7), { textFormat: { italic: true, fontSize: 10, foregroundColor: farg(GRA) } }, ['textFormat']),
  // Sammanställning
  avsnitt(ra(sa, 3, 4, 0, 7)), avsnitt(ra(sa, 8, 9, 0, 7)),
  format(ra(sa, 4, 5, 0, 7), { textFormat: { fontSize: 9, foregroundColor: farg(GRA) }, wrapStrategy: 'WRAP' }, ['textFormat', 'wrapStrategy']),
  format(ra(sa, 5, 6, 0, 7), { textFormat: { bold: true, fontSize: 16, foregroundColor: farg(TEXT) }, verticalAlignment: 'MIDDLE', wrapStrategy: 'WRAP' }, ['textFormat', 'verticalAlignment', 'wrapStrategy']),
  format(ra(sa, 6, 7, 0, 7), { textFormat: { fontSize: 9, foregroundColor: farg(GRA) } }, ['textFormat']),
  hojd(sa, 5, 6, 44),
  huvud(ra(sa, SA - 2, SA - 1, 0, 7)),
  tal(ra(sa, 5, 6, 2, 4), '0.0'), tal(ra(sa, 5, 6, 4, 5), '0 %', 'PERCENT'), tal(ra(sa, 6, 7, 2, 4), '+0.0;-0.0;0.0'), tal(ra(sa, 6, 7, 4, 5), '+0 %;-0 %;0 %', 'PERCENT'),
  tal(ra(sa, SA - 1, SA + 200, 2, 4), '0.0'), tal(ra(sa, SA - 1, SA + 200, 4, 5), '0 %', 'PERCENT'),
  skala(ra(sa, 5, 6, 2, 4), '1', '3', '5'), skala(ra(sa, SA - 1, SA + 200, 2, 4), '1', '3', '5'),
  skala(ra(sa, 5, 6, 4, 5), '0', '0,5', '1'), skala(ra(sa, SA - 1, SA + 200, 4, 5), '0', '0,5', '1'),
  ja(ra(sa, 5, 6, 5, 6)), ja(ra(sa, SA - 1, SA + 200, 5, 6)), inteAn(ra(sa, 5, 6, 5, 6)), inteAn(ra(sa, SA - 1, SA + 200, 5, 6)),
  bredd(sa, 0, 1, 160), bredd(sa, 1, 2, 60), bredd(sa, 2, 4, 100), bredd(sa, 4, 6, 115), bredd(sa, 6, 7, 190), bredd(sa, 7, 8, 24),
  // Per påstående
  avsnitt(ra(pp, PP - 3, PP - 2, 0, 18)),
  huvud(ra(pp, PP - 2, PP - 1, 0, 7)), huvud(ra(pp, PP - 2, PP - 1, 8, 15)), huvud(ra(pp, PP - 2, PP - 1, 16, 18)),
  tal(ra(pp, PP - 1, PP + 200, 1, 7), '0.0'), tal(ra(pp, PP - 1, PP + 200, 9, 15), '0 %', 'PERCENT'), tal(ra(pp, PP - 1, PP + 5, 17, 18), '0.0'),
  skala(ra(pp, PP - 1, PP + 200, 1, 7), '1', '3', '5'), skala(ra(pp, PP - 1, PP + 200, 9, 15), '0', '0,5', '1'), skala(ra(pp, PP - 1, PP + 5, 17, 18), '1', '3', '5'),
  bredd(pp, 0, 1, 160), bredd(pp, 1, 7, 110), bredd(pp, 7, 8, 24), bredd(pp, 8, 9, 160), bredd(pp, 9, 15, 110), bredd(pp, 15, 16, 24), bredd(pp, 16, 17, 170), bredd(pp, 17, 18, 70),
  hojd(pp, PP - 2, PP - 1, 40),
  // Elevernas svar
  huvud(ra(es, 3, 4, 0, 2)),
  format(ra(es, 4, 600, 0, 2), { wrapStrategy: 'WRAP', verticalAlignment: 'TOP' }, ['wrapStrategy', 'verticalAlignment']),
  bredd(es, 0, 1, 160), bredd(es, 1, 2, 640),
  // Diagrammen, ordningen och skyddet
  linje, staplar,
  ...[[sa, 0], [pp, 1], [es, 2]].map(([sheetId, index]) => ({ updateSheetProperties: { properties: { sheetId, index }, fields: 'index' } })),
  { updateSheetProperties: { properties: { sheetId: pp, gridProperties: { frozenRowCount: PP - 1 } }, fields: 'gridProperties.frozenRowCount' } },
  { updateSheetProperties: { properties: { sheetId: es, gridProperties: { frozenRowCount: 4 } }, fields: 'gridProperties.frozenRowCount' } },
  { updateSheetProperties: { properties: { sheetId: ul, hidden: true }, fields: 'hidden' } },
  skydd(sa), skydd(pp), skydd(es), skydd(ul),
] }) }), 'formen läggs');
console.log(`Klart: sammanställningen läser ${svarsflik.title}, påståendena i ${K.join(', ')} och det egna svaret i ${X}.`);
