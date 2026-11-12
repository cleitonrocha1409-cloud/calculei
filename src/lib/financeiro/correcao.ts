// Correção monetária de um valor por índice de preços, com juros simples opcionais.
import { arred } from "../dinheiro";
import type { Serie } from "../aluguel/indices";
import { acumuladoPeriodo, type Acumulado } from "../aluguel/reajuste";

export interface EntradaCorrecao {
  valor: number;
  serie: Serie;
  de: string; // AAAA-MM, inclusive
  ate: string; // AAAA-MM, inclusive
  jurosMes?: number; // fração ao mês, juros simples (ex.: 0,01)
}

export interface ResultadoCorrecao {
  acumulado: Acumulado;
  corrigido: number;
  correcao: number;
  meses: number;
  juros: number;
  total: number;
}

export function corrigirValor(e: EntradaCorrecao): ResultadoCorrecao | null {
  const acumulado = acumuladoPeriodo(e.serie, e.de, e.ate);
  if (!acumulado) return null;
  const corrigido = arred(e.valor * (1 + acumulado.percentual));
  const meses = acumulado.meses.length;
  const juros = arred(corrigido * (e.jurosMes ?? 0) * meses);
  return { acumulado, corrigido, correcao: arred(corrigido - e.valor), meses, juros, total: arred(corrigido + juros) };
}
