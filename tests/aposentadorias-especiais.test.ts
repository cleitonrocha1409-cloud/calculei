import { describe, expect, it } from "vitest";
import { coeficientePcDIdade, simularPcD, simularRural } from "../src/lib/previdencia/especiais";
import { lerData } from "../src/lib/datas";

const hoje = lerData("2026-11-14");
const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

describe("pessoa com deficiência (LC 142/2013)", () => {
  it("coeficiente por idade: 70% + 1% por ano, até 100%", () => {
    expect(coeficientePcDIdade(15 * 12)).toBe(0.85);
    expect(coeficientePcDIdade(40 * 12)).toBe(1);
  });
  it("mulher com deficiência grave e 20 anos de contribuição já se aposenta por tempo, com 100% da média", () => {
    const r = simularPcD({ sexo: "f", nascimento: lerData("1980-05-10"), hoje, tempoHoje: 20 * 12, continua: true, grau: "grave", media: 3000 });
    expect(r.melhor!.id).toBe("pcdTempo");
    expect(r.melhor!.jaCumpre).toBe(true);
    expect(r.melhor!.valor).toBe(3000);
  });
  it("homem com deficiência leve, 55 anos e 20 anos: por idade aos 60 (90% da média) antes de 33 anos de contribuição", () => {
    const r = simularPcD({ sexo: "m", nascimento: lerData("1971-11-14"), hoje, tempoHoje: 20 * 12, continua: true, grau: "leve", media: 4000 });
    expect(iso(r.melhor!.data)).toBe("2031-11-14");
    expect(r.melhor!.id).toBe("pcdIdade");
    expect(r.melhor!.coeficiente).toBe(0.95);
    expect(r.melhor!.valor).toBe(3800);
  });
});

describe("trabalhador rural (Lei 8.213, art. 48)", () => {
  it("segurada especial de 55 anos com 15 anos de roça recebe 1 salário mínimo", () => {
    const r = simularRural({ sexo: "f", nascimento: lerData("1971-01-01"), hoje, tempoHoje: 15 * 12, continua: true, tipo: "especial" });
    expect(r.melhor!.jaCumpre).toBe(true);
    expect(r.melhor!.valor).toBe(1621);
  });
  it("empregado rural de 58 anos com 25 anos: aos 60, com 26 anos, 72% da média", () => {
    const r = simularRural({ sexo: "m", nascimento: lerData("1968-06-01"), hoje, tempoHoje: 25 * 12, continua: true, tipo: "empregado", media: 3000 });
    expect(iso(r.melhor!.data)).toBe("2028-06-14");
    expect(r.melhor!.coeficiente).toBe(0.72);
    expect(r.melhor!.valor).toBe(2160);
  });
});
