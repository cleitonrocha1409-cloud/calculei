// Simulador de aposentadoria do INSS pelas regras da EC 103/2019.
// Trabalha em meses: tempo de contribuição e idade em meses completos; a busca anda mês a mês a partir de hoje.
import { idadeProgressivaNoAno, pontosNoAno, PREVIDENCIA, REFORMA_DATA, type Sexo } from "../../data/previdencia";
import { arred } from "../dinheiro";
import { lerData, somarMeses } from "../datas";

export interface DadosAposentadoria {
  sexo: Sexo;
  nascimento: Date;
  hoje: Date;
  /** Tempo de contribuição até hoje, em meses. */
  tempoHoje: number;
  /** Tempo até 13/11/2019, em meses. Se ausente, estima supondo contribuição contínua até hoje. */
  tempo2019?: number;
  /** Continua contribuindo daqui em diante? */
  contribuindo: boolean;
  /** Média dos salários de contribuição (desde 07/1994). */
  media: number;
}

export type IdRegra = "pontos" | "idadeProgressiva" | "pedagio50" | "pedagio100" | "idade";

export interface ResultadoRegra {
  id: IdRegra;
  nome: string;
  requisitos: string;
  aplica: boolean;
  motivo?: string; // quando não se aplica ou não alcança
  data: Date | null; // primeira data em que cumpre (hoje, se já cumpre)
  jaCumpre: boolean;
  idadeNaData?: number; // meses
  tempoNaData?: number; // meses
  coeficiente?: number;
  valor?: number; // null = depende do fator previdenciário
  calculo: string;
}

export interface ResultadoAposentadoria {
  regras: ResultadoRegra[];
  melhor: ResultadoRegra | null; // a que chega primeiro
  tempo2019: number;
  novoSegurado: boolean;
  direitoAdquirido: boolean;
  media: number;
}

export function mesesCompletos(de: Date, ate: Date): number {
  let m = (ate.getUTCFullYear() - de.getUTCFullYear()) * 12 + (ate.getUTCMonth() - de.getUTCMonth());
  if (ate.getUTCDate() < de.getUTCDate()) m -= 1;
  return Math.max(0, m);
}

/** "32 anos e 4 meses" */
export function anosMeses(meses: number) {
  const a = Math.floor(meses / 12);
  const m = meses % 12;
  const pa = `${a} ${a === 1 ? "ano" : "anos"}`;
  return m === 0 ? pa : a === 0 ? `${m} ${m === 1 ? "mês" : "meses"}` : `${pa} e ${m} ${m === 1 ? "mês" : "meses"}`;
}

const pts = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

/** Coeficiente do art. 26: 60% + 2% por ano completo acima de 15 (mulher) ou 20 (homem). */
export function coeficiente(tempoMeses: number, sexo: Sexo) {
  const anos = Math.floor(tempoMeses / 12);
  const c = PREVIDENCIA.coeficiente;
  return arred(c.base + c.porAno * Math.max(0, anos - c.carencia[sexo]));
}

export function valorBeneficio(media: number, coef: number) {
  const bruto = Math.min(media, PREVIDENCIA.teto) * coef;
  return arred(Math.min(PREVIDENCIA.teto, Math.max(PREVIDENCIA.piso, bruto)));
}

const LIMITE_MESES = 50 * 12;

