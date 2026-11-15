// Recibos da folha além do holerite: pró-labore, férias e 13º salário.
// Todos devolvem o mesmo formato (DocumentoFolha), desenhado pelo mesmo modelo de recibo.
import { FGTS, INSS_2026, IRRF_2026, SALARIO_MINIMO_2026 } from "../../data/parametros-2026";
import { lerData, somarDias } from "../datas";
import { arred, formatarBRL } from "../dinheiro";
import { calcularDecimoTerceiro } from "./decimo-terceiro";
import { calcularFerias } from "./ferias";
import type { LinhaHolerite } from "./holerite";
import { calcularINSS, calcularIRRF } from "./impostos";

export interface DocumentoFolha {
  titulo: string;
  referencia: string;
  linhas: LinhaHolerite[];
  totalVencimentos: number;
  totalDescontos: number;
  liquido: number;
  /** Quadro de bases no rodapé (rótulo e valor já formatado). */
  bases: { rotulo: string; valor: string }[];
  declaracao: string;
  avisos: string[];
}

const num = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dataBR = (d: Date) => d.toISOString().slice(0, 10).split("-").reverse().join("/");

export function faixaIRRF(base: number, imposto: number): string {
  if (!(imposto > 0)) return "isento";
  const a = IRRF_2026.faixas.find((f) => base <= f.ate)!.aliquota * 100;
  return `${a.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function fechar(linhas: LinhaHolerite[]) {
  const limpas = linhas.filter((l) => (l.vencimento ?? 0) > 0 || (l.desconto ?? 0) > 0);
  const totalVencimentos = arred(limpas.reduce((s, l) => s + (l.vencimento ?? 0), 0));
  const totalDescontos = arred(limpas.reduce((s, l) => s + (l.desconto ?? 0), 0));
  return { linhas: limpas, totalVencimentos, totalDescontos, liquido: arred(totalVencimentos - totalDescontos) };
}

function outros(lista: { descricao: string; valor: number }[] | undefined, codigoInicial: number): LinhaHolerite[] {
  return (lista ?? [])
    .filter((l) => l.valor > 0)
    .map((l, i) => ({ codigo: String(codigoInicial + i), descricao: l.descricao || "Outro desconto", referencia: "", desconto: arred(l.valor) }));
}

/* ------------------------------------------------------------------ */
/* Pró-labore                                                          */
/* ------------------------------------------------------------------ */

export interface DadosProLabore {
  competencia: string; // AAAA-MM
  valor: number;
  dependentesIR?: number;
  pensao?: number;
  outrosDescontos?: { descricao: string; valor: number }[];
}

/** Sócio é contribuinte individual: 11% sobre o pró-labore, limitado ao teto (Lei 8.212/1991, art. 21 e art. 30, § 4º). */
export const ALIQUOTA_INSS_SOCIO = 0.11;

export function reciboProLabore(d: DadosProLabore, nomeCompetencia: string): DocumentoFolha {
  const valor = arred(Math.max(0, d.valor));
  const baseINSS = Math.min(Math.max(valor, valor > 0 ? SALARIO_MINIMO_2026 : 0), INSS_2026.teto);
  const inss = arred(baseINSS * ALIQUOTA_INSS_SOCIO);
  const pensao = Math.max(0, d.pensao ?? 0);
  const ir = calcularIRRF(valor, inss, Math.max(0, Math.floor(d.dependentesIR ?? 0)), true, pensao);
  const linhas: LinhaHolerite[] = [
    { codigo: "001", descricao: "Pró-labore", referencia: "", vencimento: valor },
    { codigo: "201", descricao: "INSS contribuinte individual", referencia: "11%", desconto: inss },
    { codigo: "202", descricao: "IRRF", referencia: faixaIRRF(ir.base, ir.imposto), desconto: ir.imposto },
    { codigo: "212", descricao: "Pensão alimentícia", referencia: "", desconto: arred(pensao) },
    ...outros(d.outrosDescontos, 220),
  ];
  const avisos = [
    "Pró-labore não tem FGTS, férias nem 13º: é a remuneração do sócio pelo trabalho na empresa.",
    "A empresa também recolhe 20% de INSS patronal sobre o pró-labore, exceto no Simples Nacional (anexos I, II, III e V), onde essa parte já vem no DAS.",
  ];
  if (valor > 0 && valor < SALARIO_MINIMO_2026)
    avisos.push(`A contribuição mínima ao INSS é sobre o salário mínimo (${formatarBRL(SALARIO_MINIMO_2026)}); por isso o desconto foi calculado sobre ele.`);
  if (valor > INSS_2026.teto) avisos.push(`O INSS para no teto: 11% de ${formatarBRL(INSS_2026.teto)}.`);
  return {
    titulo: "Recibo de pagamento de pró-labore",
    referencia: `Referência: ${nomeCompetencia}`,
    ...fechar(linhas),
    bases: [
      { rotulo: "Pró-labore", valor: num(valor) },
      { rotulo: "Base INSS", valor: num(baseINSS) },
      { rotulo: "INSS patronal (20%)", valor: num(arred(valor * 0.2)) },
      { rotulo: "Base cálc. IRRF", valor: num(ir.base) },
      { rotulo: "Faixa IRRF", valor: faixaIRRF(ir.base, ir.imposto) },
    ],
    declaracao: "Declaro ter recebido a importância líquida discriminada neste recibo, a título de pró-labore.",
    avisos,
  };
}

/* ------------------------------------------------------------------ */
/* Férias                                                              */
/* ------------------------------------------------------------------ */

export interface DadosReciboFerias {
  salario: number;
  mediaVariaveis?: number;
  inicioGozo: string; // AAAA-MM-DD
  dias: number;
  venderDias?: boolean;
  adiantar13?: boolean;
  dependentesIR?: number;
  inicioAquisitivo?: string; // AAAA-MM-DD
  pagamento?: string; // AAAA-MM-DD
}

export function reciboFerias(d: DadosReciboFerias): DocumentoFolha {
  const r = calcularFerias({
    salario: d.salario,
    mediaVariaveis: d.mediaVariaveis,
    dias: d.dias,
    venderDias: d.venderDias,
    adiantar13: d.adiantar13,
    dependentes: d.dependentesIR,
  });
  const valor = (id: string) => r.proventos.find((p) => p.id === id)?.valor ?? 0;
  const desc = (id: string) => r.descontos.find((p) => p.id === id)?.valor ?? 0;
  const remuneracao = arred(d.salario + (d.mediaVariaveis ?? 0));
  const ferias = valor("ferias");
  const terco = valor("terco");
  const tributavel = arred(ferias + terco);
  const ir = calcularIRRF(tributavel, desc("inss"), Math.max(0, Math.floor(d.dependentesIR ?? 0)), true);

  const inicio = lerData(d.inicioGozo);
  const fim = somarDias(inicio, Math.floor(d.dias) - 1);
  const retorno = somarDias(fim, 1);
  const linhas: LinhaHolerite[] = [
    { codigo: "050", descricao: "Férias", referencia: `${Math.floor(d.dias)} dias`, vencimento: ferias },
    { codigo: "051", descricao: "1/3 constitucional de férias", referencia: "", vencimento: terco },
    { codigo: "052", descricao: "Abono pecuniário", referencia: r.diasVendidos ? `${r.diasVendidos} dias` : "", vencimento: valor("abono") },
    { codigo: "053", descricao: "1/3 sobre abono pecuniário", referencia: "", vencimento: valor("terco-abono") },
    { codigo: "054", descricao: "Adiantamento 13º salário", referencia: "50%", vencimento: valor("adiant-13") },
    { codigo: "201", descricao: "INSS sobre férias", referencia: "", desconto: desc("inss") },
    { codigo: "202", descricao: "IRRF sobre férias", referencia: faixaIRRF(ir.base, ir.imposto), desconto: ir.imposto },
  ];

  const avisos = [...r.alertas];
  if (d.pagamento) {
    const limite = somarDias(inicio, -2);
    if (lerData(d.pagamento) > limite)
      avisos.push(`As férias devem ser pagas até 2 dias antes do início (${dataBR(limite)}). Pagar depois obriga a empresa a pagar em dobro (CLT, art. 145 e Súmula 450 do TST, cuja aplicação o STF limitou ao atraso no pagamento).`);
  }
  avisos.push("Abono pecuniário e seu 1/3 não têm INSS, imposto de renda nem FGTS.");

  let aquisitivo = "";
  if (d.inicioAquisitivo) {
    const ia = lerData(d.inicioAquisitivo);
    const fa = somarDias(new Date(Date.UTC(ia.getUTCFullYear() + 1, ia.getUTCMonth(), ia.getUTCDate())), -1);
    aquisitivo = ` · Período aquisitivo: ${dataBR(ia)} a ${dataBR(fa)}`;
  }

  return {
    titulo: "Recibo de férias",
    referencia: `Gozo: ${dataBR(inicio)} a ${dataBR(fim)} · Retorno: ${dataBR(retorno)}${aquisitivo}`,
    ...fechar(linhas),
    bases: [
      { rotulo: "Remuneração", valor: num(remuneracao) },
      { rotulo: "Base INSS", valor: num(tributavel) },
      { rotulo: "Base cálc. FGTS", valor: num(tributavel) },
      { rotulo: "FGTS", valor: num(arred(tributavel * FGTS.aliquotaDeposito)) },
      { rotulo: "Base cálc. IRRF", valor: num(ir.base) },
      { rotulo: "Faixa IRRF", valor: faixaIRRF(ir.base, ir.imposto) },
    ],
    declaracao: "Recebi a importância líquida deste recibo, referente às férias no período indicado, nos termos do art. 145 da CLT.",
    avisos,
  };
}

/* ------------------------------------------------------------------ */
/* 13º salário                                                         */
/* ------------------------------------------------------------------ */

export interface DadosRecibo13 {
  parcela: 1 | 2;
  ano: number;
  salario: number;
  mediaVariaveis?: number;
  admissao?: string; // AAAA-MM-DD; vazio ou de anos anteriores = ano inteiro
  dependentesIR?: number;
  /** 2ª parcela: valor efetivamente pago na 1ª (padrão: metade do 13º calculado). */
  primeiraPaga?: number;
}

export function recibo13(d: DadosRecibo13): DocumentoFolha {
  const admissaoAno = d.admissao && lerData(d.admissao).getUTCFullYear() === d.ano ? d.admissao : undefined;
  const r = calcularDecimoTerceiro({
    salario: d.salario,
    mediaVariaveis: d.mediaVariaveis,
    ano: d.ano,
    admissao: admissaoAno,
    dependentes: d.dependentesIR,
  });
  const remuneracao = arred(d.salario + (d.mediaVariaveis ?? 0));
  const avos = `${r.avos}/12`;

  if (d.parcela === 1) {
    return {
      titulo: "Recibo de 13º salário – 1ª parcela",
      referencia: `Referência: 13º salário de ${d.ano} · adiantamento`,
      ...fechar([{ codigo: "060", descricao: "13º salário 1ª parcela", referencia: avos, vencimento: r.primeira }]),
      bases: [
        { rotulo: "Remuneração", valor: num(remuneracao) },
        { rotulo: "13º integral", valor: num(r.total) },
        { rotulo: "Base cálc. FGTS", valor: num(r.primeira) },
        { rotulo: "FGTS", valor: num(arred(r.primeira * FGTS.aliquotaDeposito)) },
        { rotulo: "Avos", valor: avos },
      ],
      declaracao: `Declaro ter recebido a importância líquida deste recibo, referente à 1ª parcela do 13º salário de ${d.ano}.`,
      avisos: [
        `A 1ª parcela deve ser paga até 30 de novembro, sem descontos de INSS e imposto de renda, que ficam para a 2ª parcela (Lei 4.749/1965).`,
        "O FGTS de 8% incide sobre a 1ª parcela e deve ser depositado no mês do pagamento.",
      ],
    };
  }

  const primeira = arred(d.primeiraPaga ?? r.primeira);
  const inss = r.segunda.descontos.find((x) => x.id === "inss")!.valor;
  const ir = calcularIRRF(r.total, inss, Math.max(0, Math.floor(d.dependentesIR ?? 0)), false);
  const baseFGTS = arred(r.total - primeira);
  return {
    titulo: "Recibo de 13º salário – 2ª parcela",
    referencia: `Referência: 13º salário de ${d.ano}`,
    ...fechar([
      { codigo: "061", descricao: "13º salário integral", referencia: avos, vencimento: r.total },
      { codigo: "201", descricao: "INSS sobre 13º salário", referencia: "", desconto: inss },
      { codigo: "202", descricao: "IRRF sobre 13º salário", referencia: faixaIRRF(ir.base, ir.imposto), desconto: ir.imposto },
      { codigo: "215", descricao: "Adiantamento 13º (1ª parcela)", referencia: "", desconto: primeira },
    ]),
    bases: [
      { rotulo: "Remuneração", valor: num(remuneracao) },
      { rotulo: "Base INSS", valor: num(r.total) },
      { rotulo: "Base cálc. FGTS", valor: num(baseFGTS) },
      { rotulo: "FGTS", valor: num(arred(baseFGTS * FGTS.aliquotaDeposito)) },
      { rotulo: "Base cálc. IRRF", valor: num(ir.base) },
      { rotulo: "Faixa IRRF", valor: faixaIRRF(ir.base, ir.imposto) },
    ],
    declaracao: `Declaro ter recebido a importância líquida deste recibo, referente à 2ª parcela do 13º salário de ${d.ano}.`,
    avisos: [
      "A 2ª parcela deve ser paga até 20 de dezembro. O INSS e o imposto de renda são calculados sobre o 13º inteiro, separados do salário.",
      "No imposto de renda do 13º não se usa o desconto simplificado (tributação exclusiva).",
      "Se houve variação de salário ou de médias desde a 1ª parcela, a diferença é acertada aqui; ajuste o valor da 1ª parcela paga se for diferente da metade.",
    ],
  };
}

