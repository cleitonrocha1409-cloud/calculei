import { arred } from "../dinheiro";

export interface EntradaCusto {
  funcionarios: number;
  salarioMedio: number;
  jornadaAtual: number; // horas semanais hoje
  jornadaNova: number; // 42 (com acordo) ou 40
  encargos: number; // fração sobre a folha (ex.: 0,7 = 70%)
}

export interface Opcao {
  nome: string;
  mensal: number;
  anual: number;
  detalhe: string;
}

export interface ResultadoCusto {
  horasPerdidasMes: number;
  aumentoCustoHora: number; // fração
  pessoasEquivalentes: number;
  horaExtra: Opcao;
  contratar: Opcao & { contratacoes: number };
  folhaAtualMensal: number;
}

export class ErroCusto extends Error {}

const SEMANAS_MES = 52 / 12;

export function calcularCustoEmpresa(e: EntradaCusto): ResultadoCusto {
  if (!(e.funcionarios >= 1)) throw new ErroCusto("Informe quantos funcionários têm jornada acima da nova.");
  if (!(e.salarioMedio > 0)) throw new ErroCusto("Informe o salário médio.");
  if (!(e.jornadaNova < e.jornadaAtual)) throw new ErroCusto("A jornada atual precisa ser maior que a nova para haver impacto.");
  const enc = Math.max(0, e.encargos);

  const horasPerdidasMes = arred(e.funcionarios * (e.jornadaAtual - e.jornadaNova) * SEMANAS_MES);
  const valorHoraNova = e.salarioMedio / (e.jornadaNova * 5);
  // Hora extra a 50% + reflexo no descanso remunerado (2 dias de repouso a cada 5 trabalhados) + encargos.
  const reflexoDSR = 2 / 5;
  const heMensal = arred(horasPerdidasMes * valorHoraNova * 1.5 * (1 + reflexoDSR) * (1 + enc));
  const pessoasEquivalentes = horasPerdidasMes / (e.jornadaNova * SEMANAS_MES);
  const contratacoes = Math.ceil(pessoasEquivalentes - 1e-9);
  const contratarMensal = arred(contratacoes * e.salarioMedio * (1 + enc));

  return {
    horasPerdidasMes,
    aumentoCustoHora: e.jornadaAtual / e.jornadaNova - 1,
    pessoasEquivalentes,
    horaExtra: {
      nome: "Cobrir com hora extra",
      mensal: heMensal,
      anual: arred(heMensal * 12),
      detalhe: `${horasPerdidasMes.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} horas extras por mês a 50%, com reflexo no descanso remunerado e encargos`,
    },
    contratar: {
      nome: "Contratar",
      mensal: contratarMensal,
      anual: arred(contratarMensal * 12),
      detalhe: `${contratacoes} contratação(ões) com o mesmo salário médio e encargos`,
      contratacoes,
    },
    folhaAtualMensal: arred(e.funcionarios * e.salarioMedio * (1 + enc)),
  };
}
