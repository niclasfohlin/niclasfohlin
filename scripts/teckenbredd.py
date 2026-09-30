"""Teckenbredderna i Word-filernas typsnitt, till src/data/teckenbredd.json (K-139).

metoddocx.ts räknar ut hur brett ett ord blir, så att en tabellkolumn blir minst så bred som sitt längsta ord: Word och
Google Dokument bryter annars ordet mitt i, utan bindestreck ("Personbeskrivni/ng" i Berättelseramens lathund). Bredden
är typsnittets egen stegbredd, i tusendels em, och lika med det Word ritar (jämfört tecken för tecken med Words pdf:er
2026-09-30). Calibri läses ur Windows typsnitt, Andika (elevens typsnitt) ur public/fonts. Filen committas, eftersom
Netlify inte har Calibri och metoddocx.ts också körs i webbläsaren.

    python scripts/teckenbredd.py
"""
import json
from pathlib import Path

from fontTools.ttLib import TTFont

ROT = Path(__file__).resolve().parent.parent
TECKEN = (
    'abcdefghijklmnopqrstuvwxyzåäöéüABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖÉÜ0123456789'
    '.,:;!?-–—()[]/”“"\'’·•+=%&×÷…_*#§<>|°© \u00a0'
)
TYPSNITT = {
    'Calibri': 'C:/Windows/Fonts/calibri.ttf',
    'Calibri fet': 'C:/Windows/Fonts/calibrib.ttf',
    'Calibri kursiv': 'C:/Windows/Fonts/calibrii.ttf',
    'Calibri fet kursiv': 'C:/Windows/Fonts/calibriz.ttf',
    'Andika': str(ROT / 'public/fonts/ljudlek-elev/LjudlekElev-Regular.ttf'),
}

bredd = {}
for namn, fil in TYPSNITT.items():
    f = TTFont(fil)
    em = f['head'].unitsPerEm
    cmap = f.getBestCmap()
    # Ett tecken som typsnittet saknar blir null, och metoddocx.ts räknar det som 0,6 em.
    bredd[namn] = [round(1000 * f['hmtx'][cmap[ord(c)]][0] / em) if ord(c) in cmap else None for c in TECKEN]

ut = ROT / 'src/data/teckenbredd.json'
ut.write_text(json.dumps({'tecken': TECKEN, 'bredd': bredd}, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
print(f'{ut.relative_to(ROT)}: {len(TECKEN)} tecken i {len(bredd)} typsnitt')
