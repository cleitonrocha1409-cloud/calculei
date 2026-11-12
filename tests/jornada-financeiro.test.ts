import { describe, expect, it } from "vitest";
import { calcularNovaJornada, formatarHoras } from "../src/lib/jornada/nova-jornada";
import { calcularHoraExtra, DSR_PADRAO } from "../src/lib/jornada/hora-extra";
import { calcularMinimo, montarEscala } from "../src/lib/jornada/escala";
import { calcularCustoEmpresa } from "../src/lib/jornada/custo-empresa";
import { calcularFinanciamento, pmt, tabelaPrice, tabelaSAC } from "../src/lib/financeiro/financiamento";
import { parcelaDoEmprestimo, taxaDoEmprestimo } from "../src/lib/financeiro/emprestimo";
import { calcularJurosCompostos } from "../src/lib/financeiro/juros-compostos";

describe("nova jornada (EC 141/2026)", () => {
  it("44h na 6x1, sem acordo: 220 → 200, hora 13,64 → 15,00", () => {
    const r = calcularNovaJornada({ salario: 3000, jornadaAtual: 44, diasAtuais: 6 });
    expect(r.fases.map((f) => f.divisor)).toEqual([220, 200, 200]);
    expect(r.fases[0].valorHora).toBe(13.64);
    expect(r.fases[2].valorHora).toBe(15);
    expect(r.aumentoValorHora).toBeCloseTo(0.1, 6);
    expect(r.horasLivresAno).toBe(208);
    expect(r.folgasExtrasAno).toBe(52);
  });
  it("com acordo, a transição fica em 42h (divisor 210, 8h24 por dia)", () => {
    const r = calcularNovaJornada({ salario: 3000, jornadaAtual: 44, diasAtuais: 6, acordo42h: true });
    expect(r.fases[1].divisor).toBe(210);
    expect(formatarHoras(r.fases[1].horasPorDia)).toBe("8h24");
  });
  it("quem já tem 40h não muda de divisor", () => {
    const r = calcularNovaJornada({ salario: 3000, jornadaAtual: 40, diasAtuais: 5 });
    expect(r.fases.map((f) => f.divisor)).toEqual([200, 200, 200]);
    expect(r.aumentoValorHora).toBe(0);
  });
});

describe("hora extra", () => {
  it("10h a 50% com 40h: R$ 225,00 (antes, R$ 204,55)", () => {
    const r = calcularHoraExtra({ salario: 3000, jornadaContratual: 44, periodo: "final", horas50: 10 });
    expect(r.total).toBe(225);
    expect(r.comparacao?.totalAntes).toBe(204.55);
    expect(r.comparacao?.diferenca).toBe(20.45);
  });
  it("reflexo no DSR com 22 úteis e 8 de descanso", () => {
    const r = calcularHoraExtra({ salario: 3000, jornadaContratual: 44, periodo: "final", horas50: 10, dsr: DSR_PADRAO.final });
    expect(r.linhas.find((l) => l.id === "dsr")?.valor).toBe(81.82);
  });
});

describe("escala 5x2", () => {
  const entrada = { diasAbertos: [true, true, true, true, true, true, true], horasAbertas: 12, pessoasPorTurno: 1, horasPorDiaPessoa: 8, diasTrabalhoPessoa: 5 };
  it("loja 7 dias × 12h, 1 por turno: 2 turnos, 3 pessoas", () => {
    const m = calcularMinimo(entrada);
    expect(m.turnos).toBe(2);
    expect(m.minimo).toBe(3);
  });
  it("cada pessoa tem 2 folgas por semana e todos os dias ficam cobertos", () => {
    const r = montarEscala(entrada);
    for (const semana of r.escala) {
      for (const pessoa of semana) expect(pessoa.filter((d) => d === "F").length).toBe(2);
      for (let d = 0; d < 7; d++) expect(semana.filter((p) => p[d] === "T").length).toBeGreaterThanOrEqual(r.necessidadePorDia[d]);
    }
    expect(r.avisos.filter((a) => a.startsWith("Semana"))).toHaveLength(0);
  });
  it("comércio de segunda a sábado com 3 pessoas por turno", () => {
    const r = montarEscala({ ...entrada, diasAbertos: [true, true, true, true, true, true, false], horasAbertas: 8, pessoasPorTurno: 3 });
    expect(r.minimoPessoas).toBe(4); // 18 pessoas-dia ÷ 5 dias
    for (const semana of r.escala) for (const pessoa of semana) expect(pessoa.filter((d) => d === "F").length).toBe(1); // + domingo fechado
  });
});

describe("custo para a empresa", () => {
  it("10 pessoas, R$ 3.000, 44 → 40h, encargos 70%", () => {
    const r = calcularCustoEmpresa({ funcionarios: 10, salarioMedio: 3000, jornadaAtual: 44, jornadaNova: 40, encargos: 0.7 });
    expect(r.horasPerdidasMes).toBeCloseTo(173.33, 2);
    expect(r.horaExtra.mensal).toBeCloseTo(9282, 0);
    expect(r.contratar.contratacoes).toBe(1);
    expect(r.contratar.mensal).toBe(5100);
  });
});

describe("financiamento e empréstimo", () => {
  it("Price: R$ 100 mil, 1% a.m., 12 meses = R$ 8.884,88", () => {
    expect(Math.round(pmt(100000, 0.01, 12) * 100) / 100).toBe(8884.88);
    const t = tabelaPrice(100000, 0.01, 12);
    expect(t.parcelas[11].saldo).toBe(0);
  });
  it("SAC: primeira 9.333,33 e última 8.416,67", () => {
    const t = tabelaSAC(100000, 0.01, 12);
    expect(t.primeira).toBe(9333.33);
    expect(t.ultima).toBe(8416.67);
  });
  it("SAC paga menos juros que Price", () => {
    const r = calcularFinanciamento({ valorImovel: 400000, entrada: 80000, prazoMeses: 360, jurosAnual: 0.115 });
    expect(r.sac.totalJuros).toBeLessThan(r.price.totalJuros);
    expect(r.economiaSAC).toBeGreaterThan(0);
  });
  it("taxa reversa recupera 1% ao mês", () => {
    expect(taxaDoEmprestimo(100000, 12, 8884.88).taxaMensal).toBeCloseTo(0.01, 5);
    expect(parcelaDoEmprestimo(100000, 12, 0.01).parcela).toBe(8884.88);
  });
  it("juros compostos: R$ 1.000 a 1% por 12 meses = R$ 1.126,83", () => {
    expect(calcularJurosCompostos({ inicial: 1000, aporteMensal: 0, taxaMensal: 0.01, meses: 12 }).montante).toBe(1126.83);
  });
});
