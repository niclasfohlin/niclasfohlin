# Läser bokmärkena i en pdf som Word har gjort (scripts/word-jobb.ps1 sparar Word-filens bokmärken som pdf:ens
# disposition) och skriver vilken sida vart och ett står på, som JSON: {"sidor": 15, "bokmarken": {"sida_0": 1, ...}}.
# scripts/bankpdf.mjs gör kartan över ramarnas och bladens sidor av det (K-342). Sidan läses ur pdf:en själv, eftersom
# Word lägger ut sidorna olika när det visar ett dokument och när det sparar det som pdf (ljudlek-fran-ljud-till-ord
# 2026-10-13: 12 sidor i Word och 13 i pdf:en).
#
#   python scripts/pdfkarta.py <fil.pdf>      (kräver pip install pikepdf)
import json
import sys

import pikepdf


def sidnummer(pdf, mal, sidor):
    # Målet är en lista vars första led är sidan, eller ett namn som pdf:ens namnträd slår upp.
    if isinstance(mal, (pikepdf.String, pikepdf.Name, str)):
        namn = str(mal)
        trad = pdf.Root.get('/Names', {}).get('/Dests')
        if trad is not None:
            mal = pikepdf.NameTree(trad).get(namn)
        elif '/Dests' in pdf.Root:
            mal = pdf.Root.Dests.get('/' + namn.lstrip('/'))
        if isinstance(mal, pikepdf.Dictionary):
            mal = mal.get('/D')
    if mal is None or len(mal) == 0:
        return None
    return sidor.get(mal[0].objgen)


def main():
    pdf = pikepdf.open(sys.argv[1])
    sidor = {sida.obj.objgen: i + 1 for i, sida in enumerate(pdf.pages)}
    bokmarken = {}

    def ga(poster):
        for post in poster:
            mal = post.destination
            if mal is None and post.action is not None:
                mal = post.action.get('/D')
            sida = sidnummer(pdf, mal, sidor) if mal is not None else None
            if sida is not None and post.title not in bokmarken:
                bokmarken[str(post.title)] = sida
            ga(post.children)

    with pdf.open_outline() as disposition:
        ga(disposition.root)
    json.dump({'sidor': len(pdf.pages), 'bokmarken': bokmarken}, sys.stdout)


main()
