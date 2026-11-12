import { describe, expect, it } from "vitest";
import { calcularSeguro, numeroParcelas, valorParcela } from "../src/lib/trabalhista/seguro-desemprego";
import { acumulado12, calcularReajuste } from "../src/lib/aluguel/reajuste";
import { lerSGS } from "../src/lib/aluguel/indices";

describe("seguro-desemprego 2026", () => {
  it("faixa 1: R$ 2.000 × 0,8 = 1.600 → sobe ao piso de R$ 1.621", () => expect(valorParcela(2000).parcela).toBe(1621));
  it("faixa 1 acima do piso: R$ 2.200 × 0,8 = 1.760", () => expect(valorParcela(2200).parcela).toBe(1760));
  it("faixa 2: R$ 3.000 → (3.000 − 2.222,17) × 0,5 + 1.777,74 = 2.166,66", () => expect(valorParcela(3000).parcela).toBe(2166.66));
  it("fim da faixa 2 encontra o teto", () => expect(valorParcela(3703.99).parcela).toBe(2518.65));
  it("acima: teto", () => expect(valorParcela(8000).parcela).toBe(2518.65));
  it("parcelas: 1ª solicitação", () => {
    expect(numeroParcelas(1, 11, 11).parcelas).toBe(0);
    expect(numeroParcelas(1, 12, 12).parcelas).toBe(4);
    expect(numeroParcelas(1, 24, 18).parcelas).toBe(5);
  });
  it("parcelas: 2ª e 3ª solicitações", () => {
    expect(numeroParcelas(2, 9, 9).parcelas).toBe(3);
    expect(numeroParcelas(2, 12, 12).parcelas).toBe(4);
    expect(numeroParcelas(3, 6, 6).parcelas).toBe(3);
    expect(numeroParcelas(3, 5, 5).parcelas).toBe(0);
  });
  it("média dos 3 salários", () => {
    const r = calcularSeguro({ salarios: [3000, 3000, 3300], mesesTrabalhados: 30, solicitacao: 1, mesesUltimos: 18 });
    expect(r.media).toBe(3100);
    expect(r.parcelas).toBe(5);
  });
});

describe("reajuste de aluguel", () => {
  const serie = lerSGS(
    Array.from({ length: 14 }, (_, i) => {
      const d = new Date(Date.UTC(2025, 8 + i, 1)); // set/2025 a out/2026
      return { data: `01/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`, valor: "0.50" };
    }),
  );
  it("lê a série do Banco Central", () => {
    expect(serie[0]).toEqual({ mes: "2025-09", valor: 0.5 });
    expect(serie).toHaveLength(14);
  });
  it("reajuste em novembro usa nov/2025 a out/2026: 1,005^12 − 1", () => {
    const a = acumulado12(serie, "2026-11")!;
    expect(a.de).toBe("2025-11");
    expect(a.ate).toBe("2026-10");
    expect(a.aproximado).toBe(false);
    expect(a.percentual).toBeCloseTo(Math.pow(1.005, 12) - 1, 10);
  });
  it("mês ainda não divulgado usa o último disponível", () => {
    expect(acumulado12(serie, "2027-02")!.aproximado).toBe(true);
  });
  it("índice negativo pode ser travado em zero", () => {
    expect(calcularReajuste({ aluguel: 2000, percentual: -0.03, naoReduzir: true }).novo).toBe(2000);
    expect(calcularReajuste({ aluguel: 2000, percentual: -0.03 }).novo).toBe(1940);
    expect(calcularReajuste({ aluguel: 2000, percentual: 0.045 }).novo).toBe(2090);
  });
});

import { simularCbsIbs } from "../src/lib/reforma/cbs-ibs";
describe("CBS e IBS", () => {
  it("R$ 100 sem tributos em 2027, alíquota padrão: CBS 11,2% + IBS 0,1%", () => {
    const r = simularCbsIbs({ valor: 100, valorInformado: "sem", reducao: "padrao" });
    const a = r.find((x) => x.ano === 2027)!;
    expect(a.cbs).toBe(11.2);
    expect(a.ibs).toBe(0.1);
    expect(a.precoFinal).toBe(111.3);
  });
  it("2026 é teste: 0,9% + 0,1%", () => {
    const a = simularCbsIbs({ valor: 1000, valorInformado: "sem", reducao: "padrao" })[0];
    expect(a.cbs).toBe(9);
    expect(a.ibs).toBe(1);
  });
  it("redução de 60% e caminho inverso a partir do preço final", () => {
    const a = simularCbsIbs({ valor: 104.52, valorInformado: "com", reducao: "r60" }).find((x) => x.ano === 2027)!;
    expect(a.base).toBeCloseTo(100, 2);
    expect(a.cbs).toBeCloseTo(4.48, 2);
  });
  it("cesta básica: zero", () => {
    expect(simularCbsIbs({ valor: 50, valorInformado: "sem", reducao: "zero" })[1].total).toBe(0);
  });
});

import { acumuladoPeriodo, ultimos12, somarMeses } from "../src/lib/aluguel/reajuste";
describe("período escolhido pelo usuário", () => {
  const serie = [
    { mes: "2026-01", valor: 1 },
    { mes: "2026-02", valor: -0.5 },
    { mes: "2026-03", valor: 0.5 },
  ];
  it("acumula mês a mês, com juros compostos", () => {
    const a = acumuladoPeriodo(serie, "2026-01", "2026-03")!;
    expect(a.percentual).toBeCloseTo(1.01 * 0.995 * 1.005 - 1, 10);
    expect(a.meses).toHaveLength(3);
    expect(a.meses[1].acumulado).toBeCloseTo(1.01 * 0.995 - 1, 10);
  });
  it("aponta meses ainda não divulgados", () => {
    expect(acumuladoPeriodo(serie, "2026-02", "2026-05")!.faltando).toEqual(["2026-04", "2026-05"]);
  });
  it("período invertido é inválido", () => expect(acumuladoPeriodo(serie, "2026-03", "2026-01")).toBeNull());
  it("últimos 12 meses e soma de meses na virada do ano", () => {
    expect(somarMeses("2026-01", -1)).toBe("2025-12");
    expect(somarMeses("2025-12", 1)).toBe("2026-01");
    const s = Array.from({ length: 15 }, (_, i) => ({ mes: somarMeses("2025-08", i), valor: 0.2 }));
    expect(ultimos12(s)).toEqual({ de: "2025-11", ate: "2026-10" });
  });
});

import { mesclar } from "../src/lib/aluguel/indices";
import historico from "../src/data/indices.json";
describe("histórico guardado no site", () => {
  it("IGP-M nov/2025 a out/2026 bate com o publicado pela FGV (5,24%)", () => {
    const a = acumuladoPeriodo(historico.series.igpm, "2025-11", "2026-10")!;
    expect(Math.abs(a.percentual * 100 - 5.24)).toBeLessThan(0.02);
  });
  it("IPCA de 2025 bate com o IBGE (4,26%)", () => {
    const a = acumuladoPeriodo(historico.series.ipca, "2025-01", "2025-12")!;
    expect(Math.abs(a.percentual * 100 - 4.26)).toBeLessThan(0.02);
  });
  it("mescla meses novos sem perder o histórico", () => {
    const r = mesclar({ ipca: [{ mes: "2026-09", valor: 0.82 }] }, { ipca: [{ mes: "2026-10", valor: 0.2 }] });
    expect(r.ipca).toEqual([{ mes: "2026-09", valor: 0.82 }, { mes: "2026-10", valor: 0.2 }]);
  });
});
