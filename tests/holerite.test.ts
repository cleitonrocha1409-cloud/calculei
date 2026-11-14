import { describe, expect, it } from "vitest";
import { calcularHolerite, diasDoMes, feriadosNacionais } from "../src/lib/trabalhista/holerite";

const linha = (r: ReturnType<typeof calcularHolerite>, cod: string) => r.linhas.find((l) => l.codigo === cod);

describe("calendário da folha", () => {
  it("feriados nacionais de 2026 incluem a Sexta-feira Santa (3/4) e não o Carnaval", () => {
    const f = feriadosNacionais(2026);
    expect(f).toContain("2026-04-03");
    expect(f).toContain("2026-11-20");
    expect(f).not.toContain("2026-02-17");
  });
  it("novembro de 2026: 23 dias úteis e 7 de descanso no 6x1; 5x2 tira os sábados", () => {
    expect(diasDoMes("2026-11", "6x1")).toEqual({ uteis: 23, descanso: 7, total: 30 });
    expect(diasDoMes("2026-11", "5x2").uteis).toBe(19);
  });
});

describe("holerite", () => {
  it("salário de R$ 3.000 com 10 horas extras de 50% em novembro/2026 (44h, 6x1)", () => {
    const r = calcularHolerite({ competencia: "2026-11", salarioBase: 3000, jornadaSemanal: 44, escala: "6x1", horasExtras50: 10 });
    expect(linha(r, "010")!.vencimento).toBe(204.55);
    expect(linha(r, "021")!.vencimento).toBe(62.25);
    expect(r.baseINSS).toBe(3266.8);
    expect(r.inss).toBe(280.62);
    expect(r.irrf).toBe(0);
    expect(r.fgts).toBe(261.34);
    expect(r.liquido).toBe(2986.18);
  });
  it("na jornada de 40 horas o divisor cai para 200 e a hora extra sobe", () => {
    const r = calcularHolerite({ competencia: "2026-12", salarioBase: 3000, jornadaSemanal: 40, escala: "5x2", horasExtras50: 10 });
    expect(r.valorHora).toBe(15);
    expect(linha(r, "010")!.vencimento).toBe(225);
  });
  it("faltas e DSR perdido reduzem a base; vale-transporte desconta até 6%", () => {
    const r = calcularHolerite({ competencia: "2026-11", salarioBase: 3000, jornadaSemanal: 44, escala: "6x1", faltas: 1, dsrDescontados: 1, valeTransporte: 400 });
    expect(linha(r, "101")!.desconto).toBe(100);
    expect(linha(r, "102")!.desconto).toBe(100);
    expect(r.baseINSS).toBe(2800);
    expect(linha(r, "210")!.desconto).toBe(180);
  });
  it("salário-família para quem ganha até R$ 1.980,38; sai da base do INSS", () => {
    const r = calcularHolerite({ competencia: "2026-11", salarioBase: 1800, jornadaSemanal: 44, escala: "6x1", filhosSalarioFamilia: 2 });
    expect(linha(r, "040")!.vencimento).toBe(135.08);
    expect(r.baseINSS).toBe(1800);
  });
  it("salário de R$ 9.000 com dependente paga IR pela tabela, sem redução", () => {
    const r = calcularHolerite({ competencia: "2026-11", salarioBase: 9000, jornadaSemanal: 44, escala: "6x1", dependentesIR: 1 });
    expect(r.inss).toBe(988.09);
    // base = 9000 − 988,09 − 189,59 = 7822,32 → 27,5% − 908,73 = 1242,41
    expect(r.irrf).toBe(1242.41);
    expect(r.faixaIRRF).toBe("27,5%");
  });
  it("periculosidade entra na base da hora extra", () => {
    const r = calcularHolerite({ competencia: "2026-11", salarioBase: 2200, jornadaSemanal: 44, escala: "6x1", periculosidade: true, horasExtras50: 10 });
    expect(linha(r, "005")!.vencimento).toBe(660);
    expect(r.valorHora).toBe(13);
    expect(linha(r, "010")!.vencimento).toBe(195);
  });
});
