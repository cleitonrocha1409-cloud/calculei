import { arred } from "../dinheiro";

export const taxaMensalDeAnual = (anual: number) => Math.pow(1 + anual, 1 / 12) - 1;
export const taxaAnualDeMensal = (mensal: number) => Math.pow(1 + mensal, 12) - 1;

export interface Parcela {
  n: number;
  parcela: number;
  juros: number;
  amortizacao: number;
  saldo: number;
}

export interface Tabela {
  sistema: "SAC" | "Price";
  parcelas: Parcela[];
  primeira: number;
  ultima: number;
  totalPago: number;
  totalJuros: number;
}

/** Parcela fixa (Tabela Price). */
export function pmt(valor: number, i: number, n: number) {
  if (i === 0) return valor / n;
  return (valor * i) / (1 - Math.pow(1 + i, -n));
}

export function tabelaPrice(valor: number, i: number, n: number, extraFixo = 0): Tabela {
  const p = pmt(valor, i, n);
  let saldo = valor;
  const parcelas: Parcela[] = [];
  for (let k = 1; k <= n; k++) {
    const juros = saldo * i;
    const amort = k === n ? saldo : p - juros;
    saldo = Math.max(0, saldo - amort);
    parcelas.push({ n: k, parcela: arred(amort + juros + extraFixo), juros: arred(juros), amortizacao: arred(amort), saldo: arred(saldo) });
  }
  return resumir("Price", parcelas);
}

export function tabelaSAC(valor: number, i: number, n: number, extraFixo = 0): Tabela {
  const amort = valor / n;
  let saldo = valor;
  const parcelas: Parcela[] = [];
  for (let k = 1; k <= n; k++) {
    const juros = saldo * i;
    saldo = Math.max(0, saldo - amort);
    parcelas.push({ n: k, parcela: arred(amort + juros + extraFixo), juros: arred(juros), amortizacao: arred(amort), saldo: arred(saldo) });
  }
  return resumir("SAC", parcelas);
}

function resumir(sistema: "SAC" | "Price", parcelas: Parcela[]): Tabela {
  const totalPago = arred(parcelas.reduce((s, p) => s + p.parcela, 0));
  const totalJuros = arred(parcelas.reduce((s, p) => s + p.juros, 0));
  return { sistema, parcelas, primeira: parcelas[0].parcela, ultima: parcelas[parcelas.length - 1].parcela, totalPago, totalJuros };
}

/** Totais por ano do contrato. */
export function porAno(t: Tabela) {
  const anos: { ano: number; pago: number; juros: number; amortizacao: number; saldo: number }[] = [];
  t.parcelas.forEach((p) => {
    const a = Math.ceil(p.n / 12);
    if (!anos[a - 1]) anos[a - 1] = { ano: a, pago: 0, juros: 0, amortizacao: 0, saldo: 0 };
    const r = anos[a - 1];
    r.pago += p.parcela;
    r.juros += p.juros;
    r.amortizacao += p.amortizacao;
    r.saldo = p.saldo;
  });
  return anos.map((r) => ({ ...r, pago: arred(r.pago), juros: arred(r.juros), amortizacao: arred(r.amortizacao) }));
}

export interface EntradaFinanciamento {
  valorImovel: number;
  entrada: number;
  prazoMeses: number;
  jurosAnual: number; // fração ao ano (ex.: 0,115)
  custosMensais?: number; // seguros e taxa de administração
}

export class ErroFinanciamento extends Error {}

export function calcularFinanciamento(e: EntradaFinanciamento) {
  if (!(e.valorImovel > 0)) throw new ErroFinanciamento("Informe o valor do imóvel.");
  if (!(e.entrada >= 0 && e.entrada < e.valorImovel)) throw new ErroFinanciamento("A entrada precisa ser menor que o valor do imóvel.");
  if (!(e.prazoMeses >= 12 && e.prazoMeses <= 420)) throw new ErroFinanciamento("O prazo precisa ficar entre 12 e 420 meses (35 anos).");
  if (!(e.jurosAnual >= 0 && e.jurosAnual < 1)) throw new ErroFinanciamento("Informe a taxa de juros ao ano, por exemplo 11,5%.");
  const financiado = e.valorImovel - e.entrada;
  const i = taxaMensalDeAnual(e.jurosAnual);
  const extra = e.custosMensais ?? 0;
  const sac = tabelaSAC(financiado, i, e.prazoMeses, extra);
  const price = tabelaPrice(financiado, i, e.prazoMeses, extra);
  const alertas: string[] = [];
  if (e.entrada / e.valorImovel < 0.2) alertas.push("A maioria dos bancos financia até 80% do imóvel: a entrada costuma ser de pelo menos 20%.");
  return {
    financiado: arred(financiado),
    taxaMensal: i,
    sac,
    price,
    // Bancos costumam limitar a parcela a 30% da renda bruta.
    rendaMinimaSAC: arred(sac.primeira / 0.3),
    rendaMinimaPrice: arred(price.primeira / 0.3),
    economiaSAC: arred(price.totalPago - sac.totalPago),
    alertas,
  };
}
