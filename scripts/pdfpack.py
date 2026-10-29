# Packar en pdf som Word har gjort av en Word-fil med ritade bilder (bankens pdf:er, scripts/bankpdf.mjs). Word gör varje
# svg-bild till kurvor med fem decimaler, och delar böjda linjer i många små kurvor, varav de flesta är raka. Niclas
# 2026-10-10 om filen med alla problem och lärarsidorna (6,6 MB): "Ner mot 3mb är bra". Skriptet rundar ritningens
# punkter till två decimaler (en hundradels punkt) och skriver en kurva vars stödpunkter ligger högst 0,05 punkter från
# den raka linjen som en linje. Färger, linjebredder, skalor och text rörs inte. Mätt 2026-10-10: 6,6 MB blev 3,1 MB,
# och sidan ritad i 300 dpi skilde sig i 0,03 procent av bildpunkterna, bara i kanternas utjämning.
#
# Samma innehåll blir samma fil (K-624; Niclas 2026-10-29: "Pdf får ha samma fil"): Word och PowerPoint skriver tiden och
# ett nytt id i varje pdf, så att en pdf som görs om utan att innehållet har ändrats blev en ny fil som git sparade för
# alltid. bytelik() tar bort tiderna och id:na ur dokumentets uppgifter och ur XMP, och pdf:en sparas med ett id som
# räknas ur innehållet. Titeln, författaren och resten står kvar. Mätt 2026-10-29: två pdf:er som Word gjorde av samma
# Word-fil skilde sig bara i det.
#
#   python scripts/pdfpack.py <in.pdf> <ut.pdf>                 packa och gör bytelik (bankpdf.mjs)
#   python scripts/pdfpack.py --bara-bytelik <in.pdf> <ut.pdf>  bara bytelik, för PowerPoints lathund (lathund-pdf.mjs)
#   (kräver pip install pikepdf)
import decimal
import math
import sys

import pikepdf

DECIMALER = 2
TOLERANS = 0.05
RITNING = ('m', 'l', 'c', 'v', 'y', 're')


def tal(v):
    v = round(float(v), DECIMALER)
    return int(v) if v == int(v) else decimal.Decimal(str(v))


def avstand(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    l2 = dx * dx + dy * dy
    if l2 == 0:
        return math.hypot(px - ax, py - ay)
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / l2))
    return math.hypot(px - ax - t * dx, py - ay - t * dy)


def packa_strom(strom):
    nya = []
    cx = cy = 0.0
    start = (0.0, 0.0)
    for operander, op in pikepdf.parse_content_stream(strom):
        o = str(op)
        f = [float(x) if isinstance(x, (decimal.Decimal, float, int)) and not isinstance(x, bool) else None for x in operander]
        if o == 'c' and len(f) == 6 and None not in f:
            x1, y1, x2, y2, x3, y3 = f
            rak = avstand(x1, y1, cx, cy, x3, y3) <= TOLERANS and avstand(x2, y2, cx, cy, x3, y3) <= TOLERANS
            cx, cy = x3, y3
            if rak:
                nya.append(([tal(x3), tal(y3)], pikepdf.Operator('l')))
                continue
        elif o in ('m', 'l') and len(f) == 2 and None not in f:
            cx, cy = f
            if o == 'm':
                start = (cx, cy)
        elif o in ('v', 'y') and len(f) == 4 and None not in f:
            cx, cy = f[2], f[3]
        elif o == 'h':
            cx, cy = start
        nya.append(([tal(x) if o in RITNING and isinstance(x, (decimal.Decimal, float)) else x for x in operander], op))
    return pikepdf.unparse_content_stream(nya)


# Det som ändras varje gång Word eller PowerPoint gör pdf:en, också när innehållet är detsamma.
TIDER = ('/CreationDate', '/ModDate')
XMP_TIDER = ('xmp:CreateDate', 'xmp:ModifyDate', 'xmp:MetadataDate', 'xmpMM:DocumentID', 'xmpMM:InstanceID')


def bytelik(pdf):
    for k in TIDER:
        if k in pdf.docinfo:
            del pdf.docinfo[k]
    # Words id följer annars med i den första halvan av det nya id:t, som qpdf behåller; utan det räknas båda ur innehållet.
    if '/ID' in pdf.trailer:
        del pdf.trailer['/ID']
    if '/Metadata' in pdf.Root:
        with pdf.open_metadata(set_pikepdf_as_editor=False, update_docinfo=False) as meta:
            for k in XMP_TIDER:
                if k in meta:
                    del meta[k]


def spara(pdf, ut):
    bytelik(pdf)
    pdf.save(ut, compress_streams=True, object_stream_mode=pikepdf.ObjectStreamMode.generate, deterministic_id=True)


def bara_bytelik(kalla, ut):
    pdf = pikepdf.open(kalla, allow_overwriting_input=True)
    spara(pdf, ut)


def main(kalla, ut):
    pdf = pikepdf.open(kalla)
    sedda = set()

    def behandla(strom):
        if strom.objgen in sedda:
            return
        sedda.add(strom.objgen)
        strom.write(packa_strom(strom))
        res = strom.get('/Resources')
        if res is not None and '/XObject' in res:
            for x in res.XObject.values():
                if x.get('/Subtype') == '/Form':
                    behandla(x)

    for sida in pdf.pages:
        inne = sida.obj.get('/Contents')
        for s in (inne if isinstance(inne, pikepdf.Array) else [inne]):
            behandla(s)
        xo = sida.obj.Resources.get('/XObject')
        if xo:
            for x in xo.values():
                if x.get('/Subtype') == '/Form':
                    behandla(x)
    # Dispositionen bär Word-filens bokmärken (sida_0 …), som scripts/bankpdf.mjs har läst kartan ur före packningen
    # (scripts/pdfkarta.py). Läraren ska inte se dem i sin pdf-läsare.
    if '/Outlines' in pdf.Root:
        del pdf.Root['/Outlines']
    if '/PageMode' in pdf.Root:
        del pdf.Root['/PageMode']
    pdf.remove_unreferenced_resources()
    spara(pdf, ut)


if __name__ == '__main__':
    args = sys.argv[1:]
    if args[:1] == ['--bara-bytelik'] and len(args) == 3:
        bara_bytelik(args[1], args[2])
    elif len(args) == 2:
        main(args[0], args[1])
    else:
        sys.exit('Ange in- och utfil: python scripts/pdfpack.py [--bara-bytelik] <in.pdf> <ut.pdf>')
