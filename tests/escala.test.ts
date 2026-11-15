import { describe, expect, it } from "vitest";
import { feriadosComNome, minutosDoHorario, montarEscala } from "../src/lib/trabalhista/escala";

const h = { entrada: "08:00", saida: "17:00", intervalo: 60 };

describe("escala do mês", () => {
  it("5x2 em novembro de 2026: feriados de 2, 15 e 20", () => {
    const r = montarEscala({ competencia: "2026-11", modo: "semanal", folgas: [0, 6], horario: h });
    expect(r.dias.find((d) => d.dia === 20)!.tipo).toBe("feriado");
    expect(r.dias.find((d) => d.dia === 2)!.tipo).toBe("feriado");
    expect(r.diasTrabalho).toBe(19);
    expect(r.minutosMes).toBe(19 * 8 * 60);
    expect(r.minutosSemana).toBe(40 * 60);
    expect(r.avisos.some((a) => a.includes("domingo"))).toBe(false);
  });
  it("6x1 em dezembro de 2026 avisa o fim da 6x1 e o novo teto", () => {
    const r = montarEscala({ competencia: "2026-12", modo: "semanal", folgas: [0], horario: { entrada: "08:00", saida: "16:20", intervalo: 60 } });
    expect(r.minutosSemana).toBe(44 * 60);
    expect(r.avisos.some((a) => a.includes("16/12/2026"))).toBe(true);
    expect(r.avisos.some((a) => a.includes("limite de 40 horas a partir de 16/12/2026"))).toBe(true);
  });
  it("com acordo, 42h valem na transição", () => {
    const r = montarEscala({ competencia: "2027-03", modo: "semanal", folgas: [0, 6], acordo42h: true, horario: { entrada: "08:00", saida: "17:24", intervalo: 60 } });
    expect(r.minutosSemana).toBe(42 * 60);
    expect(r.avisos.some((a) => a.includes("acima do limite"))).toBe(false);
    expect(r.avisos.some((a) => a.includes("acordo de compensação"))).toBe(true);
  });
  it("12x36 alterna a partir da referência e trabalha feriado", () => {
    const r = montarEscala({ competencia: "2026-11", modo: "12x36", folgas: [], inicio12x36: "2026-10-31", horario: { entrada: "19:00", saida: "07:00", intervalo: 60 } });
    expect(r.dias[0].tipo).toBe("folga");
    expect(r.dias[1].tipo).toBe("trabalho");
    expect(r.dias.find((d) => d.dia === 2)!.feriado).toBe("Finados");
    expect(r.diasTrabalho).toBe(15);
    expect(minutosDoHorario({ entrada: "19:00", saida: "07:00", intervalo: 60 })).toBe(660);
  });
  it("Sexta-feira Santa de 2027", () => {
    expect(feriadosComNome(2027).get("2027-03-26")).toBe("Sexta-feira Santa");
  });
  it("intervalo curto gera aviso", () => {
    const r = montarEscala({ competencia: "2026-11", modo: "semanal", folgas: [0, 6], horario: { entrada: "08:00", saida: "16:30", intervalo: 30 } });
    expect(r.avisos.some((a) => a.includes("art. 71"))).toBe(true);
  });
});
