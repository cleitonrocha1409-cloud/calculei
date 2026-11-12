// FGTS na saída do emprego: multa rescisória e quanto pode ser sacado (Lei 8.036/1990 e Lei 13.932/2019).
import { FGTS } from "../../data/parametros-2026";
import { arred } from "../dinheiro";

export type SaidaFGTS = "sem_justa_causa" | "rescisao_indireta" | "acordo" | "termino_contrato" | "pedido_demissao" | "justa_causa";
export type Modalidade = "rescisao" | "aniversario";

export const SAIDAS: Record<SaidaFGTS, string> = {
  sem_justa_causa: "Demissão sem justa causa",
  acordo: "Acordo entre as partes",
  termino_contrato: "Fim de contrato por prazo determinado",
  rescisao_indireta: "Rescisão indireta",
  pedido_demissao: "Pedido de demissão",
  justa_causa: "Demissão por justa causa",
};

export interface EntradaFGTS {
  saida: SaidaFGTS;
  modalidade: Modalidade;
  /** Saldo para fins rescisórios (inclui o que já foi sacado). Se ausente, é estimado. */
  saldo?: number;
  /** Para estimar o saldo. */
  salario?: number;
  meses?: number;
}

export interface ResultadoFGTS {
  saldo: number;
  saldoEstimado: boolean;
  percentualMulta: number;
  multa: number;
  saqueSaldo: number; // parte do saldo liberada agora
  retido: number; // parte do saldo que fica na conta
  totalAgora: number; // saque do saldo + multa
  base: string; // fundamento legal
  avisos: string[];
}

/** Estimativa: 8% ao mês sobre salário + 13º + 1/3 de férias (fator 40/36), sem rendimentos. */
export function estimarSaldo(salario: number, meses: number) {
  return arred(FGTS.aliquotaDeposito * salario * meses * (40 / 36));
}

export function calcularFGTS(e: EntradaFGTS): ResultadoFGTS {
  const saldoEstimado = !(e.saldo !== undefined && e.saldo > 0);
  const saldo = saldoEstimado ? estimarSaldo(e.salario ?? 0, e.meses ?? 0) : arred(e.saldo!);
  const aniversario = e.modalidade === "aniversario";
  const avisos: string[] = [];

  let pMulta = 0;
  let pSaque = 0;
  let base = "";
  switch (e.saida) {
    case "sem_justa_causa":
    case "rescisao_indireta":
      pMulta = FGTS.multaSemJustaCausa;
      pSaque = 1;
      base = "Multa: Lei 8.036/1990, art. 18, § 1º. Saque: art. 20, I.";
      break;
    case "acordo":
      pMulta = FGTS.multaAcordo;
      pSaque = FGTS.saqueAcordo;
      base = "CLT, art. 484-A: multa de 20% e saque de até 80% do saldo.";
      break;
    case "termino_contrato":
      pSaque = 1;
      base = "Lei 8.036/1990, art. 20, IX: saque no fim normal do contrato a termo, sem multa de 40%.";
      avisos.push("No contrato por prazo determinado encerrado antes do fim pela empresa, vale a indenização do art. 479 da CLT, que não é calculada aqui.");
      break;
    case "pedido_demissao":
    case "justa_causa":
      base = "Lei 8.036/1990, art. 20: estas saídas não liberam saque nem multa.";
      avisos.push("O saldo continua seu e rendendo. Ele pode ser sacado em outras situações, por exemplo depois de 3 anos seguidos sem carteira assinada, na compra da casa própria ou na aposentadoria.");
      break;
  }

  if (aniversario && pSaque > 0) {
    pSaque = 0;
    avisos.push("No saque-aniversário, a saída do emprego não libera o saldo: você recebe só a multa (quando houver). O saldo continua nas parcelas anuais do mês do seu aniversário.");
  }

  const multa = arred(saldo * pMulta);
  const saqueSaldo = arred(saldo * pSaque);
  const retido = arred(saldo - saqueSaldo);
  if (saldoEstimado) avisos.push("Saldo estimado sem os rendimentos da conta. Para o valor exato, use o \"saldo para fins rescisórios\" do app FGTS.");
  return { saldo, saldoEstimado, percentualMulta: pMulta, multa, saqueSaldo, retido, totalAgora: arred(saqueSaldo + multa), base, avisos };
}
