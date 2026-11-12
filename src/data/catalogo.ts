export interface Calculadora {
  titulo: string;
  resumo: string;
  url?: string; // sem url = em breve
  busca?: string[]; // termos extras para a busca da página inicial
}

export interface Categoria {
  slug: string;
  nome: string;
  descricao: string;
  calculadoras: Calculadora[];
}

export const CATEGORIAS: Categoria[] = [
  {
    slug: "fim-da-escala-6x1",
    nome: "Fim da escala 6x1",
    descricao: "A EC 141/2026 reduz a jornada para 42h em dezembro de 2026 e para 40h em 2027, com duas folgas por semana.",
    calculadoras: [
      { titulo: "Minha nova jornada", resumo: "Horas e valor da hora antes e depois: 44h, 42h e 40h", busca: ["6x1", "5x2", "jornada", "valor hora"] },
      { titulo: "Montador de escala 5x2 e 12x36", resumo: "Calendário de folgas e domingos", busca: ["escala", "folga"] },
      { titulo: "Custo para a empresa", resumo: "Cobrir com hora extra ou contratar?", busca: ["empresa", "custo"] },
    ],
  },
  {
    slug: "trabalhista",
    nome: "Trabalhista",
    descricao: "Rescisão, férias, 13º e salário líquido com as tabelas de INSS e IRRF de 2026.",
    calculadoras: [
      {
        titulo: "Rescisão",
        resumo: "Todos os tipos de desligamento, com FGTS e comparação",
        url: "/trabalhista/calculo-de-rescisao/",
        busca: ["demissão", "acerto", "verbas rescisórias", "multa fgts", "acordo", "justa causa", "pedido de demissão"],
      },
      { titulo: "Férias", resumo: "Com 1/3, abono pecuniário e descontos", url: "/trabalhista/calculo-de-ferias/", busca: ["ferias", "vender ferias", "abono"] },
      { titulo: "13º salário", resumo: "Primeira e segunda parcela", url: "/trabalhista/calculo-decimo-terceiro/", busca: ["decimo terceiro", "13", "primeira parcela", "segunda parcela"] },
      { titulo: "Salário líquido", resumo: "Do bruto ao líquido, e do líquido ao bruto", url: "/trabalhista/salario-liquido/", busca: ["inss", "irrf", "imposto de renda", "holerite", "bruto"] },
      { titulo: "Hora extra", resumo: "Com a jornada certa para cada mês", busca: ["horas extras"] },
      { titulo: "Seguro-desemprego", resumo: "Número de parcelas e valor", busca: ["seguro desemprego"] },
    ],
  },
  {
    slug: "financiamentos",
    nome: "Financiamentos e empréstimos",
    descricao: "Simule parcelas, juros e o custo total antes de assinar.",
    calculadoras: [
      { titulo: "Financiamento imobiliário", resumo: "SAC e Price lado a lado", busca: ["imóvel", "casa", "sac", "price"] },
      { titulo: "Empréstimo e financiamento de veículo", resumo: "Parcela, juros totais e CET", busca: ["carro", "consignado", "cet"] },
      { titulo: "Juros compostos", resumo: "Quanto um valor rende ao longo do tempo", busca: ["investimento"] },
      { titulo: "Correção monetária", resumo: "Atualize um valor pelo IPCA, INPC, IGP-M ou Selic", busca: ["atualizar valor", "indice", "inflação"] },
      { titulo: "Investimentos", resumo: "CDB, poupança e Tesouro Direto lado a lado", busca: ["cdb", "poupança", "tesouro", "rendimento"] },
    ],
  },
  {
    slug: "dividas",
    nome: "Dívidas em atraso",
    descricao: "Quanto pagar de multa e juros em contas atrasadas, com as regras de cada tipo de dívida.",
    calculadoras: [
      { titulo: "Boleto atrasado", resumo: "Multa e juros de mora pelos dias de atraso", busca: ["boleto", "multa", "juros de mora", "conta atrasada"] },
      { titulo: "Cartão de crédito", resumo: "Quanto cresce a dívida no rotativo", busca: ["rotativo", "fatura"] },
      { titulo: "Cheque especial", resumo: "Juros pelos dias no negativo", busca: ["limite", "conta negativa"] },
      { titulo: "Aluguel em atraso", resumo: "Multa, juros e correção do aluguel vencido", busca: ["aluguel atrasado"] },
    ],
  },
  {
    slug: "empregada-domestica",
    nome: "Empregada doméstica",
    descricao: "Salário, encargos do eSocial, férias, 13º e rescisão de quem trabalha em casa de família.",
    calculadoras: [
      { titulo: "Salário e guia do eSocial", resumo: "INSS, FGTS e o valor da guia DAE", busca: ["domestica", "doméstica", "dae", "esocial", "diarista"] },
      { titulo: "Rescisão da doméstica", resumo: "Com o FGTS e a indenização compensatória", busca: ["domestica", "doméstica", "demissão"] },
      { titulo: "Recibo de pagamento", resumo: "Gere o recibo do mês pronto para assinar", busca: ["recibo", "holerite"] },
    ],
  },
  {
    slug: "aluguel",
    nome: "Aluguel",
    descricao: "Reajustes e multas com os índices oficiais do Banco Central.",
    calculadoras: [
      { titulo: "Reajuste de aluguel", resumo: "IGP-M, IPCA ou INPC acumulado", busca: ["igpm", "igp-m", "ipca", "reajuste"] },
      { titulo: "Multa por quebra de contrato", resumo: "Proporcional aos meses restantes", busca: ["multa", "rescisão aluguel"] },
    ],
  },
  {
    slug: "reforma-tributaria",
    nome: "Reforma tributária",
    descricao: "A CBS começa em 1º de janeiro de 2027 e substitui PIS e Cofins.",
    calculadoras: [
      { titulo: "CBS e IBS no preço", resumo: "Quanto de imposto em cada ano da transição", busca: ["cbs", "ibs", "iva"] },
    ],
  },
];

export const TODAS = CATEGORIAS.flatMap((c) => c.calculadoras.map((calc) => ({ ...calc, categoria: c.nome })));
