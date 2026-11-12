import { describe, expect, it } from "vitest";
import { idadeProgressivaNoAno, pontosNoAno } from "../src/data/previdencia";
import { coeficiente, mesesCompletos, simularAposentadoria, valorBeneficio, valorEsperando } from "../src/lib/previdencia/aposentadoria";
import { lerData } from "../src/lib/datas";

const hoje = lerData("2026-11-12");
const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
const regra = (r: ReturnType<typeof simularAposentadoria>, id: string) => r.regras.find((x) => x.id === id)!;

describe("tabelas da EC 103", () => {
  it("pontos: 93/103 em 2026, 94/104 em 2027, teto 100/105", () => {
    expect([pontosNoAno(2026, "f"), pontosNoAno(2026, "m")]).toEqual([93, 103]);
    expect([pontosNoAno(2027, "f"), pontosNoAno(2027, "m")]).toEqual([94, 104]);
    expect([pontosNoAno(2040, "f"), pontosNoAno(2040, "m")]).toEqual([100, 105]);
  });
  it("idade progressiva: 59a6m/64a6m em 2026, 60/65 em 2027, teto 62/65", () => {
    expect([idadeProgressivaNoAno(2026, "f"), idadeProgressivaNoAno(2026, "m")]).toEqual([714, 774]);
    expect([idadeProgressivaNoAno(2027, "f"), idadeProgressivaNoAno(2027, "m")]).toEqual([720, 780]);
    expect([idadeProgressivaNoAno(2035, "f"), idadeProgressivaNoAno(2035, "m")]).toEqual([744, 780]);
  });
  it("coeficiente: 60% + 2% por ano acima de 15 (mulher) ou 20 (homem)", () => {
    expect(coeficiente(31 * 12, "f")).toBe(0.92);
    expect(coeficiente(35 * 12 + 11, "m")).toBe(0.9);
    expect(coeficiente(40 * 12, "f")).toBe(1.1);
    expect(coeficiente(10 * 12, "m")).toBe(0.6);
  });
  it("valor fica entre o salário mínimo e o teto", () => {
    expect(valorBeneficio(1000, 0.6)).toBe(1621);
    expect(valorBeneficio(20000, 1.1)).toBe(8475.55);
    expect(valorBeneficio(4000, 0.92)).toBe(3680);
  });
  it("meses completos", () => {
    expect(mesesCompletos(lerData("1967-03-10"), hoje)).toBe(59 * 12 + 8);
    expect(mesesCompletos(lerData("1967-11-13"), hoje)).toBe(58 * 12 + 11);
  });
});

describe("simulação", () => {
  it("mulher de 59a8m com 31 anos de contribuição já cumpre a idade progressiva", () => {
    const r = simularAposentadoria({ sexo: "f", nascimento: lerData("1967-03-10"), hoje, tempoHoje: 31 * 12, contribuindo: true, media: 4000 });
    const ip = regra(r, "idadeProgressiva");
    expect(ip.jaCumpre).toBe(true);
    expect(ip.valor).toBe(3680); // 92% de 4.000
    expect(r.melhor?.id).toBe("idadeProgressiva");
    // pontos: hoje 59a8m + 31a = 90,67; sobe 2 por ano e a exigência 1 → alcança em 2029
    expect(regra(r, "pontos").data!.getUTCFullYear()).toBe(2029);
    // em 13/11/2019 tinha cerca de 24 anos: faltavam mais de 2 → sem pedágio de 50%
    expect(regra(r, "pedagio50").aplica).toBe(false);
  });

  it("homem de 56 anos com 30 de contribuição: idade aos 65 e pedágio de 100% muito longe", () => {
    const r = simularAposentadoria({ sexo: "m", nascimento: lerData("1970-01-01"), hoje, tempoHoje: 30 * 12, contribuindo: true, media: 5000 });
    expect(iso(regra(r, "idade").data)).toBe("2035-01-12");
    expect(iso(regra(r, "idadeProgressiva").data)).toBe("2035-01-12");
    expect(regra(r, "pontos").data!.getUTCFullYear()).toBe(2035);
    expect(regra(r, "pedagio100").data!.getUTCFullYear()).toBeGreaterThan(2040);
    expect(regra(r, "idade").valor).toBe(4800); // 30 anos hoje + 8a2m = 38 anos completos → 60% + 2% × 18 = 96%
  });

  it("quem tinha 34 anos de contribuição em 2019 tem pedágio de 50% (e já cumpre)", () => {
    const r = simularAposentadoria({ sexo: "m", nascimento: lerData("1966-05-20"), hoje, tempoHoje: 41 * 12, tempo2019: 34 * 12, contribuindo: false, media: 6000 });
    const p50 = regra(r, "pedagio50");
    expect(p50.aplica).toBe(true);
    expect(p50.jaCumpre).toBe(true);
    expect(p50.valor).toBeUndefined();
  });

  it("novo segurado (começou depois da reforma) só tem a regra geral: 65 anos e 20 de contribuição", () => {
    const r = simularAposentadoria({ sexo: "m", nascimento: lerData("1995-06-01"), hoje, tempoHoje: 5 * 12, tempo2019: 0, contribuindo: true, media: 3000 });
    expect(r.novoSegurado).toBe(true);
    expect(r.regras.filter((x) => x.aplica).map((x) => x.id)).toEqual(["idade"]);
    expect(iso(regra(r, "idade").data)).toBe("2060-06-12");
  });

  it("sem contribuir mais, avisa quando não alcança", () => {
    const r = simularAposentadoria({ sexo: "f", nascimento: lerData("1990-01-01"), hoje, tempoHoje: 10 * 12, contribuindo: false, media: 2000 });
    expect(regra(r, "idade").data).toBeNull();
    expect(regra(r, "idade").motivo).toMatch(/voltar a contribuir/);
  });

  it("esperar mais anos aumenta 2% por ano", () => {
    const r = simularAposentadoria({ sexo: "f", nascimento: lerData("1967-03-10"), hoje, tempoHoje: 31 * 12, contribuindo: true, media: 4000 });
    const v = valorEsperando(regra(r, "idadeProgressiva"), "f", 4000, 3);
    expect(v.map((x) => x.valor)).toEqual([3760, 3840, 3920]);
  });
});

import { lerValor } from "../src/lib/dinheiro";
describe("leitura de valores", () => {
  it("entende ponto de milhar sem vírgula", () => {
    expect(lerValor("5.000")).toBe(5000);
    expect(lerValor("1.250.000")).toBe(1250000);
    expect(lerValor("3.500,75")).toBe(3500.75);
    expect(lerValor("3500.75")).toBe(3500.75);
    expect(lerValor("2.5")).toBe(2.5);
  });
});
