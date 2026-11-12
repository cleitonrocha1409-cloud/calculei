import { describe, expect, it } from "vitest";
import { brutoParaLiquido, calcularSalarioLiquido } from "../src/lib/trabalhista/salario";
import { calcularFerias } from "../src/lib/trabalhista/ferias";
import { calcularDecimoTerceiro } from "../src/lib/trabalhista/decimo-terceiro";

const d = (lista: { id: string; valor: number }[], id: string) => lista.find((l) => l.id === id)?.valor ?? 0;

describe("salário líquido", () => {
  it("R$ 3.000: INSS 248,60, IR zero, líquido 2.751,40", () => {
    const r = calcularSalarioLiquido({ bruto: 3000 });
    expect(d(r.descontos, "inss")).toBe(248.6);
    expect(d(r.descontos, "irrf")).toBe(0);
    expect(r.liquido).toBe(2751.4);
  });
  it("R$ 6.000: IR 564,85 − redução 179,75 = 385,10", () => {
    const r = calcularSalarioLiquido({ bruto: 6000 });
    expect(d(r.descontos, "inss")).toBe(641.51);
    expect(d(r.descontos, "irrf")).toBe(385.1);
    expect(r.liquido).toBe(4973.39);
  });
  it("vale-transporte limitado ao custo", () => {
    const r = calcularSalarioLiquido({ bruto: 3000, valeTransporte: true, custoVT: 120 });
    expect(d(r.descontos, "vt")).toBe(120);
    expect(d(calcularSalarioLiquido({ bruto: 3000, valeTransporte: true }).descontos, "vt")).toBe(180);
  });
  it("cálculo reverso: líquido 2.751,40 pede bruto de ~R$ 3.000", () => {
    const b = brutoParaLiquido(2751.4);
    expect(Math.abs(b - 3000)).toBeLessThan(0.02);
    expect(calcularSalarioLiquido({ bruto: b }).liquido).toBeGreaterThanOrEqual(2751.4);
  });
});

describe("férias", () => {
  it("30 dias de R$ 3.000: 3.000 + 1.000; INSS 368,60; IR zero", () => {
    const r = calcularFerias({ salario: 3000, dias: 30 });
    expect(d(r.proventos, "ferias")).toBe(3000);
    expect(d(r.proventos, "terco")).toBe(1000);
    expect(d(r.descontos, "inss")).toBe(368.6);
    expect(d(r.descontos, "irrf")).toBe(0);
    expect(r.liquido).toBe(3631.4);
  });
  it("20 dias + venda de 10: abono isento", () => {
    const r = calcularFerias({ salario: 3000, dias: 20, venderDias: true });
    expect(d(r.proventos, "ferias")).toBe(2000);
    expect(d(r.proventos, "abono")).toBe(1000);
    expect(d(r.proventos, "terco-abono")).toBe(333.33);
  });
  it("não deixa vender com mais de 20 dias", () => expect(() => calcularFerias({ salario: 3000, dias: 30, venderDias: true })).toThrow());
});

describe("13º salário", () => {
  it("ano inteiro, R$ 3.000", () => {
    const r = calcularDecimoTerceiro({ salario: 3000, ano: 2026 });
    expect(r.total).toBe(3000);
    expect(r.primeira).toBe(1500);
    expect(r.segunda.liquido).toBe(1251.4);
  });
  it("admissão em 17/03: 10 avos", () => {
    const r = calcularDecimoTerceiro({ salario: 3000, ano: 2026, admissao: "2026-03-17" });
    expect(r.avos).toBe(10);
    expect(r.total).toBe(2500);
  });
});
