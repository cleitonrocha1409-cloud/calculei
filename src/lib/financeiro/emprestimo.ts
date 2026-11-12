import { arred } from "../dinheiro";
import { pmt, taxaAnualDeMensal } from "./financiamento";

export class ErroEmprestimo extends Error {}

export interface ResultadoEmprestimo {
  valor: number;
  prazo: number;
  taxaMensal: number;
  taxaAnual: number;
  parcela: number;
  totalPago: number;
  totalJuros: number;
}

function validar(valor: number, prazo: number) {
  if (!(valor > 0)) throw new ErroEmprestimo("Informe o valor do empréstimo.");
  if (!(prazo >= 1 && prazo <= 420)) throw new ErroEmprestimo("O prazo precisa ficar entre 1 e 420 meses.");
}

/** Da taxa para a parcela (Tabela Price). */
export function parcelaDoEmprestimo(valor: number, prazo: number, taxaMensal: number): ResultadoEmprestimo {
  validar(valor, prazo);
  if (!(taxaMensal >= 0 && taxaMensal < 1)) throw new ErroEmprestimo("Informe a taxa de juros ao mês.");
  const parcela = arred(pmt(valor, taxaMensal, prazo));
  const totalPago = arred(parcela * prazo);
  return { valor, prazo, taxaMensal, taxaAnual: taxaAnualDeMensal(taxaMensal), parcela, totalPago, totalJuros: arred(totalPago - valor) };
}

/** Da parcela para a taxa real cobrada (busca binária). */
export function taxaDoEmprestimo(valor: number, prazo: number, parcela: number): ResultadoEmprestimo {
  validar(valor, prazo);
  if (!(parcela > 0)) throw new ErroEmprestimo("Informe o valor da parcela.");
  if (parcela * prazo < valor - 0.01) throw new ErroEmprestimo("Com essa parcela, o total pago fica abaixo do valor emprestado. Confira os números.");
  let lo = 0;
  let hi = 1;
  for (let k = 0; k < 200; k++) {
    const meio = (lo + hi) / 2;
    if (pmt(valor, meio, prazo) < parcela) lo = meio;
    else hi = meio;
  }
  const taxaMensal = (lo + hi) / 2;
  const totalPago = arred(parcela * prazo);
  return { valor, prazo, taxaMensal, taxaAnual: taxaAnualDeMensal(taxaMensal), parcela: arred(parcela), totalPago, totalJuros: arred(totalPago - valor) };
}
