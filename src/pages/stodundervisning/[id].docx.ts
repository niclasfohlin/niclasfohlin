import type { APIRoute, GetStaticPaths } from 'astro';
import { packaWord } from '../../lib/wordpaket';
import { publicerade } from '../../lib/innehall';
import { bankDokument, bladDokument, hemsidaDokument, lektionskortDokument, metodDokument, passDokument, ramarDokument, DOCX_TYP } from '../../lib/metoddocx';
import { byggSerier, serieKoppling } from '../../lib/serie';
import { bankAv, bankfiler } from '../../lib/bank';
import { metodensNivamaterial, nivafiler } from '../../lib/nivamaterial';
import { bladfiler, metodensBladmaterial } from '../../lib/bladmaterial';
import { ovrigtfil } from '../../lib/ovrigt';
import { harMaterial } from '../../lib/material';
import { harLathund } from '../../lib/metod';
import { lasResurser, medReservbilder } from '../../lib/metodresurser';
import { allaLektionskortStam, metodensLektionskort, type Lektionskort } from '../../lib/lektionskort';
import { lasLektionskort } from '../../lib/lektionskortdata';
import { site } from '../../data/site';

// /stodundervisning/<id>.docx: allt om metoden i en Word-fil, byggd vid bygget ur samma data som
// sidan: metodbeskrivningen, planeringsmallarna och lathunden. "Hela" ska betyda hela. En metod i en serie får sin
// plats i serien med sig, så att den generella metoden har lektionsbanken och lektionen raden Hör till.
// En metod med en bank (src/lib/bank.ts) har bankens enheter i filen med allt, som i utskriften, och får dessutom bankens
// filer här: /stodundervisning/<id>-<problem>-<nivå>.docx, med bara enheterna eller med följesidorna (-med-lararens-sida),
// en per nivå och en för alla nivåer (bankDokument). En metod med nivåer i materialet (src/lib/nivamaterial.ts) får
// nivåernas filer på samma sätt: /stodundervisning/<id>-<led>-<nivå>.docx (ramarDokument).
// En metod med ramar med blad (src/lib/bladmaterial.ts, modellerna i Faktatextsamtal i grupp) får bladen för sig,
// /stodundervisning/<id>-<ledet i flertal>-<namn eller alla>-blad.docx (bladDokument), och ramarna med sina ifyllda blad,
// -sidor.docx (ramarDokument med blad: 'ifyllda'). En metod som namnger sitt övriga material (ramar.ovrigt,
// src/lib/ovrigt.ts) får det i en fil, /stodundervisning/<id>-<namnet>.docx.
// En metod med material får också /stodundervisning/<id>-metoden.docx: bara beskrivningen, utan materialet, mallarna och
// lathunden, av samma kod som filen med allt (metodDokument med medMallar: false). Dess pdf är det knappen Skriv ut:
// Metoden öppnar (Niclas 2026-10-13: ett system för utskriftsknapparna, som alltid blir 1:1; METODER.md under Utskriften).
// En metod med lathund får /stodundervisning/<id>-lathund-text.docx: passets text för sig (passDokument), vars pdf
// knappen vid texten på lathundssidan öppnar.
// Ett lektionskort (src/lib/lektionskort.ts) får /stodundervisning/<id>-lektionskort.docx (-2 och -3 när de är fler), och
// en serie vars lektioner har kort får alla korten i en fil, /stodundervisning/<serie>-alla-lektionskort.docx
// (lektionskortDokument). Deras pdf:er är det knapparna öppnar.
// Kontraktet och schemat (hem.kontrakt, hem.schema, TIL i grupp) får /stodundervisning/<id>-kontrakt.docx och
// <id>-schema.docx, ett A4 var (hemsidaDokument), vars pdf:er utskriftsknapparna i Materialet och i Hem och skola öppnar.
export const getStaticPaths: GetStaticPaths = async () => {
  const metoder = await publicerade('stodundervisning');
  const serier = byggSerier(metoder);
  // Lektionernas kort i lektionsbankens ordning, per serie.
  const korten = (serie: string): Lektionskort[] => (serier.get(serie)?.lektioner ?? []).flatMap((l) => { const lektion = metoder.find((x) => x.id === l.id); return lektion ? metodensLektionskort(lektion.data, lektion.id) : []; });
  return metoder.flatMap((m) => {
    const bank = bankAv(m.data);
    const nm = metodensNivamaterial(m.data);
    const bm = metodensBladmaterial(m.data, m.id);
    const ovrigt = ovrigtfil(m.data, m.id);
    return [
      { params: { id: m.id }, props: { m: { ...m, serie: serieKoppling(m.id, m.data, serier) } } },
      ...(harMaterial(m.data) ? [{ params: { id: `${m.id}-metoden` }, props: { m: { ...m, serie: serieKoppling(m.id, m.data, serier) }, metoden: true } }] : []),
      ...(harLathund(m.data) ? [{ params: { id: `${m.id}-lathund-text` }, props: { m: { ...m, serie: undefined }, passet: true } }] : []),
      ...metodensLektionskort(m.data, m.id).map((k) => ({ params: { id: k.stam }, props: { m: { ...m, serie: undefined }, kortlista: [k] } })),
      ...(m.data.hem?.kontrakt ? [{ params: { id: `${m.id}-kontrakt` }, props: { m: { ...m, serie: undefined }, hemsida: 'kontrakt' } }] : []),
      ...(m.data.hem?.schema ? [{ params: { id: `${m.id}-schema` }, props: { m: { ...m, serie: undefined }, hemsida: 'schema' } }] : []),
      ...(m.data.lektionsbank && korten(m.id).length ? [{ params: { id: allaLektionskortStam(m.id) }, props: { m: { ...m, serie: undefined }, kortlista: korten(m.id), korttitel: `${m.data.titel} · Alla lektionskort` } }] : []),
      ...(nm ? nivafiler(m.id, nm).map((f) => ({ params: { id: f.namn }, props: { m: { ...m, serie: undefined }, nivafil: { ramar: f.ramar, rubrik: f.rubrik, huvud: f.niva ? f.niva.niva.namn : 'Alla nivåer' } } })) : []),
      ...(bm ? bladfiler(m.id, bm).map((f) => ({ params: { id: f.namn }, props: { m: { ...m, serie: undefined }, ...(f.slag === 'blad' ? { bladfil: { bilder: f.bilder, rubrik: f.rubrik, huvud: f.huvud } } : { nivafil: { ramar: f.ramar, rubrik: f.rubrik, huvud: f.huvud, blad: 'ifyllda' as const } }) } })) : []),
      ...(ovrigt ? [{ params: { id: ovrigt.namn }, props: { m: { ...m, serie: undefined }, nivafil: { ramar: ovrigt.ramar, rubrik: ovrigt.rubrik, huvud: ovrigt.huvud } } }] : []),
      ...(bank ? bankfiler(m.id, bank).map((f) => ({ params: { id: f.namn }, props: { m: { ...m, serie: undefined }, bankfil: { niva: f.niva?.namn, medFoljesidor: f.medFoljesidor, rubrik: f.rubrik } } })) : []),
    ];
  });
};