export function simularAposentadoria(d: DadosAposentadoria): ResultadoAposentadoria {
  const s = d.sexo;
  const req = PREVIDENCIA.tempoTransicao[s] * 12;
  const desdeReforma = mesesCompletos(lerData(REFORMA_DATA), d.hoje);
  const tempo2019 = d.tempo2019 ?? Math.max(0, d.tempoHoje - desdeReforma);
  const novoSegurado = tempo2019 === 0;
  const direitoAdquirido = tempo2019 >= req;
  const media = Math.min(d.media, PREVIDENCIA.teto);
  const falta2019 = Math.max(0, req - tempo2019);

  /** Situação k meses depois de hoje. */
  const em = (k: number) => {
    const data = k === 0 ? d.hoje : somarMeses(d.hoje, k);
    return { data, idade: mesesCompletos(d.nascimento, data), tempo: d.tempoHoje + (d.contribuindo ? k : 0), ano: data.getUTCFullYear() };
  };
  const buscar = (cumpre: (x: ReturnType<typeof em>) => boolean) => {
    for (let k = 0; k <= LIMITE_MESES; k++) {
      const x = em(k);
      if (cumpre(x)) return { ...x, k };
      if (!d.contribuindo && k > 0 && x.idade > 100 * 12) break;
    }
    return null;
  };

  const regras: ResultadoRegra[] = [];
  const montar = (
    id: IdRegra,
    nome: string,
    requisitos: string,
    aplica: boolean,
    motivoNaoAplica: string,
    cumpre: (x: ReturnType<typeof em>) => boolean,
    valorDe: (tempo: number) => { coef?: number; valor?: number; calculo: string },
  ) => {
    if (!aplica) {
      regras.push({ id, nome, requisitos, aplica, motivo: motivoNaoAplica, data: null, jaCumpre: false, calculo: "" });
      return;
    }
    const r = buscar(cumpre);
    if (!r) {
      regras.push({
        id, nome, requisitos, aplica, data: null, jaCumpre: false, calculo: "",
        motivo: d.contribuindo ? "Não alcança nos próximos 50 anos." : "Não alcança sem voltar a contribuir.",
      });
      return;
    }
    const v = valorDe(r.tempo);
    regras.push({ id, nome, requisitos, aplica, data: r.data, jaCumpre: r.k === 0, idadeNaData: r.idade, tempoNaData: r.tempo, coeficiente: v.coef, valor: v.valor, calculo: v.calculo });
  };

  const valorPadrao = (tempo: number) => {
    const coef = coeficiente(tempo, s);
    const extra = Math.max(0, Math.floor(tempo / 12) - PREVIDENCIA.coeficiente.carencia[s]);
    return {
      coef,
      valor: valorBeneficio(media, coef),
      calculo: `60% + 2% × ${extra} ${extra === 1 ? "ano" : "anos"} acima de ${PREVIDENCIA.coeficiente.carencia[s]} = ${Math.round(coef * 100)}% da média`,
    };
  };

  const transicao = !novoSegurado;
  const motivoNovo = "Vale só para quem já contribuía antes de 13/11/2019.";

  montar(
    "pontos",
    "Regra de pontos",
    `${PREVIDENCIA.tempoTransicao[s]} anos de contribuição e idade + tempo somando ${pontosNoAno(d.hoje.getUTCFullYear(), s)} pontos em ${d.hoje.getUTCFullYear()} (sobe 1 por ano até ${PREVIDENCIA.pontos.teto[s]})`,
    transicao,
    motivoNovo,
    (x) => x.tempo >= req && (x.idade + x.tempo) / 12 >= pontosNoAno(x.ano, s),
    valorPadrao,
  );
  montar(
    "idadeProgressiva",
    "Idade mínima progressiva",
    `${PREVIDENCIA.tempoTransicao[s]} anos de contribuição e ${anosMeses(idadeProgressivaNoAno(d.hoje.getUTCFullYear(), s))} de idade em ${d.hoje.getUTCFullYear()} (sobe 6 meses por ano até ${PREVIDENCIA.idadeProgressiva.teto[s]})`,
    transicao,
    motivoNovo,
    (x) => x.tempo >= req && x.idade >= idadeProgressivaNoAno(x.ano, s),
    valorPadrao,
  );
  const exig50 = req + Math.ceil(falta2019 * 0.5);
  montar(
    "pedagio50",
    "Pedágio de 50%",
    `Em 13/11/2019, faltar no máximo 2 anos para ${PREVIDENCIA.tempoTransicao[s]} anos de contribuição; cumprir o que faltava + 50% (no seu caso, ${anosMeses(exig50)}). Sem idade mínima`,
    transicao && falta2019 <= 24,
    novoSegurado ? motivoNovo : `Em 13/11/2019 faltavam ${anosMeses(falta2019)}; a regra exige que faltassem no máximo 2 anos.`,
    (x) => x.tempo >= exig50,
    () => ({ calculo: "Média × fator previdenciário (depende da idade e da expectativa de vida; o INSS calcula na hora do pedido)" }),
  );
  const exig100 = req + falta2019;
  montar(
    "pedagio100",
    "Pedágio de 100%",
    `${PREVIDENCIA.pedagio100Idade[s]} anos de idade e ${PREVIDENCIA.tempoTransicao[s]} anos de contribuição + o dobro do que faltava em 13/11/2019 (no seu caso, ${anosMeses(exig100)})`,
    transicao,
    motivoNovo,
    (x) => x.tempo >= exig100 && x.idade >= PREVIDENCIA.pedagio100Idade[s] * 12,
    () => ({ coef: 1, valor: valorBeneficio(media, 1), calculo: "100% da média" }),
  );
  const minIdade = (transicao ? PREVIDENCIA.tempoMinimoIdade.transicao : PREVIDENCIA.tempoMinimoIdade.permanente)[s];
  montar(
    "idade",
    transicao ? "Aposentadoria por idade" : "Aposentadoria por idade (regra geral)",
    `${PREVIDENCIA.idade[s]} anos de idade e ${minIdade} anos de contribuição`,
    true,
    "",
    (x) => x.idade >= PREVIDENCIA.idade[s] * 12 && x.tempo >= minIdade * 12,
    valorPadrao,
  );

  const alcancaveis = regras.filter((r) => r.data).sort((a, b) => a.data!.getTime() - b.data!.getTime() || (b.valor ?? 0) - (a.valor ?? 0));
  return { regras, melhor: alcancaveis[0] ?? null, tempo2019, novoSegurado, direitoAdquirido, media };
}

/** Quanto rende esperar: valor pela regra (pontos/idade) se aposentar 1 a `anos` anos depois da data. */
export function valorEsperando(r: ResultadoRegra, sexo: Sexo, media: number, anos = 5) {
  if (!r.data || r.tempoNaData === undefined || r.coeficiente === undefined || r.id === "pedagio100") return [];
  return Array.from({ length: anos }, (_, i) => {
    const tempo = r.tempoNaData! + (i + 1) * 12;
    const coef = coeficiente(tempo, sexo);
    return { data: somarMeses(r.data!, (i + 1) * 12), coef, valor: valorBeneficio(media, coef) };
  });
}
