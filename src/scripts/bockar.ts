// Kryssrutorna i mål och checklistor minns sitt läge i webbläsaren, per sida, så att den som
// förbereder på kvällen ser samma kryss på morgonen. "Rensa kryssen" nollställer listan.
// Lagringen är per webbläsare och når aldrig servern; utan lagring fungerar kryssen som vanligt.

const nyckel = `bockar:${location.pathname}`;

function las(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(nyckel) ?? '{}'); } catch { return {}; }
}
function spara(lage: Record<string, boolean>) {
  try { localStorage.setItem(nyckel, JSON.stringify(lage)); } catch { /* utan lagring */ }
}

const listor = document.querySelectorAll<HTMLElement>('[data-bockar]');
const lage = las();
listor.forEach((lista, li) => {
  const rutor = lista.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
  rutor.forEach((ruta, ri) => {
    const id = `${li}:${ri}`;
    if (lage[id]) ruta.checked = true;
    ruta.addEventListener('change', () => {
      const nu = las();
      if (ruta.checked) nu[id] = true; else delete nu[id];
      spara(nu);
    });
  });
  const rensa = lista.parentElement?.querySelector<HTMLButtonElement>('[data-rensa-bockar]');
  rensa?.addEventListener('click', () => {
    const nu = las();
    rutor.forEach((ruta, ri) => { ruta.checked = false; delete nu[`${li}:${ri}`]; });
    spara(nu);
  });
});
