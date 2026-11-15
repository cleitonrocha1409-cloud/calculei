// Escala de trabalho e folha de ponto do mês, com as regras da CLT e da EC 141/2026 (fim da 6x1).
import { EC141 } from "../../data/jornada";
import { lerData } from "../datas";
import { pascoa } from "./holerite";

export type ModoEscala = "semanal" | "12x36";

export interface Horario {
  entrada: string; // HH:MM
  saida: string; // HH:MM (antes da entrada = vira o dia)
  intervalo: number; // minutos
}

export interface DadosEscala {
  competencia: string; // AAAA-MM
  modo: ModoEscala;
  /** Dias da semana de folga no modo semanal (0 = domingo … 6 = sábado). */
  folgas: number[];
  /** 12x36: um dia trabalhado (AAAA-MM-DD) que serve de referência para a alternância. */
  inicio12x36?: string;
  horario: Horario;
  /** Horário diferente aos sábados (modo semanal). */
  horarioSabado?: Horario | null;
  trabalhaFeriados?: boolean;
  /** Acordo ou convenção coletiva que permite 42h na transição (16/12/2026 a 15/12/2027). */
  acordo42h?: boolean;
}

export type TipoDia = "trabalho" | "folga" | "feriado";

export interface DiaEscala {
  iso: string;
  dia: number;
  semana: number;
  tipo: TipoDia;
  feriado?: string;
  horario?: Horario;
  minutos: number;
}

export interface ResultadoEscala {
  dias: DiaEscala[];
  diasTrabalho: number;
  minutosMes: number;
  /** Jornada da semana típica (modo semanal) ou média semanal (12x36), em minutos. */
  minutosSemana: number;
  avisos: string[];
}

export const SEMANA_CURTA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const SEMANA_LETRA = ["D", "S", "T", "Q", "Q", "S", "S"];

/** Feriados nacionais com nome (Lei 662/1949, Lei 6.802/1980, Lei 14.759/2023) e Sexta-feira Santa. */
export function feriadosComNome(ano: number): Map<string, string> {
  const m = new Map<string, string>([
    [`${ano}-01-01`, "Confraternização Universal"],
    [`${ano}-04-21`, "Tiradentes"],
    [`${ano}-05-01`, "Dia do Trabalho"],
    [`${ano}-09-07`, "Independência"],
    [`${ano}-10-12`, "N. Sra. Aparecida"],
    [`${ano}-11-02`, "Finados"],
    [`${ano}-11-15`, "Proclamação da República"],
    [`${ano}-11-20`, "Consciência Negra"],
    [`${ano}-12-25`, "Natal"],
  ]);
  m.set(new Date(pascoa(ano).getTime() - 2 * 86400000).toISOString().slice(0, 10), "Sexta-feira Santa");
  return m;
}

const paraMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** Minutos trabalhados num horário (descontado o intervalo; saída antes da entrada vira o dia). */
export function minutosDoHorario(h: Horario): number {
  let fim = paraMin(h.saida);
  const ini = paraMin(h.entrada);
  if (fim <= ini) fim += 24 * 60;
  return Math.max(0, fim - ini - Math.max(0, h.intervalo || 0));
}

export const formatarHoras = (min: number) => {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
};

/** Teto semanal (em horas) numa data, pela EC 141/2026. */
function tetoNaData(iso: string, acordo42h: boolean) {
  if (iso < EC141.inicio42h) return 44;
  if (iso < EC141.inicio40h) return acordo42h ? 42 : 40;
  return 40;
}

