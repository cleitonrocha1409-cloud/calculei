// Utilidades para documentos (holerite e recibos): validação de CPF/CNPJ, máscaras e número de controle.

const digitos = (t: string) => t.replace(/\D/g, "");

export function cpfValido(cpf: string): boolean {
  const d = digitos(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (n: number) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

export function cnpjValido(cnpj: string): boolean {
  const d = digitos(cnpj);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const dv = (n: number) => {
    const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = pesos.reduce((t, p, i) => t + Number(d[i]) * p, 0);
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(12) === Number(d[12]) && dv(13) === Number(d[13]);
}

export const mascararCPF = (t: string) => {
  const d = digitos(t).slice(0, 11);
  return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};

export const mascararCNPJ = (t: string) => {
  const d = digitos(t).slice(0, 14);
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
};

/** Número de controle do documento: 8 caracteres derivados do conteúdo (FNV-1a), para conferência. */
export function numeroControle(conteudo: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < conteudo.length; i++) {
    h ^= conteudo.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  const s = h.toString(36).toUpperCase().padStart(7, "0").slice(-7);
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

export const MESES_NOME = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export const nomeCompetencia = (comp: string) => {
  const [a, m] = comp.split("-").map(Number);
  const nome = MESES_NOME[m - 1];
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)}/${a}`;
};
