// Kan metoden planeras (Planera insatsen, METODER.md)? Varje rad i uppföljningen har sin tid (fältet tid). Under steg 1 och 2
// gäller det de metoder som har fått fälten; i steg 3 får alla metoder dem, och då stannar bygget på en metod utan. Regeln
// står här, i en egen fil utan Node-beroenden, så att planen (src/lib/insatsplan.ts) och sakernas filer (src/lib/sakfiler.ts)
// läser samma regel. Den står inte i src/lib/metod.ts, vars ändringar gör om alla lathundars pdf (scripts/lathund-pdf.mjs).
// En metod vars plan väntar (plan.vantar, med skälet) har fälten men visar ingen plan än, tills planen har klarat
// Rimligheten (K-553: skrivmetodernas planer visade allmänna tabeller i stället för det veckornas sidor säger om passen).
export const planbar = (d: { uppfoljning?: { rader: { tid?: unknown }[] }; plan?: { vantar?: string } }) => !!d.uppfoljning?.rader.length && d.uppfoljning.rader.every((r) => r.tid !== undefined) && !d.plan?.vantar;
