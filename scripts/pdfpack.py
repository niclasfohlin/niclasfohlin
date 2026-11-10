# Packar en pdf som Word har gjort av en Word-fil med ritade bilder (bankens pdf:er, scripts/bankpdf.mjs). Word gör varje
# svg-bild till kurvor med fem decimaler, och delar böjda linjer i många små kurvor, varav de flesta är raka. Niclas
# 2026-10-10 om filen med alla problem och lärarsidorna (6,6 MB): "Ner mot 3mb är bra". Skriptet rundar ritningens
# punkter till en hundradels punkt på papperet och skriver en kurva vars stödpunkter ligger högst 0,05 punkter från den
# raka linjen som en linje. Färger, linjebredder, skalor och text rörs inte. Mätt 2026-10-10: 6,6 MB blev 3,1 MB, och
# sidan ritad i 300 dpi skilde sig i 0,03 procent av bildpunkterna, bara i kanternas utjämning. Sedan K-759 räknas det i
# papperets punkter också i en form som ritas förstorad (RUTA och TOLERANS nedan): riggens pdf:er blev 16 procent mindre
# och sidorna desamma i 600 dpi, där rundningen i formens egna enheter hade gjort bokstäverna kantiga.
#
# Samma innehåll blir samma fil (K-624; Niclas 2026-10-29: "Pdf får ha samma fil"): Word och PowerPoint skriver tiden och
# ett nytt id i varje pdf, så att en pdf som görs om utan att innehållet har ändrats blev en ny fil som git sparade för
# alltid. bytelik() tar bort tiderna och id:na ur dokumentets uppgifter och ur XMP, och pdf:en sparas med ett id som
# räknas ur innehållet. Titeln, författaren och resten står kvar. Mätt 2026-10-29: två pdf:er som Word gjorde av samma
# Word-fil skilde sig bara i det.
#
# Bilderna som palett (K-700): Chrome lägger en png med palett som RGB i pdf:en, så strukturkortens bilder, som har 16
# eller 256 färger, tog mer plats i pdf:en än som png. Filen med alla strukturkort var 7,5 MB, varav bilderna 90 procent, och
# drog 1,4 GB trafik på ett dygn 2026-11-02 till 03. palett() lägger varje bild med högst 256 färger som en palettbild
# (Indexed) med samma bildpunkter, och lämnar bilden som den var om en enda punkt skulle ändras. Mätt 2026-11-03: filen
# med alla blev 5,1 MB, och sidan ritad med pdftoppm var densamma i varje bildpunkt.
#
# Tätare i palettläget (K-755): palett() skriver bildens index utan png:s radfilter, som gjorde palettbilderna större, och
# rundar ritningen som main() gör, så att kortens ram, symboler och strategikortens teckningar tar mindre plats. Mätt
# 2026-11-09 med strukturkortens bilder i 1600 punkter: filen med alla gick från 4 965 till 4 607 kB med samma bilder, och
# sidan ritad i 300 dpi skilde sig i 0,003 procent av bildpunkterna, bara i ramens utjämning. Strategikortens fil med alla
# gick från 2 184 till 1 686 kB av rundningen.
#
#   python scripts/pdfpack.py <in.pdf> <ut.pdf>                 packa och gör bytelik (bankpdf.mjs)
#   python scripts/pdfpack.py --bara-bytelik <in.pdf> <ut.pdf>  bara bytelik, för PowerPoints lathund (lathund-pdf.mjs)
#   python scripts/pdfpack.py --palett <in.pdf> <ut.pdf>        bilderna som palett, ritningen packad och bytelik
#                                                               (strukturer/kort.mjs och strategier/kort.mjs)
#   (kräver pip install pikepdf, som tar med Pillow)
import decimal
import io
import math
import sys
import zlib

import pikepdf
from PIL import Image

# Rundningen räknar i punkter på papperet (K-759): punkterna rundas till RUTA punkter och en kurva vars stödpunkter ligger
# högst TOLERANS punkter från den raka linjen skrivs som en linje. Ritningens egna enheter kan vara större än en punkt: i
# riggens pdf:er ritar Word en bild som en form som förstoras omkring fem gånger, med bokstäverna som kurvor, och med två
# decimaler och 0,05 enheter i formens egna enheter blev ett o kantigt (K-758). Därför följer packa_strom matriserna (cm,
# q och Q, och formens Matrix när den ritas med Do) och räknar decimalerna och toleransen ur skalan.
RUTA = 0.01
TOLERANS = 0.05
HOGST_DECIMALER = 6
RITNING = ('m', 'l', 'c', 'v', 'y', 're')
IDENTITET = (1.0, 0.0, 0.0, 1.0, 0.0, 0.0)


