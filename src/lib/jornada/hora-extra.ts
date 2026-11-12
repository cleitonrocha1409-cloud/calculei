import { PERIODOS, divisorMensal, jornadaNoPeriodo, type Periodo } from "../../data/jornada";
import { arred, formatarBRL } from "../dinheiro";
import type { Linha } from "../trabalhista/rescisao";

export interface EntradaHoraExtra {
  salario: number;
  adicionais?: number; // adicionais fixos que integram a base (insalubridade, periculosidade)
  jornadaContratual: number; // horas semanais
  periodo: Periodo;
  acordo42h?: boolean;
  horas50: number;
  horas100?: number;
  percentual50?: number; // padrão 50%; convenções podem prever mais
  dsr?: { diasUteis: number; diasDescanso: number };
}

export interface ResultadoHoraExtra {
  semanal: number;
  divisor: number;
  valorHora: number;
  linhas: Linha[];
  total: number;
  comparacao?: { divisorAntes: number; totalAntes: number; diferenca: number };
}

export class ErroHoraExtra extends Error {}

/** Dias úteis e de descanso típicos de um mês, por período: 6x1 hoje (26/4) e 5x2 depois (22/8). */
export const DSR_PADRAO: Record<Periodo, { diasUteis: number; diasDescanso: number }> = {
  atual: { diasUteis: 26, diasDescanso: 4 },
  transicao: { diasUteis: 22, diasDescanso: 8 },
  final: { diasUteis: 22, diasDescanso: 8 },
};

function totalHE(valorHora: number, h50: number, h100: number, p50: number, dsr?: { diasUteis: number; diasDescanso: number }) {
  const v50 = arred(valorHora * (1 + p50) * h50);
  const v100 = arred(valorHora * 2 * h100);
  const reflexo = dsr && dsr.diasUteis > 0 ? arred(((v50 + v100) / dsr.diasUteis) * dsr.diasDescanso) : 0;
  return { v50, v100, reflexo, total: arred(v50 + v100 + reflexo) };
}

export function calcularHoraExtra(e: EntradaHoraExtra): ResultadoHoraExtra {
  if (!(e.salario > 0)) throw new ErroHoraExtra("Informe o salário bruto mensal.");
  if (!(e.horas50 >= 0) || !((e.horas100 ?? 0) >= 0)) throw new ErroHoraExtra("Informe as horas extras do mês.");
  if (!(e.jornadaContratual >= 10 && e.jornadaContratual <= 44)) throw new ErroHoraExtra("A jornada semanal precisa estar entre 10 e 44 horas.");

  const base = e.salario + (e.adicionais ?? 0);
  const p50 = (e.percentual50 ?? 50) / 100;
  const h100 = e.horas100 ?? 0;
  const semanal = jornadaNoPeriodo(e.jornadaContratual, e.periodo, !!e.acordo42h);
  const divisor = divisorMensal(semanal);
  const valorHora = base / divisor;
  const t = totalHE(valorHora, e.horas50, h100, p50, e.dsr);

  const linhas: Linha[] = [];
  if (e.horas50 > 0)
    linhas.push({
      id: "he50",
      rotulo: `Horas extras a ${Math.round(p50 * 100)}% (${e.horas50}h)`,
      valor: t.v50,
      memoria: `Valor da hora ${formatarBRL(valorHora)} (${formatarBRL(base)} ÷ ${divisor}) × ${(1 + p50).toFixed(2).replace(".", ",")} × ${e.horas50}h`,
      base: "CLT, art. 59; Constituição, art. 7º, XVI",
    });
  if (h100 > 0)
    linhas.push({
      id: "he100",
      rotulo: `Horas extras a 100% (${h100}h)`,
      valor: t.v100,
      memoria: `${formatarBRL(valorHora)} × 2 × ${h100}h. Em geral, domingos e feriados trabalhados sem folga compensatória`,
      base: "Lei 605/1949, art. 9º",
    });
  if (t.reflexo > 0)
    linhas.push({
      id: "dsr",
      rotulo: "Reflexo no descanso remunerado (DSR)",
      valor: t.reflexo,
      memoria: `${formatarBRL(t.v50 + t.v100)} ÷ ${e.dsr!.diasUteis} dias úteis × ${e.dsr!.diasDescanso} dias de descanso`,
      base: "Lei 605/1949, art. 7º; Súmula 172 do TST",
    });

  let comparacao: ResultadoHoraExtra["comparacao"];
  if (e.periodo !== "atual") {
    const divisorAntes = divisorMensal(jornadaNoPeriodo(e.jornadaContratual, "atual", false));
    if (divisorAntes !== divisor) {
      const antes = totalHE(base / divisorAntes, e.horas50, h100, p50, e.dsr ? DSR_PADRAO.atual : undefined);
      comparacao = { divisorAntes, totalAntes: antes.total, diferenca: arred(t.total - antes.total) };
    }
  }

  return { semanal, divisor, valorHora: arred(valorHora), linhas, total: t.total, comparacao };
}

export { PERIODOS };
