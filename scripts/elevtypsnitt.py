# Elevens typsnitt i allt elevmaterial (K-130, Niclas 2026-09-29): Ljudlek Elev, en delmängd av Andika 7.000 från SIL
# (SIL Open Font License 1.1, licensen i public/fonts/ljudlek-elev/OFL.txt). En ändrad fil som används för sig får inte
# heta Andika eller SIL (OFL-FAQ 2.6), därför namnet, som metodriggen valde.
#
# Skriptet gör båda filerna ur samma källa och med samma tecken, så att sidan och Word-filerna aldrig skiljer sig åt:
# LjudlekElev-Regular.woff2 till sidan (omkring 14 KB, laddas bara där något står i typsnittet) och
# LjudlekElev-Regular.ttf, som bäddas in i Word-filerna. Tecknen är de som elevmaterialet använder, och de typografiska
# funktionerna de som texten behöver (kerning och sammansatta tecken). Ett tecken utanför delmängden ritas i nästa
# typsnitt i listan; scripts/paritet.mjs stannar valideringen om Word-filernas elevmaterial har ett sådant tecken, och då
# läggs det till i TECKEN här och skriptet körs igen.
#
# Kör: python scripts/elevtypsnitt.py [<Andika-Regular.ttf>]   (kräver pip install fonttools brotli)
# Källan är SIL:s Andika-Regular.ttf, version 7.000, som ligger i metodriggen: C:/metodrigg/design/typsnitt/andika/.
import os
import sys
from fontTools import subset
from fontTools.ttLib import TTFont

ROT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAPP = os.path.join(ROT, 'public', 'fonts', 'ljudlek-elev')
# Grundlatin, hårt mellanslag, å ä ö é ü i båda storlekarna, tankstreck, citattecken, tre punkter och ordfog, och tecknen
# som elevmaterialet i matematiken och på bildkorten behöver.
TECKEN = list(range(0x20, 0x7F)) + [0xA0, 0xC4, 0xC5, 0xD6, 0xE4, 0xE5, 0xF6, 0xC9, 0xE9, 0xDC, 0xFC, 0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2026, 0x2060,
          # Mittpunkt, gånger, minus (matematikens kort), pricken under varje ljud på bildkorten och pilen i flödesmallarna
          # och på strategikortet (sss-ooo-lll → sol).
          0xB7, 0xD7, 0x2212, 0x2022, 0x2192]
# Utan ligaturer (liga): Andika slår annars ihop f och i, och f och l, till ett tecken där i:et saknar prick, och den som
# lär sig läsa känner igen i:et på pricken (fin, flicka, fisk; granskningen 2026-09-29). Word slår inte på dem.
FUNKTIONER = ['kern', 'ccmp', 'locl', 'mark', 'mkmk']

kalla = sys.argv[1] if len(sys.argv) > 1 else 'C:/metodrigg/design/typsnitt/andika/Andika-Regular.ttf'
opt = subset.Options()
opt.layout_features = FUNKTIONER
opt.name_IDs = ['*']
opt.name_languages = ['*']
opt.notdef_outline = True
for flavor, andelse in (('woff2', 'woff2'), (None, 'ttf')):
    opt.flavor = flavor
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
    font.flavor = flavor
    ut = os.path.join(MAPP, f'LjudlekElev-Regular.{andelse}')
    font.save(ut)
    print(ut, os.path.getsize(ut), 'byte,', len(font.getGlyphOrder()), 'glyfer,', len(font.getBestCmap()), 'tecken')