def gange(m, n):
    """Matrisen m följd av n, med pdf:ens sex tal (a b c d e f)."""
    a, b, c, d, e, f = m
    A, B, C, D, E, F = n
    return (a * A + b * C, a * B + b * D, c * A + d * C, c * B + d * D, e * A + f * C + E, e * B + f * D + F)


def skalan(m):
    """Hur många punkter en enhet blir som mest, i matrisens mest utdragna riktning."""
    a, b, c, d = m[:4]
    t = a * a + b * b + c * c + d * d
    det = a * d - b * c
    return math.sqrt(max(0.0, (t + math.sqrt(max(0.0, t * t - 4 * det * det))) / 2))


def precisionen(skala):
    """Decimalerna och toleransen i ritningens enheter, när en enhet blir skala punkter på papperet."""
    if skala <= 0:
        return HOGST_DECIMALER, 0.0
    return min(HOGST_DECIMALER, max(0, math.ceil(math.log10(skala / RUTA) - 1e-9))), TOLERANS / skala


def tal(v, decimaler):
    v = round(float(v), decimaler)
    return int(v) if v == int(v) else decimal.Decimal(f'{v:.{decimaler}f}'.rstrip('0'))


def avstand(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    l2 = dx * dx + dy * dy
    if l2 == 0:
        return math.hypot(px - ax, py - ay)
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / l2))
    return math.hypot(px - ax - t * dx, py - ay - t * dy)


def packa_strom(strom, bas=1.0, former=None, resurser=None, skriv=True):
    """Ritningens punkter rundade och raka kurvor skrivna som linjer, i papperets punkter. bas är hur många punkter en
    enhet blir där strömmen börjar: 1 för en sida och formens största skala för en form. Formerna som strömmen ritar läggs i
    former med den största skala de ritas i. Med skriv=False samlas bara formerna."""
    nya = []
    ctm, stack = IDENTITET, []
    decimaler, tolerans = precisionen(bas)
    cx = cy = 0.0
    start = (0.0, 0.0)
    for operander, op in pikepdf.parse_content_stream(strom):
        o = str(op)
        if o == 'q':
            stack.append(ctm)
        elif o == 'Q' and stack:
            ctm = stack.pop()
            decimaler, tolerans = precisionen(skalan(ctm) * bas)
        elif o == 'cm' and len(operander) == 6:
            try:
                ctm = gange(tuple(float(x) for x in operander), ctm)
                decimaler, tolerans = precisionen(skalan(ctm) * bas)
            except (TypeError, ValueError):
                pass
        elif o == 'Do' and former is not None and resurser is not None and operander:
            xo = resurser.get('/XObject')
            x = xo.get(operander[0]) if isinstance(xo, pikepdf.Dictionary) else None
            if isinstance(x, pikepdf.Stream) and x.get('/Subtype') == '/Form':
                matris = tuple(float(v) for v in x.get('/Matrix', IDENTITET))
                s = skalan(gange(matris, ctm)) * bas
                if x.objgen not in former or former[x.objgen][1] < s:
                    egna = x.get('/Resources')
                    former[x.objgen] = (x, s, egna if isinstance(egna, pikepdf.Dictionary) else resurser)
        if not skriv:
            continue
        f = [float(x) if isinstance(x, (decimal.Decimal, float, int)) and not isinstance(x, bool) else None for x in operander]
        if o == 'c' and len(f) == 6 and None not in f:
            x1, y1, x2, y2, x3, y3 = f
            rak = avstand(x1, y1, cx, cy, x3, y3) <= tolerans and avstand(x2, y2, cx, cy, x3, y3) <= tolerans
            cx, cy = x3, y3
            if rak:
                nya.append(([tal(x3, decimaler), tal(y3, decimaler)], pikepdf.Operator('l')))
                continue
        elif o in ('m', 'l') and len(f) == 2 and None not in f:
            cx, cy = f
            if o == 'm':
                start = (cx, cy)
        elif o in ('v', 'y') and len(f) == 4 and None not in f:
            cx, cy = f[2], f[3]
        elif o == 'h':
            cx, cy = start
        nya.append(([tal(x, decimaler) if o in RITNING and isinstance(x, (decimal.Decimal, float)) else x for x in operander], op))
    return pikepdf.unparse_content_stream(nya) if skriv else None


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


