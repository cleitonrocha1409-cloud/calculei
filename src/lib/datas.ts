// Datas em UTC, sempre no formato ISO "AAAA-MM-DD", para evitar erros de fuso.

const DIA = 86_400_000;

export const lerData = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d));
};
export const paraISO = (d: Date) => d.toISOString().slice(0, 10);
export const somarDias = (d: Date, n: number) => new Date(d.getTime() + n * DIA);
export const diasEntre = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DIA); // b − a

const ultimoDiaDoMes = (ano: number, mes: number) => new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();

/** Soma meses mantendo o dia, limitado ao último dia do mês de destino. */
export function somarMeses(d: Date, n: number): Date {
  const ano = d.getUTCFullYear();
  const mes = d.getUTCMonth() + n;
  const alvoAno = ano + Math.floor(mes / 12);
  const alvoMes = ((mes % 12) + 12) % 12;
  const dia = Math.min(d.getUTCDate(), ultimoDiaDoMes(alvoAno, alvoMes));
  return new Date(Date.UTC(alvoAno, alvoMes, dia));
}

export const ehUltimoDiaDoMes = (d: Date) => d.getUTCDate() === ultimoDiaDoMes(d.getUTCFullYear(), d.getUTCMonth());

/** Anos completos de serviço entre a admissão e a data final. */
export function anosCompletos(admissao: Date, fim: Date): number {
  let anos = fim.getUTCFullYear() - admissao.getUTCFullYear();
  if (somarMeses(admissao, anos * 12) > fim) anos--;
  return Math.max(0, anos);
}

/** Avos de 13º: meses do ano da saída com 15 dias ou mais trabalhados (Lei 4.090/1962). */
export function avosDecimoTerceiro(admissao: Date, fim: Date): number {
  const ano = fim.getUTCFullYear();
  const inicioAno = new Date(Date.UTC(ano, 0, 1));
  const inicio = admissao > inicioAno ? admissao : inicioAno;
  let avos = 0;
  for (let m = inicio.getUTCMonth(); m <= fim.getUTCMonth(); m++) {
    const primeiro = new Date(Date.UTC(ano, m, 1));
    const ultimo = new Date(Date.UTC(ano, m, ultimoDiaDoMes(ano, m)));
    const de = inicio > primeiro ? inicio : primeiro;
    const ate = fim < ultimo ? fim : ultimo;
    if (diasEntre(de, ate) + 1 >= 15) avos++;
  }
  return avos;
}

/**
 * Avos de férias proporcionais no período aquisitivo em curso:
 * meses completos desde o último aniversário da admissão, mais 1 se a fração for de 15 dias ou mais (art. 146 da CLT).
 */
export function avosFerias(admissao: Date, fim: Date): number {
  const aniversario = somarMeses(admissao, anosCompletos(admissao, fim) * 12);
  let meses = 0;
  while (meses < 12 && somarDias(somarMeses(aniversario, meses + 1), -1) <= fim) meses++;
  if (meses < 12) {
    const resto = diasEntre(somarMeses(aniversario, meses), fim) + 1;
    if (resto >= 15) meses++;
  }
  return Math.min(12, meses);
}

/** Dias de saldo de salário no mês da saída (mês comercial de 30 dias). */
export function diasSaldoSalario(admissao: Date, fim: Date): number {
  const mesmoMes = admissao.getUTCFullYear() === fim.getUTCFullYear() && admissao.getUTCMonth() === fim.getUTCMonth();
  if (mesmoMes) return Math.min(30, diasEntre(admissao, fim) + 1);
  return ehUltimoDiaDoMes(fim) ? 30 : Math.min(30, fim.getUTCDate());
}

export const formatarData = (d: Date) =>
  `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
