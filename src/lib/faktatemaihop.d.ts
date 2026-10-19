// Typerna för src/lib/faktatemaihop.js (se filen).

interface Temadata { metod: string; tema: string; niva: string; ramar: { rubrik: string }[]; pabordet?: { nr: number }[]; tabeller?: unknown[] }
interface Tema<T extends Temadata = Temadata> { id: string; data: T }

/** Databasens namn i dess filer (faktatexter-bas). */
export declare const DATABAS: string;

/** Temana i bankens ordning: nivå för nivå, i metodens nivåers ordning, och på en nivå efter det första textnumret. */
export declare function ordnaTeman<T extends Tema>(teman: T[], nivaer?: string[]): T[];

/** Metodens data med temana efter metodens egna ramar, bilder På bordet och tabeller. */
export declare function medTemana<D extends { titel: string; nivaer?: { namn: string }[]; ramar?: { ramar: unknown[] }; pabordet?: unknown[]; tabeller?: unknown[] }>(d: D, teman: Tema[]): D;

/** Skriptens väg in: temana i en mapp, som { id, data } per yaml-fil. */
export declare function lasTeman(mapp: string, parseYaml: (s: string) => unknown): Promise<Tema[]>;
