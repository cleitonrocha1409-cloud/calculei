// Reforma tributária do consumo — EC 132/2023 e LC 214/2025.
export const REFORMA = {
  // Alíquota de referência da CBS para 2027 calculada pelo TCU em 28/10/2026 (11,3468%, arredondada).
  // O Senado fixa o valor definitivo até 15/12/2026; sem deliberação, vale o cálculo do TCU.
  cbsReferencia2027: 0.113,
  statusCbs: "Proposta do TCU de 28/10/2026. O Senado fixa a alíquota definitiva até 15/12/2026; se não deliberar, vale 11,3%.",
  teste2026: { cbs: 0.009, ibs: 0.001 },
  ibsTransicao: 0.001, // 2027 e 2028: 0,05% estadual + 0,05% municipal
  reducaoCbsTransicao: 0.001, // a CBS é reduzida em 0,1 ponto em 2027 e 2028
};

export const REDUCOES = {
  padrao: { rotulo: "Alíquota padrão", fator: 0, exemplos: "A maioria dos bens e serviços" },
  r30: { rotulo: "Redução de 30%", fator: 0.3, exemplos: "Profissões intelectuais regulamentadas, como advogados, contadores e engenheiros" },
  r60: { rotulo: "Redução de 60%", fator: 0.6, exemplos: "Saúde, educação, medicamentos, alimentos fora da cesta básica, transporte coletivo" },
  zero: { rotulo: "Alíquota zero", fator: 1, exemplos: "Itens da Cesta Básica Nacional e alguns medicamentos" },
} as const;

export type Reducao = keyof typeof REDUCOES;