export function montarEscala(d: DadosEscala): ResultadoEscala {
  const [ano, mes] = d.competencia.split("-").map(Number);
  const feriados = feriadosComNome(ano);
  const total = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const folgas = new Set(d.folgas);
  const ref = d.inicio12x36 ? lerData(d.inicio12x36).getTime() : null;

  const dias: DiaEscala[] = [];
  for (let n = 1; n <= total; n++) {
    const data = new Date(Date.UTC(ano, mes - 1, n));
    const iso = data.toISOString().slice(0, 10);
    const semana = data.getUTCDay();
    const feriado = feriados.get(iso);
    let trabalha: boolean;
    let horario: Horario | undefined;
    if (d.modo === "12x36") {
      const dif = ref === null ? 0 : Math.round((data.getTime() - ref) / 86400000);
      trabalha = ((dif % 2) + 2) % 2 === 0;
      horario = d.horario;
    } else {
      trabalha = !folgas.has(semana);
      horario = semana === 6 && d.horarioSabado ? d.horarioSabado : d.horario;
    }
    // No 12x36 o feriado trabalhado já está compensado (CLT, art. 59-A, parágrafo único).
    if (trabalha && feriado && !d.trabalhaFeriados && d.modo === "semanal") {
      dias.push({ iso, dia: n, semana, tipo: "feriado", feriado, minutos: 0 });
    } else if (trabalha) {
      dias.push({ iso, dia: n, semana, tipo: "trabalho", feriado, horario, minutos: minutosDoHorario(horario!) });
    } else {
      dias.push({ iso, dia: n, semana, tipo: "folga", feriado, minutos: 0 });
    }
  }

  const minutosDia = minutosDoHorario(d.horario);
  const minutosSab = d.horarioSabado ? minutosDoHorario(d.horarioSabado) : minutosDia;
  const minutosSemana =
    d.modo === "12x36"
      ? Math.round((minutosDia * 7) / 2)
      : [0, 1, 2, 3, 4, 5, 6].filter((s) => !folgas.has(s)).reduce((t, s) => t + (s === 6 ? minutosSab : minutosDia), 0);

  const avisos: string[] = [];
  const acordo = !!d.acordo42h;
  const primeiro = dias[0].iso;
  const ultimo = dias[dias.length - 1].iso;
  const datasRegra = [primeiro, ...[EC141.inicio42h, EC141.inicio40h].filter((x) => x > primeiro && x <= ultimo)];

  if (d.modo === "semanal") {
    const folgasSemana = folgas.size;
    if (folgasSemana === 0) avisos.push("Todo trabalhador tem direito a pelo menos uma folga de 24 horas por semana (CLT, art. 67).");
    if (folgasSemana < 2 && ultimo >= EC141.inicio42h)
      avisos.push("A partir de 16/12/2026 a escala 6x1 deixa de ser permitida: são duas folgas por semana (EC 141/2026). Ajuste a escala dos dias a partir dessa data.");
    if (folgasSemana > 0 && !folgas.has(0))
      avisos.push("No comércio, a folga precisa cair no domingo pelo menos uma vez a cada três semanas (Lei 10.101/2000, art. 6º). Faça o rodízio na escala da equipe.");
    for (const data of datasRegra) {
      const teto = tetoNaData(data, acordo);
      if (minutosSemana > teto * 60) {
        const desde = data === primeiro ? "neste mês" : `a partir de ${data.split("-").reverse().join("/")}`;
        avisos.push(`A semana tem ${formatarHoras(minutosSemana)}, acima do limite de ${teto} horas ${desde}.`);
      }
    }
    const maiorDia = Math.max(minutosDia, d.horarioSabado ? minutosSab : 0);
    if (maiorDia > 10 * 60) avisos.push("A jornada passa de 10 horas por dia, o máximo mesmo com horas extras ou compensação (CLT, art. 59).");
    else if (maiorDia > 8 * 60) avisos.push("Mais de 8 horas por dia só vale com acordo de compensação de jornada (CLT, art. 59).");
  } else {
    if (minutosDia > 12 * 60) avisos.push("Na escala 12x36 o turno é de no máximo 12 horas (CLT, art. 59-A).");
    avisos.push("A 12x36 precisa de acordo individual escrito ou de convenção coletiva (CLT, art. 59-A). Os feriados trabalhados já ficam compensados.");
    if (ultimo >= EC141.inicio40h) avisos.push("Com o limite de 40 horas, as semanas com quatro plantões passam do teto; confira o acordo coletivo da categoria.");
  }

  const bruto = (h: Horario) => {
    let fim = paraMin(h.saida);
    const ini = paraMin(h.entrada);
    if (fim <= ini) fim += 1440;
    return fim - ini;
  };
  for (const h of [d.horario, ...(d.horarioSabado && d.modo === "semanal" ? [d.horarioSabado] : [])]) {
    const b = bruto(h);
    if (b > 6 * 60 && h.intervalo < 60) {
      avisos.push("Jornada acima de 6 horas exige intervalo de pelo menos 1 hora (CLT, art. 71); menos que isso só com acordo coletivo, até 30 minutos.");
      break;
    }
    if (b > 4 * 60 && b <= 6 * 60 && h.intervalo < 15) {
      avisos.push("Jornada entre 4 e 6 horas exige intervalo de 15 minutos (CLT, art. 71, § 1º).");
      break;
    }
  }

  const trabalho = dias.filter((x) => x.tipo === "trabalho");
  return {
    dias,
    diasTrabalho: trabalho.length,
    minutosMes: trabalho.reduce((t, x) => t + x.minutos, 0),
    minutosSemana,
    avisos,
  };
}
