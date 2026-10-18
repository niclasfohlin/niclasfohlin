# Ändringar i standarden

## 0.1.0, 2026-10-18

- `slugAv`: en funktion för alla adresser som görs ur namn, i stället för fyra (`bank.ts`, `bladmaterial.ts`, `nivamaterial.ts`, `ovrigt.ts`), som gjorde olika med é, è och ü (K-416). Tecknen över bokstäverna tas bort med Unicodes uppdelning, så samma svar som förut för svenska bokstäver och é, è och ü, och andra accenter blir bokstaven i stället för ett bindestreck.
- `UPPTAGNA_LED`: de reserverade leden på ett ställe, med `problem`, `texter` och `faktatexter` för Ta fram-sidorna.
