import { SEGURO_DESEMPREGO_2026 as T } from "../../data/parametros-2026";
import { arred, formatarBRL } from "../dinheiro";

export interface EntradaSeguro {
  salarios: number[]; // até 3 últimos salários antes da dispensa (vazios são ignorados)
  mesesTrabalhados: number; // meses com carteira assinada nos últimos 36 meses
  solicitacao: 1 | 2 | 3; // 1ª, 2ª ou 3ª em diante
  mesesUltimos: number; // meses trabalhados no período de carência (18, 12 ou 6 meses antes da dispensa)
}

export interface ResultadoSeguro {
  media: number;
  parcela: number;
  memoria: string;
  temDireito: boolean;
  parcelas: number;
  total: number;
  motivo?: string;
}

export class ErroSeguro extends Error {}

/** Valor da parcela pela média salarial (Lei 7.998/1990, art. 5º, tabela de 2026). */
export function valorParcela(media: number): { parcela: number; memoria: string } {
  let bruto: number;
  let memoria: string;
  if (media <= T.limite1) {
    bruto = media * 0.8;
    memoria = `Média até ${formatarBRL(T.limite1)}: ${formatarBRL(media)} × 0,8`;
  } else if (media <= T.limite2) {
    bruto = (media - T.limite1) * 0.5 + T.fixoFaixa2;
    memoria = `(${formatarBRL(media)} − ${formatarBRL(T.limite1)}) × 0,5 + ${formatarBRL(T.fixoFaixa2)}`;
  } else {
    bruto = T.teto;
    memoria = `Média acima de ${formatarBRL(T.limite2)}: teto de ${formatarBRL(T.teto)}`;
  }
  const parcela = arred(Math.max(T.piso, Math.min(T.teto, bruto)));
  if (bruto < T.piso) memoria += `; a parcela não pode ser menor que o salário mínimo (${formatarBRL(T.piso)})`;
  return { parcela, memoria };
}

/** Número de parcelas (Lei 7.998/1990, art. 4º, com a redação da Lei 13.134/2015). */
export function numeroParcelas(solicitacao: 1 | 2 | 3, meses36: number, mesesCarencia: number): { parcelas: number; motivo?: string } {
  const carencia = solicitacao === 1 ? { minimo: 12, janela: 18 } : solicitacao === 2 ? { minimo: 9, janela: 12 } : { minimo: 6, janela: 6 };
  if (mesesCarencia < carencia.minimo)
    return { parcelas: 0, motivo: `Na ${solicitacao}ª solicitação, é preciso ter trabalhado pelo menos ${carencia.minimo} meses nos ${carencia.janela} meses antes da dispensa.` };
  if (meses36 >= 24) return { parcelas: 5 };
  if (meses36 >= 12) return { parcelas: 4 };
  if (solicitacao === 1) return { parcelas: 4 }; // na 1ª, a carência de 12 meses já garante 4
  return { parcelas: 3 };
}

export function calcularSeguro(e: EntradaSeguro): ResultadoSeguro {
  const validos = e.salarios.filter((s) => s > 0);
  if (!validos.length) throw new ErroSeguro("Informe pelo menos o último salário.");
  const media = arred(validos.reduce((s, v) => s + v, 0) / validos.length);
  const { parcela, memoria } = valorParcela(media);
  const { parcelas, motivo } = numeroParcelas(e.solicitacao, e.mesesTrabalhados, e.mesesUltimos);
  return { media, parcela, memoria, temDireito: parcelas > 0, parcelas, total: arred(parcela * parcelas), motivo };
}
