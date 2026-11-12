import { describe, expect, it } from "vitest";
import { calcularFGTS, estimarSaldo } from "../src/lib/trabalhista/fgts";
import { corrigirValor } from "../src/lib/financeiro/correcao";
import { calcularBoleto, proximoDiaUtil } from "../src/lib/financeiro/boleto";
import indices from "../src/data/indices.json";

describe("FGTS", () => {
  it("sem justa causa, saque-rescisão: saca o saldo e recebe 40%", () => {
    const r = calcularFGTS({ saida: "sem_justa_causa", modalidade: "rescisao", saldo: 10000 });
    expect([r.multa, r.saqueSaldo, r.retido, r.totalAgora]).toEqual([4000, 10000, 0, 14000]);
  });
  it("acordo: 20% de multa e 80% do saldo", () => {
    const r = calcularFGTS({ saida: "acordo", modalidade: "rescisao", saldo: 10000 });
    expect([r.multa, r.saqueSaldo, r.retido, r.totalAgora]).toEqual([2000, 8000, 2000, 10000]);
  });
  it("saque-aniversário: só a multa, saldo retido", () => {
    const r = calcularFGTS({ saida: "sem_justa_causa", modalidade: "aniversario", saldo: 10000 });
    expect([r.multa, r.saqueSaldo, r.retido, r.totalAgora]).toEqual([4000, 0, 10000, 4000]);
  });
  it("pedido de demissão: nada agora", () => {
    const r = calcularFGTS({ saida: "pedido_demissao", modalidade: "rescisao", saldo: 10000 });
    expect(r.totalAgora).toBe(0);
    expect(r.retido).toBe(10000);
  });
  it("fim de contrato a termo: saca o saldo sem multa", () => {
    const r = calcularFGTS({ saida: "termino_contrato", modalidade: "rescisao", saldo: 3000 });
    expect([r.multa, r.saqueSaldo]).toEqual([0, 3000]);
  });
  it("estimativa: 8% de salário + 13º + 1/3 de férias", () => {
    expect(estimarSaldo(3000, 12)).toBe(3200);
    const r = calcularFGTS({ saida: "sem_justa_causa", modalidade: "rescisao", salario: 3000, meses: 12 });
    expect(r.saldoEstimado).toBe(true);
    expect(r.multa).toBe(1280);
  });
});

describe("correção monetária", () => {
  it("IPCA de 2025 (jan a dez) dá cerca de 4,26%", () => {
    const r = corrigirValor({ valor: 1000, serie: indices.series.ipca, de: "2025-01", ate: "2025-12" })!;
    expect(r.meses).toBe(12);
    expect(r.acumulado.percentual).toBeCloseTo(0.0426, 3);
    expect(r.corrigido).toBeCloseTo(1042.6, 0);
  });
  it("juros simples de 1% ao mês sobre o valor corrigido", () => {
    const r = corrigirValor({ valor: 1000, serie: indices.series.ipca, de: "2025-01", ate: "2025-12", jurosMes: 0.01 })!;
    expect(r.juros).toBeCloseTo(r.corrigido * 0.12, 1);
  });
  it("período invertido não calcula", () => {
    expect(corrigirValor({ valor: 1000, serie: indices.series.ipca, de: "2025-12", ate: "2025-01" })).toBeNull();
  });
});

describe("boleto atrasado", () => {
  it("R$ 1.200 com 48 dias de atraso, 2% + 1% ao mês = 3,60%", () => {
    const r = calcularBoleto({ valor: 1200, vencimento: "2026-09-01", pagamento: "2026-10-19", multa: 0.02, jurosMes: 0.01 });
    expect(r.dias).toBe(48);
    expect(r.multa).toBe(24);
    expect(r.juros).toBe(19.2);
    expect(r.total).toBe(1243.2);
  });
  it("vencimento no sábado passa para segunda, sem encargos se pago na segunda", () => {
    expect(proximoDiaUtil("2026-11-14")).toBe("2026-11-16");
    const r = calcularBoleto({ valor: 500, vencimento: "2026-11-14", pagamento: "2026-11-16", multa: 0.02, jurosMes: 0.01 });
    expect(r.prorrogado).toBe(true);
    expect(r.total).toBe(500);
  });
  it("feriado: vencimento em 20/11 (sexta) vai para 23/11", () => {
    expect(proximoDiaUtil("2026-11-20")).toBe("2026-11-23");
  });
  it("avisa multa acima de 2%", () => {
    expect(calcularBoleto({ valor: 100, vencimento: "2026-11-03", pagamento: "2026-11-10", multa: 0.1, jurosMes: 0.01 }).acimaDoLimite).toBe(true);
  });
});
