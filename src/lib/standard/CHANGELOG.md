# Ändringar i standarden

## 0.2.1, 2026-10-18

- `Post.utskrift`: slaget `med` är problemet med lösningsförslaget när banken har lösningsförslag (metodriggens blad, sajtens K-423), och med lärarens sida annars. Formen är densamma; bara beskrivningen ändras.

## 0.2.0, 2026-10-18

- `INNEHALLSTAGGAR` och `innehallstaggar`: innehållstaggarna, databasens sista nivå efter nivån och slaget (Niclas 2026-10-18). Matematikens fem ur Lgr22.
- `postensRad`: postens egen första mening, kortad vid ett ord.
- `Post` och `PostUtskrift` (JSDoc och `index.d.ts`): postens form för Ta fram-sidorna, med lösningsförslaget och utskrifternas källfiler.
- `postFel` och `databasFel`: kontrollerna som listor med fel.
- `hamtplan`: posternas egna pdf:er eller källfilen en gång, det som är minst att hämta (K-424).

## 0.1.0, 2026-10-18

- `slugAv`: en funktion för alla adresser som görs ur namn, i stället för fyra (`bank.ts`, `bladmaterial.ts`, `nivamaterial.ts`, `ovrigt.ts`), som gjorde olika med é, è och ü (K-416). Tecknen över bokstäverna tas bort med Unicodes uppdelning, så samma svar som förut för svenska bokstäver och é, è och ü, och andra accenter blir bokstaven i stället för ett bindestreck.
- `UPPTAGNA_LED`: de reserverade leden på ett ställe, med `problem`, `texter` och `faktatexter` för Ta fram-sidorna.
