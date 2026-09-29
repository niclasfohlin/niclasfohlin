# Elevens typsnitt på sidan: Ljudlek Elev, en delmängd av Andika 7.000 från SIL (SIL Open Font License 1.1, licensen i
# public/fonts/ljudlek-elev/OFL.txt). En ändrad fil som används för sig får inte heta Andika eller SIL (OFL-FAQ 2.6),
# därför namnet, som metodriggen valde.
#
# Webbfilen har bara de tecken svenskt elevmaterial använder och de typografiska funktioner texten behöver (kerning och
# sammansatta tecken), 14 KB i stället för riggens 32 KB, eftersom den laddas när sidan öppnas (Niclas 2026-09-29: den
# som landar på Ljudlek i grupp från Facebook ska inte dra mer än sidan behöver). Ett tecken utanför delmängden ritas i
# nästa typsnitt i listan. Word-filerna bär riggens bredare delmängd, LjudlekElev-Regular.ttf, som bäddas in.
#
# Kör: python scripts/elevtypsnitt.py <Andika-Regular.ttf>   (kräver pip install fonttools brotli)
# Källan är SIL:s Andika-Regular.ttf, version 7.000, som ligger i metodriggen: C:/metodrigg/design/typsnitt/andika/.
import os
import sys
from fontTools import subset
from fontTools.ttLib import TTFont

ROT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UT = os.path.join(ROT, 'public', 'fonts', 'ljudlek-elev', 'LjudlekElev-Regular.woff2')
# Grundlatin, hårt mellanslag, å ä ö é ü i båda storlekarna, tankstreck, citattecken, tre punkter och ordfog.
TECKEN = list(range(0x20, 0x7F)) + [0xA0, 0xC4, 0xC5, 0xD6, 0xE4, 0xE5, 0xF6, 0xC9, 0xE9, 0xDC, 0xFC, 0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2026, 0x2060]
FUNKTIONER = ['kern', 'liga', 'ccmp', 'locl', 'mark', 'mkmk']

kalla = sys.argv[1] if len(sys.argv) > 1 else 'C:/metodrigg/design/typsnitt/andika/Andika-Regular.ttf'
opt = subset.Options()
opt.layout_features = FUNKTIONER
opt.name_IDs = ['*']
opt.name_languages = ['*']
opt.notdef_outline = True
opt.flavor = 'woff2'
font = TTFont(kalla)
s = subset.Subsetter(opt)
s.populate(unicodes=TECKEN)
s.subset(font)
for rec in font['name'].names:
    if rec.nameID in (1, 16): rec.string = 'Ljudlek Elev'
    elif rec.nameID == 4: rec.string = 'Ljudlek Elev Regular'
    elif rec.nameID == 6: rec.string = 'LjudlekElev-Regular'
    elif rec.nameID == 3: rec.string = 'LjudlekElev-Regular; delmängd av Andika 7.000 (SIL), OFL 1.1'
    elif rec.nameID == 5: rec.string = str(rec.toUnicode()) + '; delmängd med svenska tecken för niclasfohlin.se'
font.flavor = 'woff2'
font.save(UT)
print(UT, os.path.getsize(UT), 'byte,', len(font.getGlyphOrder()), 'glyfer')
