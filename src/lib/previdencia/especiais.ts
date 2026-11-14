// Aposentadorias com regras próprias: pessoa com deficiência (LC 142/2013) e trabalhador rural (Lei 8.213/1991, art. 48).
// A Reforma da Previdência manteve as duas (EC 103/2019, art. 22 e art. 201, § 7º, II, da Constituição).
import { PREVIDENCIA, type Sexo } from "../../data/previdencia";
import { arred } from "../dinheiro";
import { somarMeses } from "../datas";
import { anosMeses, coeficiente, mesesCompletos, valorBeneficio } from "./aposentadoria";

export type GrauDeficiencia = "grave" | "moderada" | "leve";

/** LC 142/2013, art. 3º: tempo de contribuição como pessoa com deficiência (anos) e idade da modalidade por idade. */
export const PCD = {
  tempo: { grave: { f: 20, m: 25 }, moderada: { f: 24, m: 29 }, leve: { f: 28, m: 33 } } as Record<GrauDeficiencia, Record<Sexo, number>>,
  idade: { f: 55, m: 60 },
  tempoIdade: 15,
  fonte: "Lei Complementar 142/2013 (arts. 3º e 8º), mantida pelo art. 22 da EC 103/2019",
};

/** Aposentadoria por idade rural: 55/60 anos e 15 anos de atividade rural (Lei 8.213/1991, art. 48, § 1º). */
export const RURAL = {
  idade: { f: 55, m: 60 },
  tempo: 15,
  fonte: "Lei 8.213/1991 (arts. 39 e 48) e Constituição, art. 201, § 7º, II",
};

export interface RegraEspecial {
  id: string;
  nome: string;
  requisitos: string;
  data: Date | null;
  jaCumpre: boolean;
  idadeNaData?: number;
  tempoNaData?: number;
  coeficiente?: number;
  valor?: number;
  calculo: string;
  motivo?: string;
}

interface Base {
  sexo: Sexo;
  nascimento: Date;
  hoje: Date;
  /** Tempo que conta para a regra até hoje, em meses. */
  tempoHoje: number;
  /** Continua trabalhando (e somando tempo)? */
  continua: boolean;
}

const LIMITE = 50 * 12;

function buscar(b: Base, cumpre: (idade: number, tempo: number) => boolean) {
  for (let k = 0; k <= LIMITE; k++) {
    const data = k === 0 ? b.hoje : somarMeses(b.hoje, k);
    const idade = mesesCompletos(b.nascimento, data);
    const tempo = b.tempoHoje + (b.continua ? k : 0);
    if (cumpre(idade, tempo)) return { data, idade, tempo, k };
    if (idade > 100 * 12) break;
  }
  return null;
}

function regra(
  b: Base,
  id: string,
  nome: string,
  requisitos: string,
  cumpre: (idade: number, tempo: number) => boolean,
  valorDe: (tempo: number) => { coef?: number; valor: number; calculo: string },
): RegraEspecial {
  const r = buscar(b, cumpre);
  if (!r) return { id, nome, requisitos, data: null, jaCumpre: false, calculo: "", motivo: b.continua ? "Não alcança nos próximos 50 anos." : "Não alcança sem voltar a trabalhar." };
  const v = valorDe(r.tempo);
  return { id, nome, requisitos, data: r.data, jaCumpre: r.k === 0, idadeNaData: r.idade, tempoNaData: r.tempo, coeficiente: v.coef, valor: v.valor, calculo: v.calculo };
}

const melhorDe = (regras: RegraEspecial[]) =>
  regras.filter((r) => r.data).sort((a, b) => a.data!.getTime() - b.data!.getTime() || (b.valor ?? 0) - (a.valor ?? 0))[0] ?? null;

/** Coeficiente da aposentadoria por idade da pessoa com deficiência: 70% + 1% por ano completo, até 100%. */
export const coeficientePcDIdade = (tempoMeses: number) => arred(Math.min(1, 0.7 + 0.01 * Math.floor(tempoMeses / 12)));

export function simularPcD(d: Base & { grau: GrauDeficiencia; media: number }) {
  const s = d.sexo;
  const anosTempo = PCD.tempo[d.grau][s];
  const porTempo = regra(
    d,
    "pcdTempo",
    "Por tempo de contribuição",
    `${anosTempo} anos de contribuição como pessoa com deficiência ${d.grau} (sem idade mínima)`,
    (_i, t) => t >= anosTempo * 12,
    () => ({ coef: 1, valor: valorBeneficio(d.media, 1), calculo: "100% da média" }),
  );
  const porIdade = regra(
    d,
    "pcdIdade",
    "Por idade",
    `${PCD.idade[s]} anos de idade e ${PCD.tempoIdade} anos de contribuição como pessoa com deficiência (qualquer grau)`,
    (i, t) => i >= PCD.idade[s] * 12 && t >= PCD.tempoIdade * 12,
    (t) => {
      const coef = coeficientePcDIdade(t);
      const anos = Math.floor(t / 12);
      return { coef, valor: valorBeneficio(d.media, coef), calculo: `70% + 1% × ${anos} anos de contribuição = ${Math.round(coef * 100)}% da média (máximo 100%)` };
    },
  );
  const regras = [porTempo, porIdade];
  return { regras, melhor: melhorDe(regras) };
}

export type TipoRural = "especial" | "empregado";

export function simularRural(d: Base & { tipo: TipoRural; media?: number }) {
  const s = d.sexo;
  const rural = regra(
    d,
    "rural",
    "Aposentadoria por idade rural",
    `${RURAL.idade[s]} anos de idade e ${RURAL.tempo} anos de atividade rural, inclusive no período logo antes do pedido`,
    (i, t) => i >= RURAL.idade[s] * 12 && t >= RURAL.tempo * 12,
    (t) => {
      if (d.tipo === "especial") return { valor: PREVIDENCIA.piso, calculo: "1 salário mínimo (segurado especial)" };
      const coef = coeficiente(t, s);
      const extra = Math.max(0, Math.floor(t / 12) - PREVIDENCIA.coeficiente.carencia[s]);
      return {
        coef,
        valor: valorBeneficio(d.media ?? 0, coef),
        calculo: `60% + 2% × ${extra} ${extra === 1 ? "ano" : "anos"} acima de ${PREVIDENCIA.coeficiente.carencia[s]} = ${Math.round(coef * 100)}% da média`,
      };
    },
  );
  return { regras: [rural], melhor: melhorDe([rural]) };
}

export { anosMeses };
