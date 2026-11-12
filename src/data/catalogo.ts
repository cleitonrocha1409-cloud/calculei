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
      { titulo: "Minha nova jornada", resumo: "Horas, folgas e valor da hora: 44h, 42h e 40h", url: "/fim-da-escala-6x1/nova-jornada/", busca: ["6x1", "5x2", "jornada", "valor hora", "pec", "emenda 141", "40 horas"] },
      { titulo: "Hora extra com a nova jornada", resumo: "Quanto a hora extra passa a valer", url: "/trabalhista/calculo-hora-extra/", busca: ["hora extra", "6x1", "divisor 200"] },
      { titulo: "Montador de escala 5x2", resumo: "Equipe mínima e calendário de folgas", url: "/fim-da-escala-6x1/montador-de-escala/", busca: ["escala", "folga", "funcionarios", "domingo"] },
      { titulo: "Custo para a empresa", resumo: "Cobrir com hora extra ou contratar?", url: "/fim-da-escala-6x1/custo-para-empresa/", busca: ["empresa", "custo", "contratar", "encargos"] },
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
      { titulo: "Hora extra", resumo: "50%, 100% e DSR, com a nova jornada", url: "/trabalhista/calculo-hora-extra/", busca: ["horas extras", "dsr", "adicional"] },
      { titulo: "Seguro-desemprego", resumo: "Valor e número de parcelas em 2026", url: "/trabalhista/seguro-desemprego/", busca: ["seguro desemprego", "parcelas", "demitido"] },
    ],
  },
  {
    slug: "calendarios",
    nome: "Calendários de pagamento",
    descricao: "Quando cai o INSS, o Bolsa Família e o PIS pelo final do seu cartão, NIS ou mês de nascimento, com lembrete na agenda do celular.",
    calculadoras: [
      { titulo: "Calendário do INSS", resumo: "Aposentadoria e pensão pelo final do benefício", url: "/calendarios/calendario-inss/", busca: ["inss", "aposentadoria", "pensão", "bpc", "loas", "pagamento", "final do cartão", "benefício"] },
      { titulo: "Calendário do Bolsa Família", resumo: "Datas pelo final do NIS", url: "/calendarios/calendario-bolsa-familia/", busca: ["bolsa familia", "bolsa família", "nis", "caixa tem", "pagamento"] },
      { titulo: "Calendário do PIS/Pasep", resumo: "Abono salarial pelo mês de nascimento", url: "/calendarios/calendario-pis/", busca: ["pis", "pasep", "abono", "abono salarial"] },
    ],
  },
  {
    slug: "aposentadoria",
    nome: "Aposentadoria e INSS",
    descricao: "Quando você pode se aposentar e quanto vai receber em cada regra da reforma da Previdência.",
    calculadoras: [
      { titulo: "Simulador de aposentadoria", resumo: "Compare pontos, idade progressiva, pedágios e idade", url: "/aposentadoria/simulador-de-aposentadoria/", busca: ["aposentadoria", "inss", "aposentar", "regra de transição", "pontos", "pedágio", "idade mínima", "tempo de contribuição", "simulador"] },
    ],
  },
  {
    slug: "financiamentos",
    nome: "Financiamentos e empréstimos",
    descricao: "Simule parcelas, juros e o custo total antes de assinar.",
    calculadoras: [
      { titulo: "Financiamento imobiliário", resumo: "SAC e Price lado a lado", url: "/financiamentos/financiamento-imobiliario/", busca: ["imóvel", "imovel", "casa", "apartamento", "sac", "price", "caixa"] },
      { titulo: "Empréstimo e financiamento de veículo", resumo: "Parcela, juros e taxa real", url: "/financiamentos/simulador-de-emprestimo/", busca: ["carro", "moto", "consignado", "cet", "emprestimo", "taxa de juros"] },
      { titulo: "Juros compostos", resumo: "Quanto um valor rende ao longo do tempo", url: "/financiamentos/juros-compostos/", busca: ["investimento", "rendimento", "aporte"] },
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
      { titulo: "Reajuste de aluguel", resumo: "IGP-M, IPCA ou INPC acumulado", url: "/aluguel/reajuste-de-aluguel/", busca: ["igpm", "igp-m", "ipca", "inpc", "reajuste", "aluguel"] },
      { titulo: "Multa por quebra de contrato", resumo: "Proporcional aos meses restantes", busca: ["multa", "rescisão aluguel"] },
    ],
  },
  {
    slug: "reforma-tributaria",
    nome: "Reforma tributária",
    descricao: "A CBS começa a ser cobrada em 1º de janeiro de 2027 e substitui o PIS e a Cofins. O IBS substitui o ICMS e o ISS entre 2029 e 2033.",
    calculadoras: [
      { titulo: "CBS e IBS no preço", resumo: "Quanto de CBS e IBS em 2026, 2027 e 2028", url: "/reforma-tributaria/cbs-ibs-no-preco/", busca: ["cbs", "ibs", "iva", "reforma tributaria", "imposto", "pis", "cofins"] },
    ],
  },
];

export const TODAS = CATEGORIAS.flatMap((c) => c.calculadoras.map((calc) => ({ ...calc, categoria: c.nome })));
