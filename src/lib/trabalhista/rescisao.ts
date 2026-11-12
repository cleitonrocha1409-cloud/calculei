import { FGTS } from "../../data/parametros-2026";
import {
  anosCompletos,
  avosDecimoTerceiro,
  avosFerias,
  diasEntre,
  diasSaldoSalario,
  formatarData,
  lerData,
  paraISO,
  somarDias,
} from "../datas";
import { arred, formatarBRL } from "../dinheiro";
import { calcularINSS, calcularIRRF } from "./impostos";

export type TipoRescisao = "sem_justa_causa" | "pedido_demissao" | "acordo" | "justa_causa" | "rescisao_indireta";
export type Aviso = "indenizado" | "trabalhado" | "nao_cumprido" | "dispensado";

export const TIPOS: Record<TipoRescisao, string> = {
  sem_justa_causa: "Demissão sem justa causa",
  pedido_demissao: "Pedido de demissão",
  acordo: "Acordo entre as partes",
  justa_causa: "Demissão por justa causa",
  rescisao_indireta: "Rescisão indireta",
};

/** Opções de aviso prévio válidas para cada tipo de rescisão. */
export const AVISOS: Record<TipoRescisao, { valor: Aviso; rotulo: string }[]> = {
  sem_justa_causa: [
    { valor: "indenizado", rotulo: "Indenizado (não trabalhei)" },
    { valor: "trabalhado", rotulo: "Trabalhado" },
  ],
  rescisao_indireta: [{ valor: "indenizado", rotulo: "Indenizado" }],
  acordo: [
    { valor: "indenizado", rotulo: "Indenizado pela metade" },
    { valor: "trabalhado", rotulo: "Trabalhado" },
  ],
  pedido_demissao: [
    { valor: "trabalhado", rotulo: "Cumpri o aviso" },
    { valor: "dispensado", rotulo: "A empresa me dispensou do aviso" },
    { valor: "nao_cumprido", rotulo: "Não cumpri (será descontado)" },
  ],
  justa_causa: [],
};

export interface EntradaRescisao {
  tipo: TipoRescisao;
  salario: number;
  /** Média de variáveis (horas extras, comissões, adicionais) que integram a remuneração. */
  mediaVariaveis?: number;
  admissao: string; // AAAA-MM-DD
  saida: string; // último dia trabalhado
  aviso?: Aviso;
  periodosFeriasVencidas?: number; // 0, 1 ou 2
  feriasVencidasEmDobro?: boolean;
  dependentes?: number;
  saldoFGTS?: number; // vazio = estimar
  adiantamento13?: number;
}

export interface Linha {
  id: string;
  rotulo: string;
  valor: number;
  memoria: string;
  base?: string; // fundamento legal
}

export interface ResultadoRescisao {
  proventos: Linha[];
  descontos: Linha[];
  totalProventos: number;
  totalDescontos: number;
  liquido: number;
  fgts: {
    depositoRescisao: number;
    saldo: number;
    saldoEstimado: boolean;
    multa: number;
    percentualMulta: number;
    saque: "integral" | "80%" | "nao";
    valorSaque: number;
  };
  info: {
    anosCompletos: number;
    diasAviso: number;
    diasAvisoProjetados: number;
    dataProjetada: string;
    avos13: number;
    avosFerias: number;
    remuneracao: number;
  };
  seguroDesemprego: boolean;
  alertas: string[];
}

export class ErroEntrada extends Error {}

function avisoPadrao(tipo: TipoRescisao): Aviso | undefined {
  return AVISOS[tipo][0]?.valor;
}

