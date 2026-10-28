// Tidsraden i Planera insatsen, Börjar och Slutar i två listor bredvid varandra, en rot för formuläret (Planera.astro) och
// för ett enskilt pass tid i Flytta eller ställ in ett pass (planera.ts, Niclas 2026-10-28: "Ska man inte kunna byta tid
// också på passet om önskas?"). Listornas klockslag fylls i av planera.ts (tidval och slutval).

/** Raden med två listor: id:n, klockslagen som alternativ och om slutet är avstängt. */
export const tidrad = (fran: string, till: string, franVal = '', tillVal = '', tillAv = false) =>
  `<label class="pl-tidval"><span>Börjar</span><select class="pl-falt pl-tid" id="${fran}">${franVal}</select></label><label class="pl-tidval"><span>Slutar</span><select class="pl-falt pl-tid" id="${till}"${tillAv ? ' disabled' : ''}>${tillVal}</select></label>`;
