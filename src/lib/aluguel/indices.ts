// Índices de preços do Banco Central (SGS). Variação mensal em %.
export const SERIES = {
  igpm: { nome: "IGP-M", codigo: 189, fonte: "FGV, via Banco Central (SGS 189)" },
  ipca: { nome: "IPCA", codigo: 433, fonte: "IBGE, via Banco Central (SGS 433)" },
  inpc: { nome: "INPC", codigo: 188, fonte: "IBGE, via Banco Central (SGS 188)" },
} as const;

export type Indice = keyof typeof SERIES;
export type Serie = { mes: string; valor: number }[]; // mes = "AAAA-MM"

/** Converte a resposta da API do SGS ([{data: "01/10/2026", valor: "0.52"}]) para a nossa série. */
export function lerSGS(json: unknown): Serie {
  if (!Array.isArray(json)) return [];
  const serie: Serie = [];
  for (const item of json) {
    const data = String((item as { data?: string }).data ?? "");
    const valor = Number(String((item as { valor?: string }).valor ?? "").replace(",", "."));
    const m = data.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m || !Number.isFinite(valor)) continue;
    serie.push({ mes: `${m[3]}-${m[2]}`, valor });
  }
  return serie.sort((a, b) => a.mes.localeCompare(b.mes));
}

/** Busca as últimas variações no Banco Central durante o build. Falha em silêncio: a página oferece o modo manual. */
export async function buscarSeries(meses = 36): Promise<Partial<Record<Indice, Serie>>> {
  const resultado: Partial<Record<Indice, Serie>> = {};
  await Promise.all(
    (Object.keys(SERIES) as Indice[]).map(async (k) => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 10_000);
        const r = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${SERIES[k].codigo}/dados/ultimos/${meses}?formato=json`, { signal: ctrl.signal });
        clearTimeout(t);
        if (!r.ok) return;
        const serie = lerSGS(await r.json());
        if (serie.length >= 12) resultado[k] = serie;
      } catch {
        // sem rede no build: segue sem a série
      }
    }),
  );
  return resultado;
}
