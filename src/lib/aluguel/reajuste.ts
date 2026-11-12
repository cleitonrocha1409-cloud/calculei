import { arred } from "../dinheiro";
import type { Serie } from "./indices";

const NOMES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export const nomeMes = (m: string) => {
  const [a, mm] = m.split("-").map(Number);
  return `${NOMES[mm - 1]}/${a}`;
};
const mesAnterior = (m: string) => {
  const [a, mm] = m.split("-").map(Number);
  return mm === 1 ? `${a - 1}-12` : `${a}-${String(mm - 1).padStart(2, "0")}`;
};

/**
 * Acumulado de 12 meses para um reajuste no mês informado: os 12 meses que terminam no mês anterior.
 * Se esse mês ainda não foi divulgado, usa os 12 últimos meses disponíveis e avisa.
 */
export function acumulado12(serie: Serie, mesReajuste: string) {
  const fimDesejado = mesAnterior(mesReajuste);
  let fim = serie.findIndex((p) => p.mes === fimDesejado);
  let aproximado = false;
  if (fim < 0) {
    const anteriores = serie.filter((p) => p.mes <= fimDesejado);
    if (!anteriores.length) return null;
    fim = serie.indexOf(anteriores[anteriores.length - 1]);
    aproximado = true;
  }
  if (fim < 11) return null;
  const janela = serie.slice(fim - 11, fim + 1);
  const fator = janela.reduce((f, p) => f * (1 + p.valor / 100), 1);
  return { percentual: fator - 1, de: janela[0].mes, ate: janela[11].mes, aproximado, meses: janela };
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
