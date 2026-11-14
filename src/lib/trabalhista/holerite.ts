// Holerite (recibo de pagamento de salário — CLT, art. 464) com os cálculos da folha mensal.
// Usa as mesmas tabelas de INSS, IRRF e FGTS das demais calculadoras.
import { FGTS, IRRF_2026, SALARIO_MINIMO_2026 } from "../../data/parametros-2026";
import { arred } from "../dinheiro";
import { calcularINSS, calcularIRRF } from "./impostos";

/** Salário-família 2026 — Portaria Interministerial MPS/MF nº 13/2026. */
export const SALARIO_FAMILIA_2026 = { cota: 67.54, limite: 1980.38 };

export type Escala = "6x1" | "5x2";

export interface LancamentoLivre {
  descricao: string;
  valor: number;
  /** Só para proventos: entra na base de INSS, IRRF e FGTS? */
  incide?: boolean;
}

export interface DadosHolerite {
  /** Competência no formato AAAA-MM. */
  competencia: string;
  salarioBase: number;
  /** Jornada semanal contratual (44, 42 ou 40), para o divisor de horas (× 5). */
  jornadaSemanal: number;
  /** Escala, para contar dias úteis e de descanso no DSR (5x2: sábado conta como descanso). */
  escala: Escala;
  /** Dias trabalhados no mês, quando o empregado entrou ou saiu no meio dele (padrão 30). */
  diasTrabalhados?: number;
  faltas?: number; // dias de falta injustificada
  dsrDescontados?: number; // repousos perdidos pelas faltas
  horasExtras50?: number;
  horasExtras100?: number;
  horasNoturnas?: number; // horas noturnas (já reduzidas) com adicional de 20%
  comissoes?: number;
  insalubridade?: 0 | 10 | 20 | 40; // % do salário mínimo
  periculosidade?: boolean; // 30% do salário-base
  dependentesIR?: number;
  filhosSalarioFamilia?: number; // filhos até 14 anos ou inválidos
  valeTransporte?: number; // valor mensal do benefício fornecido (desconto de até 6% do salário-base)
  adiantamento?: number;
  pensao?: number; // pensão alimentícia judicial (deduz do IR)
  planoSaude?: number;
  outrosProventos?: LancamentoLivre[];
  outrosDescontos?: LancamentoLivre[];
}

export interface LinhaHolerite {
  codigo: string;
  descricao: string;
  referencia: string;
  vencimento?: number;
  desconto?: number;
}

export interface ResultadoHolerite {
  linhas: LinhaHolerite[];
  totalVencimentos: number;
  totalDescontos: number;
  liquido: number;
  baseINSS: number;
  baseFGTS: number;
  fgts: number;
  baseIRRF: number;
  faixaIRRF: string;
  inss: number;
  irrf: number;
  diasUteis: number;
  diasDescanso: number;
  valorHora: number;
  avisos: string[];
}

const fmtNum = (n: number, casas = 2) => n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
function pascoa(ano: number): Date {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(ano, mes - 1, dia));
}