def palettbild(strom):
    """Bilden som palettbild, eller None när den har fler än 256 färger, en mask eller blir större."""
    if strom.get('/SMask') is not None or strom.get('/Mask') is not None or strom.get('/ImageMask'):
        return None
    bas = strom.get('/ColorSpace')
    if isinstance(bas, pikepdf.Array) and bas[0] == '/Indexed':
        return None
    bild = pikepdf.PdfImage(strom).as_pil_image()
    if bild.mode != 'RGB':
        return None
    farger = bild.getcolors(256)
    if farger is None:
        return None
    # Medianklyvningen med lika många lådor som färger ger varje färg sin egen låda och sin exakta färg. En palett som
    # skickas in (quantize(palette=…)) letar närmaste färg genom en grövre kub och tog fel på bilder med fler än 16 färger.
    p = bild.quantize(colors=len(farger), method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    bitar = 8 if len(farger) > 16 else 4 if len(farger) > 4 else 2
    buf = io.BytesIO()
    p.save(buf, 'PNG', optimize=True, bits=bitar)
    tillbaka = Image.open(io.BytesIO(buf.getvalue()))
    if tillbaka.convert('RGB').tobytes() != bild.tobytes():
        return None
    # Indexen packade rad för rad utan png:s radfilter (K-755): filtren räknar på indexen som tal och gjorde bilderna större.
    data = zlib.compress(tillbaka.tobytes('raw', {8: 'P', 4: 'P;4', 2: 'P;2'}[bitar]), 9)
    if len(data) >= len(strom.read_raw_bytes()):
        return None
    # Paletten ur den sparade png:n, eftersom det är den som indexen pekar i.
    hogst = tillbaka.getextrema()[1]
    return data, bitar, bas, bytes(tillbaka.getpalette()[:3 * (hogst + 1)]), hogst


def palett(kalla, ut):
    pdf = pikepdf.open(kalla)
    for strom in list(pdf.objects):
        if not isinstance(strom, pikepdf.Stream) or strom.get('/Subtype') != '/Image':
            continue
        ny = palettbild(strom)
        if ny is None:
            continue
        data, bitar, bas, lista, hogst = ny
        strom.write(data, filter=pikepdf.Name.FlateDecode)
        if '/DecodeParms' in strom:
            del strom['/DecodeParms']
        strom.ColorSpace = pikepdf.Array([pikepdf.Name.Indexed, bas, hogst, pikepdf.String(lista)])
        strom.BitsPerComponent = bitar
    runda(pdf)
    spara(pdf, ut)


def runda(pdf):
    """Ritningen packad med packa_strom: sidornas innehåll i sidans punkter, och varje form som en sida eller en annan form
    ritar i den största skala som den ritas i, så att en form som ritas förstorad får fler decimaler (K-759)."""
    former, sedda = {}, set()
    for sida in pdf.pages:
        resurser = sida.obj.get('/Resources')
        resurser = resurser if isinstance(resurser, pikepdf.Dictionary) else None
        inne = sida.obj.get('/Contents')
        for s in (inne if isinstance(inne, pikepdf.Array) else [inne] if inne is not None else []):
            if s.objgen in sedda:
                continue
            sedda.add(s.objgen)
            s.write(packa_strom(s, 1.0, former, resurser))
    # En form kan rita andra former. Skalorna samlas tills ingen växer mer, och sedan skrivs varje form en gång.
    for _ in range(10):
        fore = {k: v[1] for k, v in former.items()}
        for x, s, resurser in list(former.values()):
            packa_strom(x, s, former, resurser, skriv=False)
        if {k: v[1] for k, v in former.items()} == fore:
            break
    for x, s, _ in former.values():
        x.write(packa_strom(x, s))


def main(kalla, ut):
    pdf = pikepdf.open(kalla)
    runda(pdf)
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
    elif args[:1] == ['--palett'] and len(args) == 3:
        palett(args[1], args[2])
    elif len(args) == 2:
        main(args[0], args[1])
    else:
        sys.exit('Ange in- och utfil: python scripts/pdfpack.py [--bara-bytelik | --palett] <in.pdf> <ut.pdf>')
