import { arred } from "../dinheiro";

export interface EntradaJuros {
  inicial: number;
  aporteMensal: number;
  taxaMensal: number; // fração ao mês
  meses: number;
}

export class ErroJuros extends Error {}

export function calcularJurosCompostos(e: EntradaJuros) {
  if (!(e.inicial >= 0) || !(e.aporteMensal >= 0) || e.inicial + e.aporteMensal <= 0) throw new ErroJuros("Informe o valor inicial ou o aporte mensal.");
  if (!(e.meses >= 1 && e.meses <= 1200)) throw new ErroJuros("O prazo precisa ficar entre 1 e 1.200 meses.");
  if (!(e.taxaMensal >= 0 && e.taxaMensal < 1)) throw new ErroJuros("Informe a taxa de juros.");
  let saldo = e.inicial;
  let investido = e.inicial;
  const anos: { ano: number; investido: number; juros: number; saldo: number }[] = [];
  for (let m = 1; m <= e.meses; m++) {
    saldo = saldo * (1 + e.taxaMensal) + e.aporteMensal; // aporte no fim de cada mês
    investido += e.aporteMensal;
    if (m % 12 === 0 || m === e.meses) anos.push({ ano: Math.ceil(m / 12), investido: arred(investido), juros: arred(saldo - investido), saldo: arred(saldo) });
  }
  return { montante: arred(saldo), investido: arred(investido), juros: arred(saldo - investido), anos };
}
