import { describe, expect, it } from "vitest";
import { CALENDARIOS, FERIADOS } from "../src/data/calendarios";
import { datasBolsa, datasINSS, dataPIS, diasAte, gerarICS, proximos, dataCurta } from "../src/lib/calendario/pagamentos";

const diaUtil = (iso: string) => {
  const d = new Date(iso + "T12:00:00Z").getUTCDay();
  return d !== 0 && d !== 6 && !FERIADOS.includes(iso);
};

describe("tabelas oficiais", () => {
  const todas = [
    ...Object.values(CALENDARIOS.inss[2026]).flat(),
    ...Object.values(CALENDARIOS.bolsa[2026]).flat(),
    ...Object.values(CALENDARIOS.pis[2026]),
    ...Object.values(CALENDARIOS.pis[2027]),
  ];
  it("nenhuma data cai em fim de semana ou feriado", () => {
    // Exceção conhecida: o PIS de nascidos em janeiro saiu na segunda de Carnaval (16/02/2026), conforme o MTE.
    expect(todas.filter((d) => !diaUtil(d) && d !== "2026-02-16")).toEqual([]);
  });
  it("cada mês tem 10 datas em ordem crescente", () => {
    for (const t of [CALENDARIOS.inss[2026], CALENDARIOS.bolsa[2026]])
      for (const datas of Object.values(t)) {
        expect(datas).toHaveLength(10);
        expect([...datas].sort()).toEqual(datas);
      }
  });
});

describe("INSS", () => {
  it("final 1 até o piso, novembro: 24/11", () => {
    expect(datasINSS(1, "piso")[10]).toEqual({ rotulo: "Benefício de novembro", data: "2026-11-24" });
  });
  it("acima do piso paga em pares: final 1 e 6 em 01/12", () => {
    expect(datasINSS(1, "acima")[10].data).toBe("2026-12-01");
    expect(datasINSS(6, "acima")[10].data).toBe("2026-12-01");
    expect(datasINSS(6, "piso")[10].data).toBe("2026-12-01");
  });
  it("final 0 de dezembro cai em janeiro de 2027", () => {
    expect(datasINSS(0, "piso")[11].data).toBe("2027-01-08");
  });
  it("abril corrigido: final 2 em 27/04 e final 6 em 04/05", () => {
    expect(datasINSS(2, "piso")[3].data).toBe("2026-04-27");
    expect(datasINSS(6, "piso")[3].data).toBe("2026-05-04");
  });
});

describe("Bolsa Família e PIS", () => {
  it("calendário extraordinário (El Niño): finais 3 a 0 juntos em 18/11 e 14/12", () => {
    expect(datasBolsa(0)[10].data).toBe("2026-11-18");
    expect(datasBolsa(3)[11].data).toBe("2026-12-14");
    expect(datasBolsa(2)[11].data).toBe("2026-12-11");
  });
  it("PIS: nascidos em novembro, 17/08/2026", () => {
    expect(dataPIS(11, 2026)).toBe("2026-08-17");
  });
});

describe("utilitários", () => {
  it("próximos pagamentos a partir de hoje", () => {
    const p = proximos(datasINSS(3, "piso"), "2026-11-12", 2);
    expect(p.map((x) => x.data)).toEqual(["2026-11-26", "2026-12-28"]);
  });
  it("dias até e data curta", () => {
    expect(diasAte("2026-11-12", "2026-11-24")).toBe(12);
    expect(dataCurta("2026-11-24")).toBe("24/11 (terça)");
  });
  it("arquivo .ics com evento de dia inteiro e aviso", () => {
    const ics = gerarICS([{ rotulo: "Benefício de novembro", data: "2026-11-24" }], "INSS", "Final 1", "https://calculei.com.br/x/");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261124");
    expect(ics).toContain("DTEND;VALUE=DATE:20261125");
    expect(ics).toContain("TRIGGER:PT8H");
    expect(ics.split("\r\n").filter((l) => l === "BEGIN:VEVENT")).toHaveLength(1);
  });
});
