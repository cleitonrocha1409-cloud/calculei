import { arred, formatarBRL } from "../dinheiro";
import { calcularINSS, calcularIRRF } from "./impostos";
import type { Linha } from "./rescisao";

export interface EntradaSalario {
  bruto: number;
  dependentes?: number;
  pensao?: number; // pensão alimentícia judicial (deduz do IR)
  valeTransporte?: boolean;
  custoVT?: number; // custo mensal do VT; vazio = desconta os 6% cheios
  outrosDescontos?: number; // plano de saúde, refeição etc.
}

export interface ResultadoSalario {
  bruto: number;
  descontos: Linha[];
  totalDescontos: number;
  liquido: number;
  aliquotaEfetiva: number; // INSS + IR sobre o bruto
}

export function calcularSalarioLiquido(e: EntradaSalario): ResultadoSalario {
  const bruto = arred(e.bruto);
  const dependentes = Math.max(0, Math.floor(e.dependentes ?? 0));
  const pensao = arred(Math.max(0, e.pensao ?? 0));
  const descontos: Linha[] = [];

  const inss = calcularINSS(bruto);
  descontos.push({
    id: "inss",
    rotulo: "INSS",
    valor: inss,
    memoria: "Tabela progressiva de 2026: 7,5% até R$ 1.621,00; 9% até R$ 2.902,84; 12% até R$ 4.354,27; 14% até o teto de R$ 8.475,55",
    base: "Portaria Interministerial MPS/MF nº 13/2026",
  });

  const ir = calcularIRRF(bruto, inss, dependentes, true, pensao);
  descontos.push({
    id: "irrf",
    rotulo: "Imposto de renda (IRRF)",
    valor: ir.imposto,
    memoria:
      `Base ${formatarBRL(ir.base)}` +
      (ir.usouSimplificado ? " (desconto simplificado de R$ 607,20, mais vantajoso)" : ` (bruto − INSS${dependentes ? ` − ${dependentes} dependente(s)` : ""}${pensao ? " − pensão" : ""})`) +
      `; imposto pela tabela ${formatarBRL(ir.impostoTabela)} − redução ${formatarBRL(ir.reducao)}` +
      (bruto <= 5000 ? ". Até R$ 5.000 o imposto é zerado." : ""),
    base: "Lei 15.270/2025",
  });

  if (pensao > 0)
    descontos.push({ id: "pensao", rotulo: "Pensão alimentícia", valor: pensao, memoria: "Valor informado; também reduz a base do imposto de renda" });

  if (e.valeTransporte) {
    const seisPorCento = arred(bruto * 0.06);
    const custo = e.custoVT && e.custoVT > 0 ? e.custoVT : Infinity;
    const vt = arred(Math.min(seisPorCento, custo));
    descontos.push({
      id: "vt",
      rotulo: "Vale-transporte",
      valor: vt,
      memoria: custo < seisPorCento ? `Custo do vale (${formatarBRL(custo)}), menor que 6% do salário` : `6% do salário bruto`,
      base: "Lei 7.418/1985, art. 4º",
    });
  }

  const outros = arred(Math.max(0, e.outrosDescontos ?? 0));
  if (outros > 0) descontos.push({ id: "outros", rotulo: "Outros descontos", valor: outros, memoria: "Valor informado por você" });

  const totalDescontos = arred(descontos.reduce((s, l) => s + l.valor, 0));
  return {
    bruto,
    descontos,
    totalDescontos,
    liquido: arred(bruto - totalDescontos),
    aliquotaEfetiva: bruto > 0 ? (inss + ir.imposto) / bruto : 0,
  };
}

/** Salário bruto necessário para receber um líquido desejado (busca binária). */
export function brutoParaLiquido(liquidoDesejado: number, opcoes: Omit<EntradaSalario, "bruto"> = {}): number {
  if (!(liquidoDesejado > 0)) return 0;
  let lo = liquidoDesejado;
  let hi = liquidoDesejado * 3 + 2000;
  for (let i = 0; i < 80; i++) {
    const meio = (lo + hi) / 2;
    if (calcularSalarioLiquido({ ...opcoes, bruto: meio }).liquido < liquidoDesejado) lo = meio;
    else hi = meio;
  }
  return Math.ceil(hi * 100) / 100;
}
