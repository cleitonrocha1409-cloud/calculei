import { describe, expect, it } from "vitest";
import { reciboFerias, reciboProLabore, recibo13 } from "../src/lib/trabalhista/recibos";

describe("recibo de pró-labore", () => {
  it("desconta 11% de INSS e IRRF com dedução", () => {
    const r = reciboProLabore({ competencia: "2026-11", valor: 6000 }, "Novembro/2026");
    expect(r.linhas.find((l) => l.codigo === "201")!.desconto).toBe(660);
    const ir = r.linhas.find((l) => l.codigo === "202")!.desconto!;
    expect(ir).toBeGreaterThan(0);
    expect(r.liquido).toBeCloseTo(6000 - 660 - ir, 2);
  });
  it("limita o INSS ao teto e usa o mínimo como piso", () => {
    expect(reciboProLabore({ competencia: "2026-11", valor: 20000 }, "").linhas.find((l) => l.codigo === "201")!.desconto).toBe(932.31);
    expect(reciboProLabore({ competencia: "2026-11", valor: 1000 }, "").linhas.find((l) => l.codigo === "201")!.desconto).toBe(178.31);
  });
  it("pró-labore até R$ 5 mil fica isento de IR pela redução", () => {
    const r = reciboProLabore({ competencia: "2026-11", valor: 5000 }, "");
    expect(r.linhas.find((l) => l.codigo === "202")).toBeUndefined();
  });
});

describe("recibo de férias", () => {
  it("30 dias com 1/3, período e retorno", () => {
    const r = reciboFerias({ salario: 3000, inicioGozo: "2026-12-01", dias: 30 });
    expect(r.linhas.find((l) => l.codigo === "050")!.vencimento).toBe(3000);
    expect(r.linhas.find((l) => l.codigo === "051")!.vencimento).toBe(1000);
    expect(r.referencia).toContain("01/12/2026 a 30/12/2026");
    expect(r.referencia).toContain("Retorno: 31/12/2026");
  });
  it("abono e adiantamento do 13º sem descontos", () => {
    const r = reciboFerias({ salario: 3000, inicioGozo: "2026-12-01", dias: 20, venderDias: true, adiantar13: true });
    expect(r.linhas.find((l) => l.codigo === "052")!.vencimento).toBe(1000);
    expect(r.linhas.find((l) => l.codigo === "054")!.vencimento).toBe(1500);
    expect(r.bases.find((b) => b.rotulo === "Base INSS")!.valor).toBe("2.666,67");
  });
  it("avisa pagamento atrasado", () => {
    const r = reciboFerias({ salario: 3000, inicioGozo: "2026-12-10", dias: 30, pagamento: "2026-12-09" });
    expect(r.avisos.some((a) => a.includes("08/12/2026"))).toBe(true);
  });
});

describe("recibo de 13º", () => {
  it("1ª parcela é metade, sem descontos", () => {
    const r = recibo13({ parcela: 1, ano: 2026, salario: 3000 });
    expect(r.liquido).toBe(1500);
    expect(r.totalDescontos).toBe(0);
  });
  it("2ª parcela desconta INSS, IRRF e o adiantamento", () => {
    const r = recibo13({ parcela: 2, ano: 2026, salario: 3000, admissao: "2026-04-10" });
    expect(r.linhas.find((l) => l.codigo === "061")!.referencia).toBe("9/12");
    expect(r.linhas.find((l) => l.codigo === "061")!.vencimento).toBe(2250);
    expect(r.linhas.find((l) => l.codigo === "215")!.desconto).toBe(1125);
  });
  it("admissão de anos anteriores conta o ano inteiro", () => {
    expect(recibo13({ parcela: 2, ano: 2026, salario: 3000, admissao: "2019-04-10" }).linhas[0].referencia).toBe("12/12");
  });
});
