# Typsnittet i Word-filernas reservbilder (Niclas 2026-09-30: i Google Dokument blev filmens fyra bilder blå rutor).
# Word ritar bilderna som SVG, men Google Dokument, LibreOffice och äldre Word visar reservbilden, en PNG som
# src/lib/metodresurser.ts ritar ur samma SVG vid varje bygge. Stillbildernas text står i "IBM Plex Sans, Segoe UI,
# Arial, sans-serif", och byggservern har inga av dem, så ritaren läser inga typsnitt från datorn utan får det här som
# sans-serif. Då blir reservbilden likadan på Windows och på Netlify.
#
# Typsnittet är en delmängd av Andika 7.000 från SIL (SIL Open Font License 1.1, licensen i src/data/typsnitt/OFL.txt),
# samma källa som elevens typsnitt (scripts/elevtypsnitt.py), med latin, svenska tecken, skiljetecken, pilar och
# matematikens tecken. En ändrad fil får inte heta Andika (OFL-FAQ 2.6), därför namnet Reservbild. Filen läses bara vid
# bygget och laddas aldrig av läsaren. scripts/paritet.mjs stannar valideringen om en bild har ett tecken som saknas.
#
# Kör: python scripts/reservtypsnitt.py [<Andika-Regular.ttf>]   (kräver pip install fonttools)
import os
import sys
from fontTools import subset
from fontTools.ttLib import TTFont

ROT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAPP = os.path.join(ROT, 'src', 'data', 'typsnitt')
TECKEN = (list(range(0x20, 0x7F)) + list(range(0xA0, 0x100)) + list(range(0x2010, 0x2028)) + [0x2030, 0x2039, 0x203A, 0x2060]
          + list(range(0x2190, 0x2196)) + [0x2212, 0x2248, 0x2260, 0x2264, 0x2265, 0x2713, 0x2717, 0x25CF, 0x25CB])

kalla = sys.argv[1] if len(sys.argv) > 1 else 'C:/metodrigg/design/typsnitt/andika/Andika-Regular.ttf'
opt = subset.Options()
opt.layout_features = ['kern', 'ccmp', 'locl', 'mark', 'mkmk']
opt.name_IDs = ['*']
opt.name_languages = ['*']
opt.notdef_outline = True
font = TTFont(kalla)
s = subset.Subsetter(opt)
s.populate(unicodes=TECKEN)
s.subset(font)
for rec in font['name'].names:
    if rec.nameID in (1, 16): rec.string = 'Reservbild'
    elif rec.nameID == 4: rec.string = 'Reservbild Regular'
    elif rec.nameID == 6: rec.string = 'Reservbild-Regular'
    elif rec.nameID == 3: rec.string = 'Reservbild-Regular; delmängd av Andika 7.000 (SIL), OFL 1.1'
    elif rec.nameID == 5: rec.string = str(rec.toUnicode()) + '; delmängd för Word-filernas reservbilder på niclasfohlin.se'
os.makedirs(MAPP, exist_ok=True)
ut = os.path.join(MAPP, 'Reservbild-Regular.ttf')
font.save(ut)
print(ut, os.path.getsize(ut), 'byte,', len(font.getBestCmap()), 'tecken')
