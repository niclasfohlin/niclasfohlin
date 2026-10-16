// Kortens data hämtas ur sidans egen fil (src/lib/kortdata.ts), vars adress står i sidans data-kortdata. Går den inte
// att hämta, säger sidan det i rutan där korten annars står.
export async function hamtaKortdata<T>(sida: HTMLElement): Promise<T> {
  try {
    const svar = await fetch(sida.dataset.kortdata!);
    if (!svar.ok) throw new Error(`svaret ${svar.status}`);
    return (await svar.json()) as T;
  } catch (fel) {
    const tom = sida.querySelector<HTMLElement>('.sk-tom');
    if (tom) tom.textContent = 'Korten gick inte att hämta. Ladda om sidan.';
    throw fel;
  }
}
