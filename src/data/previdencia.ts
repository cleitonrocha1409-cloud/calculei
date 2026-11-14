// Regras de aposentadoria do INSS (RGPS) da Emenda Constitucional 103/2019.
// As exigências de pontos e de idade progressiva sobem todo 1º de janeiro, até o teto de cada uma.
import { INSS_2026, SALARIO_MINIMO_2026 } from "./parametros-2026";

export type Sexo = "f" | "m";

export const REFORMA_DATA = "2019-11-13";

export const PREVIDENCIA = {
  /** Tempo de contribuição mínimo (anos) nas regras de transição por tempo. */
  tempoTransicao: { f: 30, m: 35 },
  /** Regra de pontos (art. 15): começou em 86/96 em 2019 e sobe 1 por ano. */
  pontos: { base2019: { f: 86, m: 96 }, teto: { f: 100, m: 105 } },
  /** Idade mínima progressiva (art. 16): começou em 56/61 anos em 2019 e sobe 6 meses por ano. */
  idadeProgressiva: { base2019: { f: 56, m: 61 }, teto: { f: 62, m: 65 } },
  /** Pedágio de 100% (art. 20): idade mínima. */
  pedagio100Idade: { f: 57, m: 60 },
  /** Aposentadoria por idade (art. 18 e regra permanente). */
  idade: { f: 62, m: 65 },
  tempoMinimoIdade: { transicao: { f: 15, m: 15 }, permanente: { f: 15, m: 20 } },
  /** Cálculo (art. 26): 60% da média + 2% por ano de contribuição acima de 15 (mulher) ou 20 (homem). */
  coeficiente: { base: 0.6, porAno: 0.02, carencia: { f: 15, m: 20 } },
  piso: SALARIO_MINIMO_2026,
  teto: INSS_2026.teto,
  fonte: "Emenda Constitucional 103/2019 (arts. 15 a 20 e 26)",
};

/**
 * Professor da educação infantil, do ensino fundamental ou médio, com tempo de efetivo magistério
 * (EC 103/2019: art. 15, § 3º; art. 16, § 2º; art. 19, § 1º, II; art. 20, § 1º). Vale para o INSS (rede privada).
 * Em 2026: 88/98 pontos, 54a6m/59a6m na idade progressiva, 52/55 anos no pedágio de 100%.
 */
export const PROFESSOR = {
  tempoTransicao: { f: 25, m: 30 },
  pontos: { base2019: { f: 81, m: 91 }, teto: { f: 92, m: 100 } },
  idadeProgressiva: { base2019: { f: 51, m: 56 }, teto: { f: 57, m: 60 } },
  pedagio100Idade: { f: 52, m: 55 },
  /** Regra permanente (quem começou depois da reforma): idade e 25 anos de magistério. */
  permanente: { idade: { f: 57, m: 60 }, tempo: 25 },
  fonte: "Emenda Constitucional 103/2019 (arts. 15, § 3º; 16, § 2º; 19, § 1º, II; 20, § 1º; e 26)",
};

export type Categoria = "geral" | "professor";
type RegrasTransicao = { pontos: typeof PREVIDENCIA.pontos; idadeProgressiva: typeof PREVIDENCIA.idadeProgressiva };
const regras = (c: Categoria): RegrasTransicao => (c === "professor" ? PROFESSOR : PREVIDENCIA);

/** Pontos exigidos no ano (mulher 93 e homem 103 em 2026; professor 88 e 98). */
export const pontosNoAno = (ano: number, s: Sexo, c: Categoria = "geral") =>
  Math.min(regras(c).pontos.base2019[s] + Math.max(0, ano - 2019), regras(c).pontos.teto[s]);

/** Idade exigida no ano, em meses (mulher 59a6m e homem 64a6m em 2026; professor 54a6m e 59a6m). */
export const idadeProgressivaNoAno = (ano: number, s: Sexo, c: Categoria = "geral") =>
  Math.min(regras(c).idadeProgressiva.base2019[s] * 12 + Math.max(0, ano - 2019) * 6, regras(c).idadeProgressiva.teto[s] * 12);
