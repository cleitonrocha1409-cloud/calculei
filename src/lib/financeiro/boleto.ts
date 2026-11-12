// Boleto ou conta em atraso: multa (uma vez) + juros de mora simples, proporcionais aos dias.
import { FERIADOS } from "../../data/calendarios";
import { arred } from "../dinheiro";

export const MULTA_MAXIMA_CONSUMO = 0.02; // CDC, art. 52, § 1º

export interface EntradaBoleto {
  valor: number;
  vencimento: string; // AAAA-MM-DD
  pagamento: string; // AAAA-MM-DD
  multa: number; // fração (0,02)
  jurosMes: number; // fração ao mês (0,01)
}

export interface ResultadoBoleto {
  vencimentoEfetivo: string;
  prorrogado: boolean;
  dias: number;
  multa: number;
  juros: number;
  jurosDia: number; // fração ao dia
  total: number;
  acimaDoLimite: boolean;
}

const dia = (iso: string) => new Date(iso + "T12:00:00Z");
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Vencimento em sábado, domingo ou feriado nacional passa para o próximo dia útil. */
export function proximoDiaUtil(data: string) {
  let d = dia(data);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6 || FERIADOS.includes(iso(d))) d = new Date(d.getTime() + 86400000);
  return iso(d);
}

export function calcularBoleto(e: EntradaBoleto): ResultadoBoleto {
  const vencimentoEfetivo = proximoDiaUtil(e.vencimento);
  const dias = Math.max(0, Math.round((dia(e.pagamento).getTime() - dia(vencimentoEfetivo).getTime()) / 86400000));
  const atrasado = dias > 0;
  const jurosDia = e.jurosMes / 30;
  const multa = atrasado ? arred(e.valor * e.multa) : 0;
  const juros = atrasado ? arred(e.valor * jurosDia * dias) : 0;
  return {
    vencimentoEfetivo,
    prorrogado: vencimentoEfetivo !== e.vencimento,
    dias,
    multa,
    juros,
    jurosDia,
    total: arred(e.valor + multa + juros),
    acimaDoLimite: e.multa > MULTA_MAXIMA_CONSUMO,
  };
}
