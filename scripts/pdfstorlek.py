# Pdf:ernas storlek före första uppladdningen (K-758; Niclas 2026-11-10: "se till att liknande saker görs automatiskt i
# framtiden innan uppladdning vid första gången"). I K-755 var filen med alla strukturkort en fjärdedel större än den behövde
# vara, och det syntes först i trafiken, en vecka efter att den gick ut. Det här steget i npm run validera mäter varje pdf
# under public/ som inte finns på origin/main, alltså innan den laddas upp första gången, mot det K-755 fann:
#
#   bilderna     en bild som ritas i mer än GRANSER['ppi'] ppi där den är som störst: 180 ppi gick inte att skilja från 240
#                i en skrivares 600 dpi (K-755), så det som är över gränsen är bara vikt. Mäts med pdfimages -list (poppler).
#   radfiltret   palettbilder packade med png:s radfilter, som gör dem större: pdfpack.py --palett skriver dem utan.
#   ritningen    ritning med fler decimaler än papperet visar: rundningen i pdfpack.py (runda), som räknar i papperets
#                punkter sedan K-759, sparar mer än GRANSER['rundning'] procent av filen. Innan dess räknade den i ritningens
#                egna enheter och gjorde ett o kantigt i riggens pdf:er, där Word ritar bokstäverna som kurvor i en form som
#                förstoras omkring fem gånger (K-758).
#
# En ny pdf som har något av det stoppar valideringen, med vad som väger och var roten lagas (ROTEN). En ändrad pdf får en
# rad med !, så att en äldre fil inte stoppar arbete som inte gäller den. Regeln står i DRIFT.md under Pdf:erna, i pdf-standarden.
#
#   python scripts/pdfstorlek.py           nya och ändrade pdf:er mot origin/main (i npm run validera)
#   python scripts/pdfstorlek.py --alla    alla pdf:er under public/, som en genomgång
#   python scripts/pdfstorlek.py <fil> …   de angivna, som nya
#   (kräver pikepdf, som scripts/pdfpack.py, och poppler för pdfimages)
import importlib.util
import io
import os
import subprocess
import sys
import zlib

import pikepdf

sys.stdout.reconfigure(encoding='utf-8')
ROT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
spec = importlib.util.spec_from_file_location('pdfpack', os.path.join(ROT, 'scripts', 'pdfpack.py'))
pdfpack = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pdfpack)

GRANSER = {'ppi': 220, 'bild_kb': 20, 'radfilter_kb': 20, 'rundning': 5}

# Var en pdf görs, så att beskedet säger var roten lagas. Den första raden vars början stämmer gäller.
ROTEN = [
    ('public/strukturer/kort/', 'scripts/strukturer/kort.mjs (bildens bredd i BILDENS_BREDD)'),
    ('public/strategier/kort/', 'scripts/strategier/kort.mjs och riggens bilder i public/strategier/bilder/'),
    ('public/stodundervisning/', 'scripts/bankpdf.mjs och scripts/pdfdelar.mjs, eller lathund-pdf.mjs för en lathund'),
    ('public/metoder/', 'metodriggens leverans (scripts/metoderfiler.mjs tar in den): skriv till riggen, eller lathund-pdf.mjs för en lathund'),
]


def git(*args):
    return subprocess.run(['git', '-C', ROT, *args], capture_output=True, text=True, encoding='utf-8').stdout.splitlines()


def kb(n):
    return round(n / 1024)


def bildernas_ppi(fil):
    """Varje bild en gång, med det minsta ppi den ritas i, alltså där den är som störst, och dess storlek i filen."""
    r = subprocess.run(['pdfimages', '-list', fil], capture_output=True, text=True, encoding='utf-8', errors='replace')
    bilder = {}
    for rad in r.stdout.splitlines()[2:]:
        f = rad.split()
        if len(f) < 16 or f[2] != 'image':
            continue
        try:
            ppi = int(f[12])
        except ValueError:
            continue
        b = bilder.setdefault((f[10], f[11]), {'ppi': ppi, 'bredd': int(f[3]), 'objekt': f[10]})
        b['ppi'] = min(b['ppi'], ppi)
    return bilder


