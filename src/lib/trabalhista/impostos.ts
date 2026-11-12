import { INSS_2026, IRRF_2026 } from "../../data/parametros-2026";
import { arred } from "../dinheiro";

/** INSS progressivo, faixa a faixa, limitado ao teto. */
export function calcularINSS(base: number): number {
  if (!(base > 0)) return 0;
  let total = 0;
  let anterior = 0;
  for (const f of INSS_2026.faixas) {
    if (base <= anterior) break;
    const parcela = Math.min(base, f.ate) - anterior;
    total += parcela * f.aliquota;
    anterior = f.ate;
  }
  return arred(total);
}

export interface ResultadoIRRF {
  base: number;
  impostoTabela: number;
  reducao: number;
  imposto: number;
  usouSimplificado: boolean;
}

/**
 * IRRF mensal com a redução da Lei 15.270/2025.
 * @param rendimento rendimento tributável bruto (usado para a redução)
 * @param inss contribuição previdenciária descontada
 * @param dependentes número de dependentes
 * @param permitirSimplificado usa o desconto simplificado quando for mais vantajoso (não se aplica ao 13º)
 * @param outrasDeducoes pensão alimentícia judicial e outras deduções legais
 */
export function calcularIRRF(
  rendimento: number,
  inss: number,
  dependentes = 0,
  permitirSimplificado = true,
  outrasDeducoes = 0,
): ResultadoIRRF {
  if (!(rendimento > 0)) return { base: 0, impostoTabela: 0, reducao: 0, imposto: 0, usouSimplificado: false };
  const deducoesLegais = inss + dependentes * IRRF_2026.deducaoDependente + Math.max(0, outrasDeducoes);
  const usouSimplificado = permitirSimplificado && IRRF_2026.descontoSimplificado > deducoesLegais;
  const deducao = usouSimplificado ? IRRF_2026.descontoSimplificado : deducoesLegais;
  const base = Math.max(0, rendimento - deducao);

  const faixa = IRRF_2026.faixas.find((f) => base <= f.ate)!;
  const impostoTabela = Math.max(0, arred(base * faixa.aliquota - faixa.deduzir));

  const r = IRRF_2026.reducao;
  let reducaoBruta = 0;
  if (rendimento <= r.limiteIsencao) reducaoBruta = r.reducaoMaxima;
  else if (rendimento <= r.limiteReducao) reducaoBruta = r.constante - r.fator * rendimento;
  const reducao = arred(Math.min(impostoTabela, Math.max(0, reducaoBruta)));

  return { base: arred(base), impostoTabela, reducao, imposto: arred(impostoTabela - reducao), usouSimplificado };
}
