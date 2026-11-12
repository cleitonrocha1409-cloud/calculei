import { arred } from "../dinheiro";
import type { Serie } from "./indices";

const NOMES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const nomeMes = (m: string) => {
  const [a, mm] = m.split("-").map(Number);
  return `${NOMES[mm - 1]}/${a}`;
};
export const nomeMesCurto = (m: string) => {
  const [a, mm] = m.split("-").map(Number);
  return `${CURTOS[mm - 1]}/${a}`;
};
export const somarMeses = (m: string, n: number) => {
  const [a, mm] = m.split("-").map(Number);
  const total = a * 12 + (mm - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
};
const mesAnterior = (m: string) => somarMeses(m, -1);

export interface Acumulado {
  percentual: number; // fração
  de: string;
  ate: string;
  meses: { mes: string; valor: number; acumulado: number }[];
  faltando: string[]; // meses pedidos que ainda não foram divulgados
}

/** Variação acumulada (composta) entre dois meses, inclusive. */
export function acumuladoPeriodo(serie: Serie, de: string, ate: string): Acumulado | null {
  if (!de || !ate || de > ate) return null;
  const mapa = new Map(serie.map((p) => [p.mes, p.valor]));
  const meses: Acumulado["meses"] = [];
  const faltando: string[] = [];
  let fator = 1;
  for (let m = de; m <= ate; m = somarMeses(m, 1)) {
    const v = mapa.get(m);
    if (v === undefined) {
      faltando.push(m);
      continue;
    }
    fator *= 1 + v / 100;
    meses.push({ mes: m, valor: v, acumulado: fator - 1 });
    if (meses.length + faltando.length > 600) break;
  }
  if (!meses.length) return null;
  return { percentual: fator - 1, de, ate, meses, faltando };
}

/** Os últimos 12 meses divulgados da série. */
export function ultimos12(serie: Serie): { de: string; ate: string } | null {
  if (serie.length < 12) return null;
  const ate = serie[serie.length - 1].mes;
  return { de: somarMeses(ate, -11), ate };
}

/**
 * Acumulado de 12 meses para um reajuste no mês informado: os 12 meses que terminam no mês anterior.
 * Se esse mês ainda não foi divulgado, usa os 12 últimos meses disponíveis.
 */
export function acumulado12(serie: Serie, mesReajuste: string) {
  let ate = mesAnterior(mesReajuste);
  let aproximado = false;
  const ultimo = serie[serie.length - 1]?.mes;
  if (!ultimo) return null;
  if (ate > ultimo) {
    ate = ultimo;
    aproximado = true;
  }
  const a = acumuladoPeriodo(serie, somarMeses(ate, -11), ate);
  if (!a || a.faltando.length) return null;
  return { ...a, aproximado };
}

export interface EntradaReajuste {
  aluguel: number;
  percentual: number; // fração (0,045 = 4,5%)
  naoReduzir?: boolean;
}

export function calcularReajuste(e: EntradaReajuste) {
  if (!(e.aluguel > 0)) throw new Error("Informe o valor atual do aluguel.");
  const aplicado = e.naoReduzir && e.percentual < 0 ? 0 : e.percentual;
  const novo = arred(e.aluguel * (1 + aplicado));
  return { novo, aumento: arred(novo - e.aluguel), aplicado, travado: aplicado !== e.percentual };
}
