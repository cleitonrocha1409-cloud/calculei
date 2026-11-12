// Fim da escala 6x1 — Emenda Constitucional 141/2026 (publicada em 16/10/2026).
// Fontes divergem em um dia sobre o início (16 ou 17/12); usamos 16/12, dois meses após a publicação.

export const EC141 = {
  publicacao: "2026-10-16",
  inicio42h: "2026-12-16", // 42h semanais e 2 dias de repouso
  inicio40h: "2027-12-16", // 40h semanais
  limiteDiario: 8,
  // Na fase de 42h, acordo ou convenção coletiva pode ampliar a jornada diária para distribuir 42h em 5 dias (8h24).
  diarioComAcordo42h: 8.4,
  // Quem tem diploma e salário a partir de 2,5 × teto do INSS pode ter regras próprias de jornada.
  limiteHipersuficiente: 21188.87,
};

export type Periodo = "atual" | "transicao" | "final";

export const PERIODOS: Record<Periodo, { rotulo: string; curto: string }> = {
  atual: { rotulo: "Até 15/12/2026 (regra atual, 44h)", curto: "Hoje" },
  transicao: { rotulo: "De 16/12/2026 a 15/12/2027 (42h)", curto: "Dez/2026" },
  final: { rotulo: "A partir de 16/12/2027 (40h)", curto: "Dez/2027" },
};

/**
 * Jornada semanal máxima em cada período.
 * Sem acordo coletivo, a fase de 42h vira 40h na prática: com 8h por dia e 2 folgas, só cabem 40h.
 */
export function tetoSemanal(periodo: Periodo, acordo42h: boolean): number {
  if (periodo === "atual") return 44;
  if (periodo === "transicao") return acordo42h ? 42 : 40;
  return 40;
}

/** Jornada semanal de um contrato num período: a menor entre a contratada e o teto. */
export function jornadaNoPeriodo(contratada: number, periodo: Periodo, acordo42h: boolean): number {
  return Math.min(contratada, tetoSemanal(periodo, acordo42h));
}

/** Divisor mensal de horas (CLT): jornada semanal × 5. 44h → 220; 42h → 210; 40h → 200. */
export const divisorMensal = (semanal: number) => semanal * 5;

/** Dias de trabalho por semana no período. */
export const diasNoPeriodo = (diasAtuais: number, periodo: Periodo) => (periodo === "atual" ? diasAtuais : Math.min(diasAtuais, 5));
