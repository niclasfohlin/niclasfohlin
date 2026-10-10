import type { APIRoute, GetStaticPaths } from 'astro';
import { packaWord } from '../../lib/wordpaket';
import { publicerade } from '../../lib/innehall';
import { bankDokument, metodDokument, DOCX_TYP } from '../../lib/metoddocx';
import { byggSerier, serieKoppling } from '../../lib/serie';
import { bankAv, bankfiler } from '../../lib/bank';
import { lasResurser, medReservbilder } from '../../lib/metodresurser';
import { site } from '../../data/site';

// /stodundervisning/<id>.docx: allt om metoden i en Word-fil, byggd vid bygget ur samma data som
// sidan: metodbeskrivningen, planeringsmallarna och lathunden. "Hela" ska betyda hela. En metod i en serie får sin
// plats i serien med sig, så att den generella metoden har lektionsbanken och lektionen raden Hör till.
// En metod med en bank (src/lib/bank.ts) har bankens enheter i filen med allt, som i utskriften, och får dessutom bankens
// filer här: /stodundervisning/<id>-<problem>-<nivå>.docx, med bara enheterna eller med följesidorna (-med-lararens-sida),
// en per nivå och en för alla nivåer (bankDokument).
export const getStaticPaths: GetStaticPaths = async () => {
  const metoder = await publicerade('stodundervisning');
  const serier = byggSerier(metoder);
  return metoder.flatMap((m) => {
    const bank = bankAv(m.data);
    return [
      { params: { id: m.id }, props: { m: { ...m, serie: serieKoppling(m.id, m.data, serier) } } },
      ...(bank ? bankfiler(m.id, bank).map((f) => ({ params: { id: f.namn }, props: { m: { ...m, serie: undefined }, bankfil: { niva: f.niva?.namn, medFoljesidor: f.medFoljesidor, rubrik: f.rubrik } } })) : []),
    ];
  });
};

export const GET: APIRoute = async ({ props }) => {
  const resurser = lasResurser([props.m]);
  const bankfil = props.bankfil as { niva?: string; medFoljesidor: boolean; rubrik: string } | undefined;
  const bank = bankfil ? bankAv(props.m.data) : null;
  const buffert = await packaWord(await medReservbilder((png) => (bankfil && bank
    ? bankDokument(props.m, { niva: bank.nivaer.find((n) => n.namn === bankfil.niva), medFoljesidor: bankfil.medFoljesidor, rubrik: bankfil.rubrik }, { bas: site.url, resurser: { ...resurser, png } })
    : metodDokument([props.m], { bas: site.url, medMallar: true, resurser: { ...resurser, png } }))), 'nodebuffer');
  return new Response(new Uint8Array(buffert), { headers: { 'Content-Type': DOCX_TYP } });
};
