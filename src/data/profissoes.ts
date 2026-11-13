// Fim da escala 6x1 por profissão (EC 141/2026). Textos revisados contra a emenda e a CLT.
// Os salários são apenas exemplos para mostrar a conta, não pisos da categoria.

export interface Profissao {
  slug: string;
  nome: string; // como aparece em listas: "Comércio e lojas"
  titulo: string; // <title>
  descricao: string; // meta description
  h1: string;
  resposta: string; // primeira frase: resposta direta
  escala: "6x1" | "12x36";
  salarioExemplo: number;
  secoes: { h2: string; paragrafos: string[] }[];
  perguntas: { p: string; r: string }[];
}

const SEM_REDUCAO = "A emenda proíbe reduzir o salário ou o piso da categoria por causa da nova jornada (art. 2º da EC 141/2026).";

export const PROFISSOES: Profissao[] = [
  {
    slug: "comercio",
    nome: "Comércio e lojas",
    titulo: "Fim da escala 6x1 no comércio: folgas, domingos e valor da hora",
    descricao: "Como fica a escala do comerciário com o fim da 6x1: duas folgas por semana a partir de 16/12/2026, domingos, jornada de 42h e 40h e quanto a sua hora passa a valer.",
    h1: "Fim da escala 6x1 no comércio",
    resposta:
      "No comércio, a escala 6x1 deixa de ser permitida em 16/12/2026: o comerciário passa a ter duas folgas por semana, com jornada de até 42 horas (40 horas sem acordo coletivo) e de 40 horas a partir de 16/12/2027, sem redução de salário.",
    escala: "6x1",
    salarioExemplo: 2200,
    secoes: [
      {
        h2: "O que muda para o comerciário",
        paragrafos: [
          "Hoje a maioria das lojas trabalha em 6x1, com 44 horas por semana e uma folga. Com a emenda, cada empregado passa a ter dois dias de repouso remunerado por semana, um deles preferencialmente no domingo. A jornada diária continua limitada a 8 horas.",
          SEM_REDUCAO,
          "A loja pode continuar abrindo de segunda a domingo. O que muda é a escala da equipe: as folgas passam a ser distribuídas em revezamento para que cada pessoa tenha duas por semana.",
        ],
      },
      {
        h2: "E o trabalho aos domingos?",
        paragrafos: [
          "O comércio continua podendo abrir aos domingos, conforme a lei municipal e a convenção coletiva. A Lei 10.101/2000 já exige que a folga do comerciário caia no domingo pelo menos uma vez a cada três semanas, e a emenda reforça a preferência pelo domingo.",
        ],
      },
    ],
    perguntas: [
      { p: "A loja pode me obrigar a trabalhar seis dias depois de dezembro?", r: "Não como regra. A partir de 16/12/2026 a Constituição garante dois dias de repouso remunerado por semana. Trabalho além disso só como hora extra, dentro dos limites legais." },
      { p: "Vou ganhar menos trabalhando menos horas?", r: "Não. O salário mensal fica igual e o valor de cada hora sobe, porque o mesmo salário remunera menos horas." },
      { p: "Minha convenção coletiva vale até o fim do prazo?", r: "Cláusulas de jornada incompatíveis com a emenda perdem efeito em 16/12/2026 (art. 3º da EC 141/2026). Sindicato e empresas precisam renegociar escalas, banco de horas e folgas." },
    ],
  },
  {
    slug: "supermercado",
    nome: "Supermercado",
    titulo: "Fim da escala 6x1 no supermercado: como ficam as folgas e a escala",
    descricao: "Operador de caixa, repositor e açougueiro: como fica a escala no supermercado com o fim da 6x1, as duas folgas, os domingos e o valor da hora a partir de dezembro de 2026.",
    h1: "Fim da escala 6x1 no supermercado",
    resposta:
      "No supermercado, quem trabalha em 6x1 passa a ter duas folgas por semana a partir de 16/12/2026, com jornada de até 42 horas (40 sem acordo coletivo) e de 40 horas a partir de 16/12/2027; o salário não pode ser reduzido.",
    escala: "6x1",
    salarioExemplo: 2100,
    secoes: [
      {
        h2: "O que muda para quem trabalha no supermercado",
        paragrafos: [
          "Operadores de caixa, repositores, açougueiros, padeiros e fiscais de loja costumam trabalhar 44 horas em 6x1. Com a emenda, cada um passa a ter dois dias de repouso remunerado por semana, um preferencialmente no domingo, e no máximo 8 horas por dia.",
          SEM_REDUCAO,
          "Como a loja abre todos os dias, a solução mais comum é a escala 5x2 com folgas em revezamento. Para cobrir o mesmo horário com menos horas por pessoa, muitas lojas vão precisar de mais gente ou de hora extra.",
        ],
      },
    ],
    perguntas: [
      { p: "O supermercado vai fechar um dia por semana?", r: "Não precisa. A emenda limita as horas de cada empregado, não o horário da loja. A loja pode abrir todos os dias com folgas em revezamento." },
      { p: "Se eu fizer hora extra, quanto ela vale?", r: "A hora extra vale no mínimo 50% a mais que a hora normal. Como a hora normal sobe com a jornada menor, a hora extra também sobe." },
    ],
  },
  {
    slug: "restaurante",
    nome: "Bares e restaurantes",
    titulo: "Fim da escala 6x1 em bares e restaurantes: garçom, cozinheiro e folgas",
    descricao: "Como fica a escala de garçons, cozinheiros e atendentes com o fim da 6x1: duas folgas por semana, fins de semana, gorjeta e valor da hora a partir de dezembro de 2026.",
    h1: "Fim da escala 6x1 em bares e restaurantes",
    resposta:
      "Em bares e restaurantes, garçons, cozinheiros e atendentes em 6x1 passam a ter duas folgas por semana a partir de 16/12/2026, com jornada de até 42 horas (40 sem acordo coletivo) e de 40 horas em 16/12/2027, sem redução de salário nem da gorjeta.",
    escala: "6x1",
    salarioExemplo: 2000,
    secoes: [
      {
        h2: "O que muda para garçons, cozinheiros e atendentes",
        paragrafos: [
          "O setor é um dos que mais usam a escala 6x1, porque funciona à noite e nos fins de semana. A partir de 16/12/2026, cada empregado passa a ter dois dias de repouso remunerado por semana e jornada máxima de 8 horas por dia.",
          SEM_REDUCAO,
          "A gorjeta continua sendo do trabalhador e entra no cálculo de férias, 13º e FGTS, como prevê a Lei 13.419/2017. A nova jornada não muda essas regras.",
        ],
      },
      {
        h2: "Posso folgar só durante a semana?",
        paragrafos: [
          "Pode. A emenda diz que um dos dois dias de repouso deve ser preferencialmente no domingo, não obrigatoriamente. Em restaurantes que abrem no fim de semana, as folgas costumam cair entre segunda e quinta, em revezamento.",
        ],
      },
    ],
    perguntas: [
      { p: "A gorjeta diminui com a jornada menor?", r: "A emenda não trata da gorjeta. O que ela garante é que o salário fixo e o piso não podem ser reduzidos. O valor da gorjeta continua dependendo do movimento e das regras do estabelecimento." },
      { p: "Trabalho por hora (intermitente). O que muda?", r: "No contrato intermitente você recebe pelas horas convocadas. A emenda limita a jornada semanal e garante o repouso, mas o valor da sua hora depende do contrato, que não pode ficar abaixo do salário mínimo por hora." },
    ],
  },
  {
    slug: "frentista",
    nome: "Frentista",
    titulo: "Fim da escala 6x1 para frentista: escala no posto e valor da hora",
    descricao: "Como fica a escala do frentista com o fim da 6x1: 6x1, 5x2 ou 12x36 no posto de combustível, folgas, adicional de periculosidade e valor da hora a partir de dezembro de 2026.",
    h1: "Fim da escala 6x1 para frentista",
    resposta:
      "O frentista que trabalha em 6x1 passa a ter duas folgas por semana a partir de 16/12/2026, com jornada de até 42 horas (40 sem acordo coletivo) e de 40 horas em 16/12/2027; o salário e o adicional de periculosidade de 30% continuam.",
    escala: "6x1",
    salarioExemplo: 2300,
    secoes: [
      {
        h2: "O que muda no posto de combustível",
        paragrafos: [
          "Postos que funcionam 24 horas usam 6x1, 5x2 ou 12x36. Quem está em 6x1 passa para duas folgas por semana e no máximo 8 horas por dia. Quem está em 12x36 continua na escala, mas com regras ainda em discussão (veja a pergunta abaixo).",
          SEM_REDUCAO,
          "O adicional de periculosidade continua sendo 30% do salário-base. Como o salário não muda, o adicional também não muda; o que aumenta é o valor de cada hora.",
        ],
      },
    ],
    perguntas: [
      { p: "Quem trabalha 12x36 no posto também muda?", r: "A emenda não acaba com a 12x36, mas o limite semanal de 40 horas a partir de 16/12/2027 levanta dúvidas sobre as semanas com quatro plantões. Acordos e convenções coletivas devem ajustar a escala; acompanhe o seu sindicato." },
      { p: "A periculosidade entra no valor da hora extra?", r: "Sim. A hora extra é calculada sobre o salário mais o adicional de periculosidade, dividido pelo divisor de horas do mês." },
    ],
  },
  {
    slug: "empregada-domestica",
    nome: "Empregada doméstica",
    titulo: "Fim da escala 6x1 para empregada doméstica: jornada, folgas e salário",
    descricao: "Como fica a jornada da empregada doméstica e do cuidador com o fim da 6x1: duas folgas por semana, 42h e 40h, valor da hora e o que muda para quem contrata.",
    h1: "Fim da escala 6x1 para empregada doméstica",
    resposta:
      "A empregada doméstica com carteira assinada também passa a ter duas folgas por semana a partir de 16/12/2026, com jornada de até 42 horas (40 sem acordo coletivo) e de 40 horas em 16/12/2027, sem redução de salário; a diarista não é afetada.",
    escala: "6x1",
    salarioExemplo: 1800,
    secoes: [
      {
        h2: "Por que a regra vale para domésticas",
        paragrafos: [
          "O direito à jornada máxima do art. 7º, XIII, da Constituição vale para os trabalhadores domésticos (parágrafo único do art. 7º e Lei Complementar 150/2015). Como a emenda mudou esse inciso, o novo limite também vale para empregadas domésticas, babás, cuidadores, caseiros e motoristas particulares com carteira assinada.",
          SEM_REDUCAO,
          "A diarista, que trabalha até dois dias por semana na mesma casa, não tem vínculo de emprego e não entra nessa regra.",
        ],
      },
      {
        h2: "O que muda para quem contrata",
        paragrafos: [
          "Quem tem doméstica trabalhando de segunda a sábado precisa reorganizar a semana para cinco dias de até 8 horas. Se precisar de mais horas, elas são horas extras, com acréscimo de pelo menos 50%, ou podem entrar em banco de horas nas regras da LC 150/2015.",
          "Vale lembrar de ajustar o registro no eSocial Doméstico se o horário contratual mudar.",
        ],
      },
    ],
    perguntas: [
      { p: "Cuidadora de idoso que dorme no emprego também muda?", r: "Sim, o limite de jornada vale para ela. O tempo de descanso dentro da casa não conta como trabalho, mas as horas efetivamente trabalhadas precisam respeitar o novo limite semanal e as duas folgas." },
      { p: "Posso reduzir o salário porque ela vai trabalhar menos?", r: "Não. A emenda proíbe reduzir o salário por causa da nova jornada." },
    ],
  },
  {
    slug: "enfermagem",
    nome: "Enfermagem",
    titulo: "Fim da escala 6x1 na enfermagem: 12x36, plantões e contratos de 44 horas",
    descricao: "Como fica a enfermagem com o fim da 6x1: a escala 12x36 continua, contratos de 44 horas em clínicas passam a 40h, o piso não pode ser reduzido e o valor da hora sobe.",
    h1: "Fim da escala 6x1 na enfermagem",
    resposta:
      "Na enfermagem, a escala 12x36 continua permitida com o fim da 6x1, mas os contratos de 44 horas em clínicas e ambulatórios passam a ter duas folgas e no máximo 42 horas em 16/12/2026 (40 sem acordo coletivo) e 40 horas em 16/12/2027, sem redução do salário nem do piso.",
    escala: "12x36",
    salarioExemplo: 3000,
    secoes: [
      {
        h2: "Plantão 12x36",
        paragrafos: [
          "A emenda não proíbe a escala 12x36, que segue prevista no art. 59-A da CLT. O ponto em aberto é a média: em 28 dias são 14 plantões, com semanas de três e de quatro plantões, e a semana de quatro plantões passa do limite de 40 horas. Hospitais e sindicatos devem ajustar a escala por acordo ou convenção coletiva até 16/12/2027.",
        ],
      },
      {
        h2: "Contratos de 44 horas e 6x1",
        paragrafos: [
          "Técnicos e auxiliares em clínicas, consultórios e ambulatórios que trabalham 44 horas em 6x1 seguem a regra geral: duas folgas por semana a partir de 16/12/2026 e jornada de 42 horas (40 sem acordo coletivo), caindo para 40 horas em 16/12/2027.",
          "A emenda proíbe reduzir o salário e os pisos salariais por causa da nova jornada, o que inclui o piso nacional da enfermagem (Lei 14.434/2022).",
        ],
      },
    ],
    perguntas: [
      { p: "A 12x36 vai acabar?", r: "Não. A emenda não extingue a 12x36. O que pode mudar é a forma de compensar as semanas com mais horas, que deve ser definida em negociação coletiva." },
      { p: "Quem faz 30 horas semanais muda alguma coisa?", r: "Quem já trabalha menos de 40 horas por semana não tem a jornada reduzida. Mas passa a ter direito a dois dias de repouso por semana." },
    ],
  },
  {
    slug: "vigilante-e-porteiro",
    nome: "Vigilante e porteiro",
    titulo: "Fim da escala 6x1 para vigilante e porteiro: 12x36 e plantões",
    descricao: "Como fica a escala de vigilantes, porteiros e controladores de acesso com o fim da 6x1: 12x36 continua, mas com limite de 40 horas em 2027; veja folgas e valor da hora.",
    h1: "Fim da escala 6x1 para vigilante e porteiro",
    resposta:
      "Para vigilantes e porteiros, a escala 12x36 continua permitida com o fim da 6x1, e quem trabalha em 6x1 passa a ter duas folgas a partir de 16/12/2026; a partir de 16/12/2027, a jornada média não pode passar de 40 horas por semana, o que deve ser ajustado em convenção coletiva.",
    escala: "12x36",
    salarioExemplo: 2400,
    secoes: [
      {
        h2: "Escala 12x36 na vigilância e na portaria",
        paragrafos: [
          "A 12x36 é a escala mais comum em condomínios e empresas de vigilância. A emenda não a proíbe, mas a média da 12x36 fica em torno de 42 horas por semana, acima do limite de 40 horas que vale a partir de 16/12/2027. A emenda permite que convenções ou acordos coletivos de atividades essenciais, como a segurança, prevejam compensação respeitando a média.",
          SEM_REDUCAO,
        ],
      },
      {
        h2: "Porteiro em 6x1",
        paragrafos: [
          "Porteiros de condomínio em turnos de 8 horas, seis dias por semana, seguem a regra geral: duas folgas por semana a partir de 16/12/2026 e jornada de 42 horas com acordo coletivo ou 40 horas sem ele. O condomínio pode precisar de um folguista a mais.",
        ],
      },
    ],
    perguntas: [
      { p: "O condomínio vai ter que contratar mais porteiros?", r: "Em muitos casos, sim, ou pagar horas extras. Com duas folgas por pessoa, cobrir a portaria 24 horas exige mais turnos. Use o montador de escala para ver quantas pessoas a equipe precisa." },
      { p: "O vigilante perde o adicional de periculosidade?", r: "Não. O adicional de 30% continua sobre o salário-base, que não pode ser reduzido." },
    ],
  },
];
