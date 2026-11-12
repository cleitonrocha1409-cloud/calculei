import { describe, expect, it } from "vitest";
import { calcularINSS, calcularIRRF } from "../src/lib/trabalhista/impostos";
import { calcularRescisao, compararTipos } from "../src/lib/trabalhista/rescisao";
import { avosDecimoTerceiro, avosFerias, anosCompletos, lerData } from "../src/lib/datas";

const v = (r: ReturnType<typeof calcularRescisao>, id: string) =>
  [...r.proventos, ...r.descontos].find((l) => l.id === id)?.valor ?? 0;

describe("INSS 2026", () => {
  it("salário mínimo paga 7,5%", () => expect(calcularINSS(1621)).toBe(121.58));
  it("R$ 3.000 = R$ 248,59 (conferido com a parcela a deduzir)", () =>
    expect(Math.abs(calcularINSS(3000) - (3000 * 0.12 - 111.41))).toBeLessThan(0.02));
  it("teto R$ 988,09", () => expect(Math.abs(calcularINSS(20000) - 988.09)).toBeLessThan(0.02));
});

describe("IRRF 2026", () => {
  it("até R$ 5.000 o imposto é zero", () => expect(calcularIRRF(5000, calcularINSS(5000), 0).imposto).toBe(0));
  it("R$ 6.000: redução = 978,62 − 0,133145 × 6.000 = 179,75", () => {
    const r = calcularIRRF(6000, calcularINSS(6000), 0);
    expect(r.reducao).toBe(179.75);
  });
  it("acima de R$ 7.350 não há redução", () => expect(calcularIRRF(8000, calcularINSS(8000), 0).reducao).toBe(0));
});

describe("datas", () => {
  it("anos completos", () => {
    expect(anosCompletos(lerData("2023-03-10"), lerData("2026-03-09"))).toBe(2);
    expect(anosCompletos(lerData("2023-03-10"), lerData("2026-03-10"))).toBe(3);
  });
  it("avos de 13º contam meses com 15+ dias", () => {
    expect(avosDecimoTerceiro(lerData("2020-01-01"), lerData("2026-12-20"))).toBe(12);
    expect(avosDecimoTerceiro(lerData("2020-01-01"), lerData("2026-12-14"))).toBe(11);
    expect(avosDecimoTerceiro(lerData("2026-03-17"), lerData("2026-06-30"))).toBe(4); // março tem 15 dias
    expect(avosDecimoTerceiro(lerData("2026-03-18"), lerData("2026-06-30"))).toBe(3); // março tem 14 dias, não conta
  });
  it("avos de férias pelo período aquisitivo", () => {
    expect(avosFerias(lerData("2023-03-10"), lerData("2026-12-20"))).toBe(9);
    expect(avosFerias(lerData("2023-03-10"), lerData("2026-12-24"))).toBe(10);
  });
});

describe("rescisão — sem justa causa, aviso indenizado", () => {
  const r = calcularRescisao({
    tipo: "sem_justa_causa",
    salario: 3000,
    admissao: "2023-03-10",
    saida: "2026-11-11",
    aviso: "indenizado",
  });
  it("aviso de 39 dias (30 + 3 × 3 anos) projeta até 20/12/2026", () => {
    expect(r.info.diasAviso).toBe(39);
    expect(r.info.dataProjetada).toBe("2026-12-20");
  });
  it("verbas", () => {
    expect(v(r, "saldo")).toBe(1100);
    expect(v(r, "aviso")).toBe(3900);
    expect(v(r, "13")).toBe(3000);
    expect(v(r, "ferias-prop")).toBe(2250);
    expect(v(r, "terco-prop")).toBe(750);
    expect(v(r, "inss-saldo")).toBe(82.5);
    expect(v(r, "ir-13")).toBe(0);
  });
  it("líquido fecha com proventos − descontos", () => expect(r.liquido).toBeCloseTo(r.totalProventos - r.totalDescontos, 2));
  it("multa de 40% e saque integral", () => {
    expect(r.fgts.percentualMulta).toBe(0.4);
    expect(r.fgts.saque).toBe("integral");
  });
});

describe("rescisão — outros tipos", () => {
  const base = { salario: 3000, admissao: "2023-03-10", saida: "2026-11-11" } as const;
  it("acordo paga metade do aviso (19 dias) e multa de 20%", () => {
    const r = calcularRescisao({ ...base, tipo: "acordo", aviso: "indenizado" });
    expect(r.info.diasAvisoProjetados).toBe(19);
    expect(v(r, "aviso")).toBe(1900);
    expect(r.fgts.percentualMulta).toBe(0.2);
    expect(r.seguroDesemprego).toBe(false);
  });
  it("pedido de demissão sem cumprir aviso desconta 30 dias e não projeta", () => {
    const r = calcularRescisao({ ...base, tipo: "pedido_demissao", aviso: "nao_cumprido" });
    expect(v(r, "aviso-desconto")).toBe(3000);
    expect(r.info.dataProjetada).toBe("2026-11-11");
    expect(r.fgts.saque).toBe("nao");
  });
  it("justa causa paga só saldo e férias vencidas", () => {
    const r = calcularRescisao({ ...base, tipo: "justa_causa", periodosFeriasVencidas: 1 });
    expect(r.proventos.map((l) => l.id)).toEqual(["saldo", "ferias-vencidas", "terco-vencidas"]);
  });
  it("comparação retorna os 5 tipos", () => expect(compararTipos({ ...base, tipo: "sem_justa_causa" })).toHaveLength(5));
  it("rejeita saída antes da admissão", () =>
    expect(() => calcularRescisao({ ...base, tipo: "acordo", saida: "2020-01-01" })).toThrow());
});