export function calcularRescisao(e: EntradaRescisao): ResultadoRescisao {
  if (!(e.salario > 0)) throw new ErroEntrada("Informe o salário bruto mensal.");
  if (!e.admissao || !e.saida) throw new ErroEntrada("Informe as datas de admissão e de saída.");
  const admissao = lerData(e.admissao);
  const saida = lerData(e.saida);
  if (saida < admissao) throw new ErroEntrada("A data de saída precisa ser depois da data de admissão.");

  const tipo = e.tipo;
  const avisosValidos = AVISOS[tipo].map((a) => a.valor);
  const aviso = e.aviso && avisosValidos.includes(e.aviso) ? e.aviso : avisoPadrao(tipo);
  const remuneracao = arred(e.salario + (e.mediaVariaveis ?? 0));
  const diaria = remuneracao / 30;
  const dependentes = Math.max(0, Math.floor(e.dependentes ?? 0));
  const alertas: string[] = [];

  // Aviso prévio proporcional: 30 dias + 3 por ano completo, até 90 (Lei 12.506/2011).
  // Só vale a favor do empregado; quando ele pede demissão, o aviso é de 30 dias.
  const anos = anosCompletos(admissao, saida);
  const avisoEmpregador = tipo === "sem_justa_causa" || tipo === "rescisao_indireta" || tipo === "acordo";
  const diasAviso = tipo === "justa_causa" ? 0 : avisoEmpregador ? Math.min(90, 30 + 3 * anos) : 30;

  // Dias de aviso indenizado que projetam o contrato (OJ 82 da SDI-1 do TST).
  let diasIndenizados = 0;
  if (aviso === "indenizado") diasIndenizados = tipo === "acordo" ? Math.floor(diasAviso / 2) : diasAviso;
  const projetada = somarDias(saida, diasIndenizados);

  const proventos: Linha[] = [];
  const descontos: Linha[] = [];

  // Saldo de salário
  const diasSaldo = diasSaldoSalario(admissao, saida);
  const saldoSalario = arred(diaria * diasSaldo);
  proventos.push({
    id: "saldo",
    rotulo: `Saldo de salário (${diasSaldo} dias)`,
    valor: saldoSalario,
    memoria: `${formatarBRL(remuneracao)} ÷ 30 × ${diasSaldo} dias trabalhados no mês da saída`,
    base: "CLT, art. 462",
  });

  // Aviso prévio indenizado
  let avisoIndenizado = 0;
  if (aviso === "indenizado" && diasIndenizados > 0) {
    // No acordo, paga-se metade do valor do aviso (art. 484-A, I, a): 39 dias → 19,5 dias de salário.
    const diasPagos = tipo === "acordo" ? diasAviso / 2 : diasIndenizados;
    const diasTxt = String(diasPagos).replace(".", ",");
    avisoIndenizado = arred(diaria * diasPagos);
    proventos.push({
      id: "aviso",
      rotulo: tipo === "acordo" ? `Aviso prévio indenizado, metade (${diasTxt} dias)` : `Aviso prévio indenizado (${diasIndenizados} dias)`,
      valor: avisoIndenizado,
      memoria:
        `30 dias + 3 dias × ${anos} ano(s) completo(s) = ${diasAviso} dias` +
        (tipo === "acordo" ? `; no acordo, paga-se a metade: ${diasTxt} dias` : "") +
        `. ${formatarBRL(remuneracao)} ÷ 30 × ${diasTxt}`,
      base: tipo === "acordo" ? "CLT, art. 484-A" : "CLT, art. 487; Lei 12.506/2011",
    });
  }

  // 13º proporcional (inclui a projeção do aviso indenizado). Se a projeção entra no ano seguinte,
  // o 13º do ano da saída fica completo e o do ano seguinte começa a contar (OJ 82 da SDI-1 do TST).
  let decimo = 0;
  let avos13 = 0;
  if (tipo !== "justa_causa") {
    const anoIni = Math.max(admissao.getUTCFullYear(), saida.getUTCFullYear());
    for (let ano = anoIni; ano <= projetada.getUTCFullYear(); ano++) {
      const fimAno = new Date(Date.UTC(ano, 11, 31));
      const ate = projetada < fimAno ? projetada : fimAno;
      const avos = avosDecimoTerceiro(admissao, ate);
      const valor = arred((remuneracao / 12) * avos);
      if (valor <= 0) continue;
      avos13 += avos;
      decimo = arred(decimo + valor);
      proventos.push({
        id: ano === anoIni ? "13" : `13-${ano}`,
        rotulo: projetada.getUTCFullYear() > saida.getUTCFullYear() ? `13º salário de ${ano} (${avos}/12)` : `13º salário proporcional (${avos}/12)`,
        valor,
        memoria:
          `${formatarBRL(remuneracao)} ÷ 12 × ${avos} meses com 15 dias ou mais trabalhados em ${ano}` +
          (projetada > saida ? ` (o aviso indenizado projeta o contrato até ${formatarData(projetada)})` : ""),
        base: "Lei 4.090/1962; OJ 82 da SDI-1 do TST",
      });
    }
  }

  // Férias vencidas
  const vencidas = Math.max(0, Math.min(2, Math.floor(e.periodosFeriasVencidas ?? 0)));
  let feriasVencidas = 0;
  if (vencidas > 0) {
    const fator = e.feriasVencidasEmDobro ? 2 : 1;
    const ferias = arred(remuneracao * vencidas * fator);
    const terco = arred(ferias / 3);
    feriasVencidas = ferias + terco;
    proventos.push({
      id: "ferias-vencidas",
      rotulo: `Férias vencidas (${vencidas} período${vencidas > 1 ? "s" : ""}${fator === 2 ? ", em dobro" : ""})`,
      valor: ferias,
      memoria: `${formatarBRL(remuneracao)} × ${vencidas}${fator === 2 ? " × 2 (pagas fora do prazo)" : ""}`,
      base: fator === 2 ? "CLT, arts. 137 e 146" : "CLT, art. 146",
    });
    proventos.push({
      id: "terco-vencidas",
      rotulo: "1/3 sobre férias vencidas",
      valor: terco,
      memoria: `${formatarBRL(ferias)} ÷ 3`,
      base: "Constituição, art. 7º, XVII",
    });
  }

  // Férias integrais de período aquisitivo que se completa durante a projeção do aviso indenizado.
  const integraisProjecao = tipo === "justa_causa" ? 0 : anosCompletos(admissao, projetada) - anos;
  if (integraisProjecao > 0) {
    const ferias = arred(remuneracao * integraisProjecao);
    const terco = arred(ferias / 3);
    proventos.push({
      id: "ferias-integrais",
      rotulo: `Férias integrais (12/12)`,
      valor: ferias,
      memoria: `O período aquisitivo se completa com a projeção do aviso (até ${formatarData(projetada)}): ${formatarBRL(remuneracao)} × ${integraisProjecao}`,
      base: "CLT, arts. 146 e 487, § 1º; OJ 82 da SDI-1 do TST",
    });
    proventos.push({
      id: "terco-integrais",
      rotulo: "1/3 sobre férias integrais",
      valor: terco,
      memoria: `${formatarBRL(ferias)} ÷ 3`,
      base: "Constituição, art. 7º, XVII",
    });
  }

  // Férias proporcionais (não há na justa causa — Súmula 171 do TST)
  let avosF = 0;
  let feriasProp = 0;
  if (tipo !== "justa_causa") {
    avosF = avosFerias(admissao, projetada);
    const ferias = arred((remuneracao / 12) * avosF);
    if (ferias > 0) {
      const terco = arred(ferias / 3);
      feriasProp = ferias + terco;
      proventos.push({
        id: "ferias-prop",
        rotulo: `Férias proporcionais (${avosF}/12)`,
        valor: ferias,
        memoria: `${formatarBRL(remuneracao)} ÷ 12 × ${avosF} meses do período aquisitivo atual`,
        base: "CLT, art. 146, parágrafo único; Súmulas 171 e 261 do TST",
      });
      proventos.push({
        id: "terco-prop",
        rotulo: "1/3 sobre férias proporcionais",
        valor: terco,
        memoria: `${formatarBRL(ferias)} ÷ 3`,
        base: "Constituição, art. 7º, XVII",
      });
    }
  }

  // Descontos: INSS e IRRF incidem sobre saldo de salário e 13º, cada um separado.
  // Aviso indenizado e férias indenizadas não têm INSS nem IR.
  const inssSaldo = calcularINSS(saldoSalario);
  if (inssSaldo > 0)
    descontos.push({
      id: "inss-saldo",
      rotulo: "INSS sobre saldo de salário",
      valor: inssSaldo,
      memoria: "Tabela progressiva do INSS 2026 (7,5% a 14%)",
      base: "Portaria Interministerial MPS/MF nº 13/2026",
    });
  const inss13 = calcularINSS(decimo);
  if (inss13 > 0)
    descontos.push({
      id: "inss-13",
      rotulo: "INSS sobre 13º salário",
      valor: inss13,
      memoria: "Tabela progressiva do INSS 2026, calculada separadamente",
      base: "Lei 8.212/1991, art. 28, § 7º",
    });

  const irSaldo = calcularIRRF(saldoSalario, inssSaldo, dependentes, true);
  if (irSaldo.imposto > 0)
    descontos.push({
      id: "ir-saldo",
      rotulo: "IRRF sobre saldo de salário",
      valor: irSaldo.imposto,
      memoria: `Base ${formatarBRL(irSaldo.base)}${irSaldo.usouSimplificado ? " (desconto simplificado)" : ""}; imposto ${formatarBRL(irSaldo.impostoTabela)} − redução ${formatarBRL(irSaldo.reducao)}`,
      base: "Lei 15.270/2025",
    });
  const ir13 = calcularIRRF(decimo, inss13, dependentes, false);
  if (ir13.imposto > 0)
    descontos.push({
      id: "ir-13",
      rotulo: "IRRF sobre 13º salário",
      valor: ir13.imposto,
      memoria: `Tributação exclusiva. Base ${formatarBRL(ir13.base)}; imposto ${formatarBRL(ir13.impostoTabela)} − redução ${formatarBRL(ir13.reducao)}`,
      base: "Lei 7.713/1988, art. 26; Lei 15.270/2025",
    });

  if (aviso === "nao_cumprido") {
    const desc = arred(diaria * 30);
    descontos.push({
      id: "aviso-desconto",
      rotulo: "Aviso prévio não cumprido",
      valor: desc,
      memoria: `${formatarBRL(remuneracao)} ÷ 30 × 30 dias`,
      base: "CLT, art. 487, § 2º",
    });
  }

  const adiant = arred(Math.max(0, e.adiantamento13 ?? 0));
  if (adiant > 0)
    descontos.push({
      id: "adiantamento-13",
      rotulo: "Adiantamento do 13º já recebido",
      valor: adiant,
      memoria: "Valor informado por você",
    });

  const totalProventos = arred(proventos.reduce((s, l) => s + l.valor, 0));
  const totalDescontos = arred(descontos.reduce((s, l) => s + l.valor, 0));
  const liquido = arred(totalProventos - totalDescontos);
  if (liquido < 0) alertas.push("Os descontos superam os valores a receber. Confira o aviso prévio e o adiantamento do 13º.");

  // FGTS
  const depositoRescisao = arred(FGTS.aliquotaDeposito * (saldoSalario + avisoIndenizado + decimo));
  const saldoInformado = e.saldoFGTS !== undefined && !Number.isNaN(e.saldoFGTS) && e.saldoFGTS >= 0;
  // Estimativa: 8% ao mês sobre a remuneração, incluindo 13º e 1/3 de férias (fator 13⅓ ÷ 12).
  const meses = Math.max(0, diasEntre(admissao, saida) / 30.4375);
  const saldoFgts = saldoInformado
    ? arred(e.saldoFGTS!)
    : arred(FGTS.aliquotaDeposito * remuneracao * meses * (40 / 36));
  const percentualMulta =
    tipo === "sem_justa_causa" || tipo === "rescisao_indireta" ? FGTS.multaSemJustaCausa : tipo === "acordo" ? FGTS.multaAcordo : 0;
  const multa = arred((saldoFgts + depositoRescisao) * percentualMulta);
  const saque: "integral" | "80%" | "nao" =
    tipo === "sem_justa_causa" || tipo === "rescisao_indireta" ? "integral" : tipo === "acordo" ? "80%" : "nao";
  const valorSaque = arred(
    saque === "integral" ? saldoFgts + depositoRescisao + multa : saque === "80%" ? (saldoFgts + depositoRescisao) * FGTS.saqueAcordo + multa : 0,
  );

  if (!saldoInformado) alertas.push("O saldo do FGTS foi estimado. Consulte o valor exato no app FGTS para um resultado preciso.");
  if (tipo === "acordo") alertas.push("No acordo, não há direito ao seguro-desemprego.");
  if (tipo === "justa_causa") alertas.push("Na justa causa, o trabalhador recebe apenas o saldo de salário e as férias vencidas.");

  return {
    proventos,
    descontos,
    totalProventos,
    totalDescontos,
    liquido,
    fgts: {
      depositoRescisao,
      saldo: saldoFgts,
      saldoEstimado: !saldoInformado,
      multa,
      percentualMulta,
      saque,
      valorSaque,
    },
    info: {
      anosCompletos: anos,
      diasAviso,
      diasAvisoProjetados: diasIndenizados,
      dataProjetada: paraISO(projetada),
      avos13,
      avosFerias: avosF,
      remuneracao,
    },
    seguroDesemprego: tipo === "sem_justa_causa" || tipo === "rescisao_indireta",
    alertas,
  };
}

/** Compara o valor líquido e o FGTS liberado em todos os tipos de rescisão, com os mesmos dados. */
export function compararTipos(e: EntradaRescisao) {
  return (Object.keys(TIPOS) as TipoRescisao[]).map((tipo) => {
    const r = calcularRescisao({ ...e, tipo, aviso: avisoPadrao(tipo) });
    return { tipo, rotulo: TIPOS[tipo], liquido: r.liquido, fgtsSaque: r.fgts.valorSaque, total: arred(r.liquido + r.fgts.valorSaque), seguro: r.seguroDesemprego };
  });
}

export { formatarData, lerData };
