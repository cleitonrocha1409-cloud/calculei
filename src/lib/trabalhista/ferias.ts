import { arred, formatarBRL } from "../dinheiro";
import { calcularINSS, calcularIRRF } from "./impostos";
import type { Linha } from "./rescisao";

export interface EntradaFerias {
  salario: number;
  mediaVariaveis?: number;
  dias: number; // dias de descanso (5 a 30)
  venderDias?: boolean; // abono pecuniário de 1/3 (10 dias)
  adiantar13?: boolean; // 1ª parcela do 13º junto com as férias
  dependentes?: number;
}

export interface ResultadoFerias {
  proventos: Linha[];
  descontos: Linha[];
  totalProventos: number;
  totalDescontos: number;
  liquido: number;
  diasVendidos: number;
  alertas: string[];
}

export class ErroFerias extends Error {}

export function calcularFerias(e: EntradaFerias): ResultadoFerias {
  if (!(e.salario > 0)) throw new ErroFerias("Informe o salário bruto mensal.");
  const dias = Math.floor(e.dias);
  if (!(dias >= 5 && dias <= 30)) throw new ErroFerias("As férias precisam ter entre 5 e 30 dias.");
  const diasVendidos = e.venderDias ? 10 : 0;
  if (dias + diasVendidos > 30) throw new ErroFerias("Para vender 10 dias, tire no máximo 20 dias de descanso.");

  const remuneracao = arred(e.salario + (e.mediaVariaveis ?? 0));
  const diaria = remuneracao / 30;
  const dependentes = Math.max(0, Math.floor(e.dependentes ?? 0));
  const proventos: Linha[] = [];
  const descontos: Linha[] = [];
  const alertas: string[] = [];

  const ferias = arred(diaria * dias);
  const terco = arred(ferias / 3);
  proventos.push({
    id: "ferias",
    rotulo: `Férias (${dias} dias)`,
    valor: ferias,
    memoria: `${formatarBRL(remuneracao)} ÷ 30 × ${dias} dias`,
    base: "CLT, art. 142",
  });
  proventos.push({ id: "terco", rotulo: "1/3 constitucional", valor: terco, memoria: `${formatarBRL(ferias)} ÷ 3`, base: "Constituição, art. 7º, XVII" });

  let abono = 0;
  let tercoAbono = 0;
  if (diasVendidos) {
    abono = arred(diaria * diasVendidos);
    tercoAbono = arred(abono / 3);
    proventos.push({
      id: "abono",
      rotulo: "Abono pecuniário (10 dias vendidos)",
      valor: abono,
      memoria: `${formatarBRL(remuneracao)} ÷ 30 × 10 dias. Sem INSS e sem imposto de renda`,
      base: "CLT, arts. 143 e 144",
    });
    proventos.push({ id: "terco-abono", rotulo: "1/3 sobre o abono", valor: tercoAbono, memoria: `${formatarBRL(abono)} ÷ 3`, base: "CLT, art. 144" });
  }

  let adiantamento = 0;
  if (e.adiantar13) {
    adiantamento = arred(remuneracao / 2);
    proventos.push({
      id: "adiant-13",
      rotulo: "1ª parcela do 13º",
      valor: adiantamento,
      memoria: `Metade do salário, sem descontos. Os descontos ficam para a 2ª parcela, em dezembro`,
      base: "Lei 4.749/1965, art. 2º, § 2º",
    });
    alertas.push("A 1ª parcela do 13º junto com as férias precisa ser pedida por escrito em janeiro.");
  }

  // INSS e IR incidem sobre férias + 1/3; o abono e seu 1/3 são isentos.
  const tributavel = ferias + terco;
  const inss = calcularINSS(tributavel);
  descontos.push({
    id: "inss",
    rotulo: "INSS",
    valor: inss,
    memoria: `Tabela progressiva de 2026 sobre ${formatarBRL(tributavel)} (férias + 1/3). Na folha, a empresa soma ao salário do mês e respeita o teto`,
    base: "Lei 8.212/1991, art. 28",
  });
  const ir = calcularIRRF(tributavel, inss, dependentes, true);
  descontos.push({
    id: "irrf",
    rotulo: "Imposto de renda (IRRF)",
    valor: ir.imposto,
    memoria: `Calculado separado do salário. Base ${formatarBRL(ir.base)}${ir.usouSimplificado ? " (desconto simplificado)" : ""}; imposto ${formatarBRL(ir.impostoTabela)} − redução ${formatarBRL(ir.reducao)}`,
    base: "Lei 15.270/2025",
  });

  const totalProventos = arred(proventos.reduce((s, l) => s + l.valor, 0));
  const totalDescontos = arred(descontos.reduce((s, l) => s + l.valor, 0));
  return { proventos, descontos, totalProventos, totalDescontos, liquido: arred(totalProventos - totalDescontos), diasVendidos, alertas };
}