/** Feriados nacionais (Lei 662/1949, Lei 6.802/1980, Lei 14.759/2023) e Sexta-feira Santa. Carnaval e Corpus Christi são ponto facultativo. */
export function feriadosNacionais(ano: number): string[] {
  const fixos = ["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "11-20", "12-25"].map((d) => `${ano}-${d}`);
  const sexta = new Date(pascoa(ano).getTime() - 2 * 86400000).toISOString().slice(0, 10);
  return [...fixos, sexta].sort();
}

/** Dias úteis e de descanso (domingos, feriados e, no 5x2, sábados) da competência. */
export function diasDoMes(competencia: string, escala: Escala) {
  const [ano, mes] = competencia.split("-").map(Number);
  const feriados = new Set(feriadosNacionais(ano));
  const total = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  let uteis = 0;
  for (let d = 1; d <= total; d++) {
    const data = new Date(Date.UTC(ano, mes - 1, d));
    const dia = data.getUTCDay();
    const iso = data.toISOString().slice(0, 10);
    const descanso = dia === 0 || (escala === "5x2" && dia === 6) || feriados.has(iso);
    if (!descanso) uteis++;
  }
  return { uteis, descanso: total - uteis, total };
}

export function calcularHolerite(d: DadosHolerite): ResultadoHolerite {
  const avisos: string[] = [];
  const linhas: LinhaHolerite[] = [];
  const base = arred(Math.max(0, d.salarioBase));
  const dias = Math.min(30, Math.max(0, d.diasTrabalhados ?? 30));
  const divisor = d.jornadaSemanal * 5;
  const { uteis, descanso } = diasDoMes(d.competencia, d.escala);

  let baseIncide = 0; // base de INSS, IRRF e FGTS
  const venc = (codigo: string, descricao: string, referencia: string, valor: number, incide = true) => {
    const v = arred(valor);
    if (!(v > 0)) return;
    linhas.push({ codigo, descricao, referencia, vencimento: v });
    if (incide) baseIncide = arred(baseIncide + v);
  };
  const desc = (codigo: string, descricao: string, referencia: string, valor: number) => {
    const v = arred(valor);
    if (!(v > 0)) return;
    linhas.push({ codigo, descricao, referencia, desconto: v });
  };

  // Salário do mês (proporcional aos dias, quando entrou ou saiu no meio do mês).
  venc("001", "Salário-base", dias === 30 ? "30 dias" : `${dias} dias`, (base / 30) * dias);

  // Adicionais fixos.
  const peric = d.periculosidade ? arred(base * 0.3) : 0;
  if (peric) venc("005", "Adicional de periculosidade", "30%", (peric / 30) * dias);
  const insal = d.insalubridade ? arred(SALARIO_MINIMO_2026 * (d.insalubridade / 100)) : 0;
  if (insal) venc("006", "Adicional de insalubridade", `${d.insalubridade}% do mínimo`, (insal / 30) * dias);

  // Hora normal: salário + periculosidade + insalubridade, dividido pelo divisor da jornada.
  const valorHora = (base + peric + insal) / divisor;

  // Variáveis e o descanso remunerado (DSR) sobre elas.
  const he50 = Math.max(0, d.horasExtras50 ?? 0);
  const he100 = Math.max(0, d.horasExtras100 ?? 0);
  const hn = Math.max(0, d.horasNoturnas ?? 0);
  const vHe50 = arred(he50 * valorHora * 1.5);
  const vHe100 = arred(he100 * valorHora * 2);
  const vNot = arred(hn * valorHora * 0.2);
  const comissoes = arred(Math.max(0, d.comissoes ?? 0));
  venc("010", "Horas extras 50%", `${fmtNum(he50)} h`, vHe50);
  venc("011", "Horas extras 100%", `${fmtNum(he100)} h`, vHe100);
  venc("015", "Adicional noturno 20%", `${fmtNum(hn)} h`, vNot);
  venc("020", "Comissões", "", comissoes);
  const variaveis = vHe50 + vHe100 + vNot + comissoes;
  if (variaveis > 0 && uteis > 0) {
    venc("021", "DSR sobre variáveis", `${uteis}/${descanso} dias`, (variaveis / uteis) * descanso);
  }

  for (const [i, p] of (d.outrosProventos ?? []).entries()) {
    if (p.valor > 0) venc(`03${i}`, p.descricao || "Outro provento", "", p.valor, p.incide !== false);
  }

  // Faltas e repousos perdidos (descontam da base).
  const faltas = Math.max(0, d.faltas ?? 0);
  const dsrPerdidos = Math.max(0, d.dsrDescontados ?? 0);
  const salarioDia = (base + peric + insal) / 30;
  if (faltas) {
    const v = arred(salarioDia * faltas);
    desc("101", "Faltas", `${faltas} ${faltas === 1 ? "dia" : "dias"}`, v);
    baseIncide = arred(baseIncide - v);
  }
  if (dsrPerdidos) {
    const v = arred(salarioDia * dsrPerdidos);
    desc("102", "DSR sobre faltas", `${dsrPerdidos} ${dsrPerdidos === 1 ? "dia" : "dias"}`, v);
    baseIncide = arred(baseIncide - v);
  }
  baseIncide = Math.max(0, baseIncide);

  // Salário-família: pela remuneração do mês cheio, não proporcional aos dias (Portaria MPS/MF 13/2026).
  const filhos = Math.max(0, d.filhosSalarioFamilia ?? 0);
  if (filhos) {
    const remuneracaoMes = base + peric + insal + variaveis;
    if (remuneracaoMes <= SALARIO_FAMILIA_2026.limite) {
      const cota = dias < 30 ? (SALARIO_FAMILIA_2026.cota / 30) * dias : SALARIO_FAMILIA_2026.cota;
      venc("040", "Salário-família", `${filhos} ${filhos === 1 ? "filho" : "filhos"}`, cota * filhos, false);
    } else {
      avisos.push(`Sem salário-família: a remuneração passa do limite de ${fmtNum(SALARIO_FAMILIA_2026.limite)} em 2026.`);
    }
  }

  // INSS e IRRF.
  const inss = calcularINSS(baseIncide);
  const aliqEfetiva = baseIncide > 0 ? (inss / baseIncide) * 100 : 0;
  desc("201", "INSS", `${fmtNum(aliqEfetiva)}%`, inss);
  const pensao = arred(Math.max(0, d.pensao ?? 0));
  const ir = calcularIRRF(baseIncide, inss, Math.max(0, d.dependentesIR ?? 0), true, pensao);
  desc("202", "IRRF", ir.imposto > 0 ? `base ${fmtNum(ir.base)}` : "isento", ir.imposto);
  if (ir.reducao > 0 && ir.imposto > 0) avisos.push(`IRRF já com a redução da Lei 15.270/2025 (R$ ${fmtNum(ir.reducao)}).`);
  if (ir.imposto === 0 && ir.impostoTabela > 0) avisos.push("IRRF zerado pela isenção até R$ 5.000 da Lei 15.270/2025.");

  // Vale-transporte: até 6% do salário-base, limitado ao valor do benefício (Lei 7.418/1985).
  const vt = Math.max(0, d.valeTransporte ?? 0);
  if (vt) desc("210", "Vale-transporte", "6%", Math.min(vt, ((base / 30) * dias) * 0.06));
  desc("211", "Adiantamento salarial", "", d.adiantamento ?? 0);
  desc("212", "Pensão alimentícia", "", pensao);
  desc("213", "Plano de saúde", "", d.planoSaude ?? 0);
  for (const [i, p] of (d.outrosDescontos ?? []).entries()) {
    if (p.valor > 0) desc(`22${i}`, p.descricao || "Outro desconto", "", p.valor);
  }

  const totalVencimentos = arred(linhas.reduce((t, l) => t + (l.vencimento ?? 0), 0));
  const totalDescontos = arred(linhas.reduce((t, l) => t + (l.desconto ?? 0), 0));
  const liquido = arred(totalVencimentos - totalDescontos);
  if (liquido < 0) avisos.push("Os descontos passam dos vencimentos. Confira adiantamento e descontos.");
  if (base > 0 && base < SALARIO_MINIMO_2026 && d.jornadaSemanal >= 40) {
    avisos.push(`O salário-base está abaixo do salário mínimo de 2026 (R$ ${fmtNum(SALARIO_MINIMO_2026)}) para jornada integral.`);
  }

  return {
    linhas,
    totalVencimentos,
    totalDescontos,
    liquido,
    baseINSS: baseIncide,
    baseFGTS: baseIncide,
    fgts: arred(baseIncide * FGTS.aliquotaDeposito),
    baseIRRF: ir.base,
    faixaIRRF: ir.imposto > 0 ? `${fmtNum(IRRF_2026.faixas.find((f) => ir.base <= f.ate)!.aliquota * 100, 1)}%` : "isento",
    inss,
    irrf: ir.imposto,
    diasUteis: uteis,
    diasDescanso: descanso,
    valorHora: arred(valorHora),
    avisos,
  };
}