export const GET: APIRoute = async ({ props }) => {
  const resurser = lasResurser([props.m]);
  const bankfil = props.bankfil as { niva?: string; medFoljesidor: boolean | 'bara'; rubrik: string } | undefined;
  const bank = bankfil ? bankAv(props.m.data) : null;
  const nivafil = props.nivafil as { ramar: number[]; rubrik: string; huvud: string; blad?: 'alla' | 'ifyllda' | 'inga' } | undefined;
  const bladfil = props.bladfil as { bilder: number[]; rubrik: string; huvud: string } | undefined;
  const kortlista = props.kortlista as Lektionskort[] | undefined;
  const buffert = await packaWord(await medReservbilder((png) => (props.passet
    ? passDokument(props.m, { bas: site.url })
    : props.hemsida
    ? hemsidaDokument(props.m, props.hemsida as 'kontrakt' | 'schema', { bas: site.url })
    : kortlista
    ? lektionskortDokument(kortlista, { titel: props.korttitel as string | undefined, resurser: { bilder: new Map(), lektionskort: lasLektionskort(kortlista), png } })
    : bladfil
    ? bladDokument(props.m, bladfil, { bas: site.url, resurser: { ...resurser, png } })
    : nivafil
    ? ramarDokument(props.m, nivafil, { bas: site.url, resurser: { ...resurser, png } })
    : bankfil && bank
    ? bankDokument(props.m, { niva: bank.nivaer.find((n) => n.namn === bankfil.niva), medFoljesidor: bankfil.medFoljesidor, rubrik: bankfil.rubrik }, { bas: site.url, resurser: { ...resurser, png } })
    : metodDokument([props.m], { bas: site.url, medMallar: !props.metoden, baraMetoden: !!props.metoden, resurser: { ...resurser, png } }))), 'nodebuffer');
  return new Response(new Uint8Array(buffert), { headers: { 'Content-Type': DOCX_TYP } });
};
