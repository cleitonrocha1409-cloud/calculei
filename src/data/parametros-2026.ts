// Parâmetros legais vigentes em 2026.
// Toda alteração aqui atualiza todas as calculadoras que usam estes valores.

export const SALARIO_MINIMO_2026 = 1621.0;

/** INSS empregado, doméstico e avulso — Portaria Interministerial MPS/MF nº 13/2026. */
export const INSS_2026 = {
  vigencia: "2026-01-01",
  teto: 8475.55,
  faixas: [
    { ate: 1621.0, aliquota: 0.075 },
    { ate: 2902.84, aliquota: 0.09 },
    { ate: 4354.27, aliquota: 0.12 },
    { ate: 8475.55, aliquota: 0.14 },
  ],
  fonte: "Portaria Interministerial MPS/MF nº 13/2026",
};

/** IRRF mensal — tabela progressiva + redução da Lei 15.270/2025. */
export const IRRF_2026 = {
  vigencia: "2026-01-01",
  faixas: [
    { ate: 2428.8, aliquota: 0, deduzir: 0 },
    { ate: 2826.65, aliquota: 0.075, deduzir: 182.16 },
    { ate: 3751.05, aliquota: 0.15, deduzir: 394.16 },
    { ate: 4664.68, aliquota: 0.225, deduzir: 675.49 },
    { ate: Infinity, aliquota: 0.275, deduzir: 908.73 },
  ],
  deducaoDependente: 189.59,
  descontoSimplificado: 607.2,
  reducao: {
    // Até R$ 5.000: redução de até R$ 312,89 (zera o imposto).
    limiteIsencao: 5000.0,
    reducaoMaxima: 312.89,
    // De R$ 5.000,01 a R$ 7.350: R$ 978,62 − 0,133145 × rendimento.
    limiteReducao: 7350.0,
    constante: 978.62,
    fator: 0.133145,
  },
  fonte: "Lei 15.270/2025 e tabela progressiva mensal da Receita Federal",
};

/** FGTS — Lei 8.036/1990. */
export const FGTS = {
  aliquotaDeposito: 0.08,
  multaSemJustaCausa: 0.4,
  multaAcordo: 0.2,
  saqueAcordo: 0.8,
};

/** Seguro-desemprego — tabela do MTE vigente desde 11/01/2026 (reajuste pelo INPC). */
export const SEGURO_DESEMPREGO_2026 = {
  vigencia: "2026-01-11",
  piso: 1621.0,
  teto: 2518.65,
  limite1: 2222.17, // até aqui: média × 0,8
  limite2: 3703.99, // até aqui: excedente × 0,5 + 1.777,74; acima: teto
  fixoFaixa2: 1777.74,
  fonte: "Ministério do Trabalho e Emprego, tabela vigente desde 11/01/2026",
};
