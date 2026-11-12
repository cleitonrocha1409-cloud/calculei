// Calendários oficiais de pagamento. Atualizar uma vez por ano, quando o governo publica o do ano seguinte.
// Datas conferidas em 12/11/2026: nenhuma cai em fim de semana ou feriado nacional (ver tests/calendarios.test.ts).

/** Mês de competência (1–12) → dias de pagamento por final 1,2,…,9,0. Dia < 10 = mês seguinte. */
type Tabela = Record<number, number[]>;

function expandir(ano: number, t: Tabela, viraMes = true): Record<number, string[]> {
  const out: Record<number, string[]> = {};
  for (const [m, dias] of Object.entries(t)) {
    const mes = Number(m);
    out[mes] = dias.map((d) => {
      let a = ano;
      let mm = mes;
      if (viraMes && d < 10) mm += 1;
      if (mm === 13) {
        mm = 1;
        a += 1;
      }
      return `${a}-${String(mm).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    });
  }
  return out;
}

// INSS 2026, benefícios de até 1 salário mínimo. Índice 0 = final 1 … índice 9 = final 0.
// Fonte: Tabela de Pagamento de Benefícios 2026 do INSS. Abril corrigido pelas notícias oficiais (27/4 e 4/5).
const INSS_2026_PISO: Tabela = {
  1: [26, 27, 28, 29, 30, 2, 3, 4, 5, 6],
  2: [23, 24, 25, 26, 27, 2, 3, 4, 5, 6],
  3: [25, 26, 27, 30, 31, 1, 2, 6, 7, 8],
  4: [24, 27, 28, 29, 30, 4, 5, 6, 7, 8],
  5: [25, 26, 27, 28, 29, 1, 2, 3, 5, 8],
  6: [24, 25, 26, 29, 30, 1, 2, 3, 6, 7],
  7: [27, 28, 29, 30, 31, 3, 4, 5, 6, 7],
  8: [25, 26, 27, 28, 31, 1, 2, 3, 4, 8],
  9: [24, 25, 28, 29, 30, 1, 2, 5, 6, 7],
  10: [26, 27, 28, 29, 30, 3, 4, 5, 6, 9],
  11: [24, 25, 26, 27, 30, 1, 2, 3, 4, 7],
  12: [22, 23, 28, 29, 30, 4, 5, 6, 7, 8],
};

// Bolsa Família 2026, por final do NIS (índice 0 = final 1). Fonte: calendário do MDS.
const BOLSA_2026: Tabela = {
  1: [19, 20, 21, 22, 23, 26, 27, 28, 29, 30],
  2: [12, 13, 18, 19, 20, 23, 24, 25, 26, 27],
  3: [18, 19, 20, 23, 24, 25, 26, 27, 30, 31],
  4: [16, 17, 20, 22, 23, 24, 27, 28, 29, 30],
  5: [18, 19, 20, 21, 22, 25, 26, 27, 28, 29],
  6: [17, 18, 19, 22, 23, 24, 25, 26, 29, 30],
  7: [20, 21, 22, 23, 24, 27, 28, 29, 30, 31],
  8: [18, 19, 20, 21, 24, 25, 26, 27, 28, 31],
  9: [17, 18, 21, 22, 23, 24, 25, 28, 29, 30],
  10: [19, 20, 21, 22, 23, 26, 27, 28, 29, 30],
  11: [16, 17, 18, 19, 23, 24, 25, 26, 27, 30],
  12: [10, 11, 14, 15, 16, 17, 18, 21, 22, 23],
};

export const CALENDARIOS = {
  atualizadoEm: "2026-11-12",
  inss: {
    2026: expandir(2026, INSS_2026_PISO),
    fonte: "Tabela de Pagamento de Benefícios 2026, INSS",
    fonteUrl: "https://www.gov.br/inss/pt-br",
  },
  bolsa: {
    2026: expandir(2026, BOLSA_2026, false),
    fonte: "Calendário de pagamentos 2026, Ministério do Desenvolvimento e Assistência Social (MDS)",
    fonteUrl: "https://www.gov.br/mds/pt-br",
  },
  pis: {
    // Mês de nascimento (1–12) → data de liberação. Regra fixa do Codefat: dia 15 ou o dia útil seguinte.
    2026: { 1: "2026-02-16", 2: "2026-03-16", 3: "2026-04-15", 4: "2026-04-15", 5: "2026-05-15", 6: "2026-05-15", 7: "2026-06-15", 8: "2026-06-15", 9: "2026-07-15", 10: "2026-07-15", 11: "2026-08-17", 12: "2026-08-17" } as Record<number, string>,
    prazo2026: "2026-12-30",
    // Projeção pela mesma regra (ano-base 2025). Confirmar quando o Codefat publicar.
    2027: { 1: "2027-02-15", 2: "2027-03-15", 3: "2027-04-15", 4: "2027-04-15", 5: "2027-05-17", 6: "2027-05-17", 7: "2027-06-15", 8: "2027-06-15", 9: "2027-07-15", 10: "2027-07-15", 11: "2027-08-16", 12: "2027-08-16" } as Record<number, string>,
    fonte: "Resolução do Codefat sobre o calendário do abono salarial",
    fonteUrl: "https://www.gov.br/trabalho-e-emprego/pt-br",
  },
};

/** Feriados nacionais usados para conferir as datas (2026 e início de 2027). */
export const FERIADOS = [
  "2026-01-01", "2026-02-16", "2026-02-17", "2026-04-03", "2026-04-21", "2026-05-01", "2026-06-04", "2026-09-07",
  "2026-10-12", "2026-11-02", "2026-11-15", "2026-11-20", "2026-12-25", "2027-01-01",
];