def matt(fil, rundning=True):
    """Det som går att spara utan att något syns: bilderna över gränsen, radfiltren och, med rundning, rundningen, i byte.
    Rundningen prövas i en ny pdf och i genomgången av alla: den sparar filen två gånger och tar flera sekunder för en stor
    pdf, och när packningen ändras görs hundratals pdf:er om på en gång."""
    fynd = []
    storlek = os.path.getsize(fil)
    ppi = bildernas_ppi(fil)
    with pikepdf.open(fil) as pdf:
        radfilter = 0
        for o in pdf.objects:
            if not isinstance(o, pikepdf.Stream) or o.get('/Subtype') != '/Image':
                continue
            b = ppi.get((str(o.objgen[0]), str(o.objgen[1])))
            if b:
                b['byte'] = len(o.read_raw_bytes())
            cs, dp = o.get('/ColorSpace'), o.get('/DecodeParms')
            if isinstance(cs, pikepdf.Array) and cs[0] == '/Indexed' and isinstance(dp, pikepdf.Dictionary) and int(dp.get('/Predictor', 1)) >= 10:
                radfilter += max(0, len(o.read_raw_bytes()) - len(zlib.compress(o.read_bytes(), 9)))
        hoga = [b for b in ppi.values() if b['ppi'] > GRANSER['ppi'] and b.get('byte', 0) > GRANSER['bild_kb'] * 1024]
        if hoga:
            hogsta = max(b['ppi'] for b in hoga)
            # Bildens vikt följer ungefär bredden i en teckning med ytor (K-755: 1600 till 1200 punkter gav 25 procent), så
            # det som går att spara räknas efter bredden.
            spar = sum(b['byte'] * (1 - GRANSER['ppi'] / b['ppi']) for b in hoga)
            fynd.append(('bilderna', spar, f"{len(hoga)} bilder ritas i mer än {GRANSER['ppi']} ppi där de är som störst, som mest {hogsta} ppi"))
        if radfilter > GRANSER['radfilter_kb'] * 1024:
            fynd.append(('radfiltret', radfilter, 'palettbilderna är packade med png:s radfilter; scripts/pdfpack.py --palett packar dem utan'))
        if not rundning:
            return storlek, fynd
        fore = io.BytesIO()
        pdf.save(fore, compress_streams=True, object_stream_mode=pikepdf.ObjectStreamMode.generate)
        pdfpack.runda(pdf)
        efter = io.BytesIO()
        pdf.save(efter, compress_streams=True, object_stream_mode=pikepdf.ObjectStreamMode.generate)
        rundning = len(fore.getvalue()) - len(efter.getvalue())
        if rundning > storlek * GRANSER['rundning'] / 100:
            fynd.append(('ritningen', rundning, 'ritningen har fler decimaler än papperet visar; låt pdf:en gå genom scripts/pdfpack.py'))
    return storlek, fynd


def roten(rel):
    return next((r for borjan, r in ROTEN if rel.startswith(borjan)), 'skriptet som gör filen')


def main(args):
    if args[:1] == ['--alla']:
        filer = [os.path.relpath(os.path.join(d, n), ROT).replace('\\', '/') for d, _, ns in os.walk(os.path.join(ROT, 'public')) for n in ns if n.endswith('.pdf')]
        nya = set()
    elif args:
        filer = [os.path.relpath(os.path.abspath(a), ROT).replace('\\', '/') for a in args]
        nya = set(filer)
    else:
        ute = set(git('ls-tree', '-r', '--name-only', 'origin/main', '--', 'public'))
        andrade = git('diff', '--name-only', '--diff-filter=AM', 'origin/main', '--', 'public') + git('ls-files', '--others', '--exclude-standard', '--', 'public')
        filer = sorted({f for f in andrade if f.endswith('.pdf') and os.path.exists(os.path.join(ROT, f))})
        nya = {f for f in filer if f not in ute}
    stopp, varningar = [], []
    for rel in sorted(filer):
        storlek, fynd = matt(os.path.join(ROT, rel), rundning=rel in nya or args[:1] == ['--alla'])
        if not fynd:
            continue
        spar = sum(f[1] for f in fynd)
        rad = f"{rel}: {kb(storlek)} kB, och omkring {kb(spar)} kB ({round(100 * spar / storlek)} procent) går att spara utan att det syns: " + '; '.join(f[2] for f in fynd) + f'. Roten: {roten(rel)}'
        (stopp if rel in nya else varningar).append(rad)
    for rad in varningar:
        print(f'  ! {rad}')
    if stopp:
        print('Pdf:ernas storlek: en ny pdf är större än den behöver vara. Laga roten innan filen laddas upp första gången (DRIFT.md under Pdf:erna):')
        for rad in stopp:
            print(f'  {rad}')
        sys.exit(1)
    print(f"Pdf:ernas storlek: {len(filer)} {'pdf' if len(filer) == 1 else 'pdf:er'} prövade ({len(nya)} nya), {len(varningar)} med något att spara.")


if __name__ == '__main__':
    main(sys.argv[1:])
