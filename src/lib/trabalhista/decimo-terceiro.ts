import { avosDecimoTerceiro, lerData } from "../datas";
import { arred, formatarBRL } from "../dinheiro";
import { calcularINSS, calcularIRRF } from "./impostos";
import type { Linha } from "./rescisao";

export interface EntradaDecimo {
  salario: number;
  mediaVariaveis?: number;
  ano: number;
  admissao?: string; // vazio = ano inteiro
  dependentes?: number;
}

export interface ResultadoDecimo {
  avos: number;
  total: number;
  primeira: number;
  segunda: { bruto: number; descontos: Linha[]; liquido: number };
  totalLiquido: number;
  linhas: Linha[];
}

export class ErroDecimo extends Error {}

export function calcularDecimoTerceiro(e: EntradaDecimo): ResultadoDecimo {
  if (!(e.salario > 0)) throw new ErroDecimo("Informe o salário bruto mensal.");
  const fim = new Date(Date.UTC(e.ano, 11, 31));
  const admissao = e.admissao ? lerData(e.admissao) : new Date(Date.UTC(e.ano, 0, 1));
  if (admissao > fim) throw new ErroDecimo(`A data de admissão precisa ser até 31/12/${e.ano}.`);

  const remuneracao = arred(e.salario + (e.mediaVariaveis ?? 0));
  const avos = avosDecimoTerceiro(admissao, fim);
  const total = arred((remuneracao / 12) * avos);
  const primeira = arred(total / 2);
  const dependentes = Math.max(0, Math.floor(e.dependentes ?? 0));

  const inss = calcularINSS(total);
  const ir = calcularIRRF(total, inss, dependentes, false);
  const descontos: Linha[] = [
    {
      id: "inss",
      rotulo: "INSS sobre o 13º",
      valor: inss,
      memoria: `Tabela progressiva de 2026 sobre o 13º inteiro (${formatarBRL(total)}), separado do salário`,
      base: "Lei 8.212/1991, art. 28, § 7º",
    },
    {
      id: "irrf",
      rotulo: "Imposto de renda sobre o 13º",
      valor: ir.imposto,
      memoria: `Tributação exclusiva, sem desconto simplificado. Base ${formatarBRL(ir.base)}; imposto ${formatarBRL(ir.impostoTabela)} − redução ${formatarBRL(ir.reducao)}`,
      base: "Lei 7.713/1988, art. 26; Lei 15.270/2025",
    },
    { id: "primeira", rotulo: "1ª parcela já paga", valor: primeira, memoria: "Adiantamento pago até 30 de novembro" },
  ];
  const segundaBruta = arred(total - primeira);
  const segundaLiquida = arred(total - inss - ir.imposto - primeira);

  const linhas: Linha[] = [
    {
      id: "total",
      rotulo: `13º salário (${avos}/12)`,
      valor: total,
      memoria: `${formatarBRL(remuneracao)} ÷ 12 × ${avos} meses com 15 dias ou mais trabalhados em ${e.ano}`,
      base: "Lei 4.090/1962",
    },
  ];

  return {
    avos,
    total,
    primeira,
    segunda: { bruto: segundaBruta, descontos, liquido: segundaLiquida },
    totalLiquido: arred(primeira + segundaLiquida),
    linhas,
  };
}
