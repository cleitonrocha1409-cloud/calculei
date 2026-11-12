export const arred = (v: number) => Math.round(Number((v * 100).toFixed(6))) / 100;

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const formatarBRL = (v: number) => brl.format(arred(v));

const num = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const formatarNumero = (v: number) => num.format(arred(v));

/** Converte "3.500,75", "3500.75" ou "3500" em número. */
export function lerValor(texto: string): number {
  if (!texto) return NaN;
  let t = texto.replace(/[^\d.,-]/g, "");
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  return Number(t);
}
