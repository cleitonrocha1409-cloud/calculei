import { REFORMA, REDUCOES, type Reducao } from "../../data/reforma";
import { arred } from "../dinheiro";

export interface EntradaCbs {
  valor: number;
  valorInformado: "sem" | "com"; // o valor informado já tem os tributos?
  reducao: Reducao;
  cbsReferencia?: number; // fração; padrão = proposta do TCU
}

export interface AnoCbs {
  ano: number;
  aliqCbs: number;
  aliqIbs: number;
  base: number;
  cbs: number;
  ibs: number;
  total: number;
  precoFinal: number;
  cargaNoPreco: number; // tributos ÷ preço final
  observacao: string;
}

export class ErroCbs extends Error {}

/** Alíquotas efetivas por ano, já com a redução do item. CBS e IBS são calculados "por fora". */
export function aliquotas(ano: 2026 | 2027 | 2028, reducao: Reducao, cbsReferencia = REFORMA.cbsReferencia2027) {
  const f = 1 - REDUCOES[reducao].fator;
  if (ano === 2026) return { cbs: REFORMA.teste2026.cbs * f, ibs: REFORMA.teste2026.ibs * f };
  return { cbs: Math.max(0, cbsReferencia - REFORMA.reducaoCbsTransicao) * f, ibs: REFORMA.ibsTransicao * f };
}

export function simularCbsIbs(e: EntradaCbs): AnoCbs[] {
  if (!(e.valor > 0)) throw new ErroCbs("Informe o valor do produto ou serviço.");
  const ref = e.cbsReferencia ?? REFORMA.cbsReferencia2027;
  if (!(ref >= 0 && ref < 0.5)) throw new ErroCbs("Informe uma alíquota de referência da CBS entre 0% e 50%.");
  return ([2026, 2027, 2028] as const).map((ano) => {
    const a = aliquotas(ano, e.reducao, ref);
    const soma = a.cbs + a.ibs;
    const base = e.valorInformado === "sem" ? e.valor : e.valor / (1 + soma);
    const cbs = arred(base * a.cbs);
    const ibs = arred(base * a.ibs);
    const total = arred(cbs + ibs);
    const precoFinal = arred(base + total);
    return {
      ano,
      aliqCbs: a.cbs,
      aliqIbs: a.ibs,
      base: arred(base),
      cbs,
      ibs,
      total,
      precoFinal,
      cargaNoPreco: precoFinal > 0 ? total / precoFinal : 0,
      observacao: ano === 2026 ? "Ano de teste: valores destacados na nota e compensados com PIS e Cofins" : "CBS cobrada de fato; PIS e Cofins extintos",
    };
  });
}
