import { EC141, PERIODOS, diasNoPeriodo, divisorMensal, jornadaNoPeriodo, type Periodo } from "../../data/jornada";
import { arred } from "../dinheiro";

export interface EntradaNovaJornada {
  salario: number;
  jornadaAtual: number; // horas semanais do contrato
  diasAtuais: number; // dias trabalhados por semana hoje (6 na escala 6x1)
  acordo42h?: boolean; // há acordo ou convenção que amplia a jornada diária na fase de 42h
}

export interface FaseJornada {
  periodo: Periodo;
  rotulo: string;
  semanal: number;
  dias: number;
  horasPorDia: number;
  divisor: number;
  valorHora: number;
  horaExtra50: number;
}

export interface ResultadoNovaJornada {
  fases: FaseJornada[];
  aumentoValorHora: number; // fração, hoje → 2027
  horasLivresAno: number; // horas a menos por ano, hoje → 2027
  folgasExtrasAno: number; // dias de folga a mais por ano
  salario: number;
  alertas: string[];
}

export class ErroJornada extends Error {}

export function calcularNovaJornada(e: EntradaNovaJornada): ResultadoNovaJornada {
  if (!(e.salario > 0)) throw new ErroJornada("Informe o salário bruto mensal.");
  if (!(e.jornadaAtual >= 10 && e.jornadaAtual <= 44)) throw new ErroJornada("A jornada semanal precisa estar entre 10 e 44 horas.");
  if (!(e.diasAtuais >= 1 && e.diasAtuais <= 6)) throw new ErroJornada("Informe de 1 a 6 dias de trabalho por semana.");
  const acordo = !!e.acordo42h;

  const fases: FaseJornada[] = (["atual", "transicao", "final"] as Periodo[]).map((periodo) => {
    const semanal = jornadaNoPeriodo(e.jornadaAtual, periodo, acordo);
    const dias = diasNoPeriodo(e.diasAtuais, periodo);
    const divisor = divisorMensal(semanal);
    const valorHora = e.salario / divisor;
    return {
      periodo,
      rotulo: PERIODOS[periodo].rotulo,
      semanal,
      dias,
      horasPorDia: semanal / dias,
      divisor,
      valorHora: arred(valorHora),
      horaExtra50: arred(valorHora * 1.5),
    };
  });

  const [hoje, , fim] = fases;
  const alertas: string[] = [];
  if (e.jornadaAtual <= 40) alertas.push("Sua jornada já é de 40 horas ou menos: o total de horas não muda, mas as duas folgas por semana passam a ser obrigatórias.");
  if (!acordo && e.jornadaAtual > 40)
    alertas.push("Sem acordo ou convenção coletiva, a jornada diária continua limitada a 8 horas. Com duas folgas, isso dá 40 horas por semana já em dezembro de 2026.");
  if (e.salario >= EC141.limiteHipersuficiente)
    alertas.push("Para quem tem diploma de nível superior e salário a partir de R$ 21.188,87, a emenda permite regras próprias de jornada. Confira o seu contrato.");
  const horaDiariaTransicao = fases[1].horasPorDia;
  if (horaDiariaTransicao > EC141.limiteDiario + 0.001 && !acordo)
    alertas.push("A distribuição em 5 dias passa de 8 horas diárias; isso só é permitido com acordo coletivo.");

  return {
    fases,
    aumentoValorHora: hoje.divisor / fim.divisor - 1,
    horasLivresAno: arred((hoje.semanal - fim.semanal) * 52),
    folgasExtrasAno: Math.max(0, (hoje.dias - fim.dias) * 52),
    salario: e.salario,
    alertas,
  };
}

/** Converte horas decimais em "8h24". */
export function formatarHoras(h: number): string {
  const total = Math.round(h * 60);
  const horas = Math.floor(total / 60);
  const min = total % 60;
  return min ? `${horas}h${String(min).padStart(2, "0")}` : `${horas}h`;
}
