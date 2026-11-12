export const arred = (v: number) => Math.round(Number((v * 100).toFixed(6))) / 100;

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const formatarBRL = (v: number) => brl.format(arred(v));

const num = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const formatarNumero = (v: number) => num.format(arred(v));

/** Converte "3.500,75", "5.000", "3500.75" ou "3500" em número. */
export function lerValor(texto: string): number {
  if (!texto) return NaN;
  let t = texto.replace(/[^\d.,-]/g, "");
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, ""); // ponto de milhar sem vírgula: "5.000"
  return Number(t);
}
