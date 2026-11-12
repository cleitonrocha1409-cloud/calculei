// Montador de escala 5x2: quantas pessoas são necessárias e uma escala de folgas rotativa.

export const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;

export interface EntradaEscala {
  diasAbertos: boolean[]; // 7 posições, segunda a domingo
  horasAbertas: number; // horas de funcionamento por dia
  pessoasPorTurno: number; // pessoas trabalhando ao mesmo tempo
  horasPorDiaPessoa: number; // jornada diária de cada pessoa (8h; 8h24 com acordo na fase de 42h)
  diasTrabalhoPessoa: number; // 5 na escala 5x2; 6 na 6x1
  semanas?: number;
}

export interface ResultadoEscala {
  turnosPorDia: number;
  necessidadePorDia: number[]; // pessoas por dia
  minimoPessoas: number;
  escala: ("T" | "F" | "X")[][][]; // [semana][pessoa][dia]: T trabalha, F folga, X fechado
  folgasDomingo: number[]; // domingos de folga por pessoa no período
  avisos: string[];
}

export class ErroEscala extends Error {}

export function calcularMinimo(e: EntradaEscala) {
  const abertos = e.diasAbertos.filter(Boolean).length;
  if (abertos === 0) throw new ErroEscala("Marque pelo menos um dia de funcionamento.");
  if (!(e.horasAbertas > 0 && e.horasAbertas <= 24)) throw new ErroEscala("Informe de 1 a 24 horas de funcionamento por dia.");
  if (!(e.pessoasPorTurno >= 1)) throw new ErroEscala("Informe quantas pessoas precisam trabalhar ao mesmo tempo.");
  const turnos = Math.ceil(e.horasAbertas / e.horasPorDiaPessoa - 1e-9);
  const necessidade = e.diasAbertos.map((a) => (a ? turnos * e.pessoasPorTurno : 0));
  const diasTrabalho = Math.min(e.diasTrabalhoPessoa, abertos);
  const soma = necessidade.reduce((s, n) => s + n, 0);
  const minimo = Math.max(Math.max(...necessidade), Math.ceil(soma / diasTrabalho));
  return { turnos, necessidade, minimo, abertos, diasTrabalho };
}

export function montarEscala(e: EntradaEscala): ResultadoEscala {
  const { turnos, necessidade, minimo, abertos, diasTrabalho } = calcularMinimo(e);
  const semanas = e.semanas ?? 4;
  const folgasPorPessoa = abertos - diasTrabalho; // folgas que caem em dias de funcionamento
  const escala: ("T" | "F" | "X")[][][] = [];
  const folgasDomingo = Array(minimo).fill(0);
  const avisos: string[] = [];

  for (let s = 0; s < semanas; s++) {
    const semana: ("T" | "F" | "X")[][] = Array.from({ length: minimo }, () => e.diasAbertos.map((a) => (a ? "T" : "X")));
    const capacidade = necessidade.map((n, d) => (e.diasAbertos[d] ? minimo - n : 0));
    // A cada semana, outra pessoa escolhe primeiro: o domingo de folga roda entre todos.
    const ordem = Array.from({ length: minimo }, (_, i) => (i + s * Math.max(1, Math.ceil(minimo / 2))) % minimo);
    for (const p of ordem) {
      let falta = folgasPorPessoa;
      // Preferência: domingo (repouso preferencialmente aos domingos), depois o dia vizinho, depois mais folga sobrando.
      const preferidos = [6, 5, 0, 1, 2, 3, 4].filter((d) => e.diasAbertos[d]);
      const escolhidos: number[] = [];
      while (falta > 0) {
        const candidatos = preferidos.filter((d) => capacidade[d] > 0 && !escolhidos.includes(d));
        if (!candidatos.length) break;
        let dia = candidatos[0];
        // Depois da primeira folga, prefere dia colado a ela (folga emendada).
        if (escolhidos.length) {
          const vizinho = candidatos.find((d) => escolhidos.some((x) => Math.abs(x - d) === 1 || Math.abs(x - d) === 6));
          if (vizinho !== undefined) dia = vizinho;
        } else {
          dia = [...candidatos].sort((a, b) => capacidade[b] - capacidade[a] || preferidos.indexOf(a) - preferidos.indexOf(b))[0];
          if (candidatos.includes(6) && capacidade[6] > 0) dia = 6;
        }
        escolhidos.push(dia);
        capacidade[dia]--;
        semana[p][dia] = "F";
        if (dia === 6) folgasDomingo[p]++;
        falta--;
      }
      if (falta > 0) avisos.push(`Semana ${s + 1}: não foi possível dar todas as folgas à pessoa ${p + 1}.`);
    }
    escala.push(semana);
  }

  if (e.diasAbertos[6] && folgasDomingo.some((n) => n === 0))
    avisos.push("Nem todos têm folga num domingo neste período. A lei pede que uma das folgas seja preferencialmente no domingo; aumente a equipe ou o período para melhorar a rotação.");

  return { turnosPorDia: turnos, necessidadePorDia: necessidade, minimoPessoas: minimo, escala, folgasDomingo, avisos };
}
