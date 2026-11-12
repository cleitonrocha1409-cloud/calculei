// Índices de preços do Banco Central (SGS). Variação mensal em %.
export const SERIES = {
  igpm: { nome: "IGP-M", codigo: 189, fonte: "FGV, via Banco Central (SGS 189)" },
  ipca: { nome: "IPCA", codigo: 433, fonte: "IBGE, via Banco Central (SGS 433)" },
  inpc: { nome: "INPC", codigo: 188, fonte: "IBGE, via Banco Central (SGS 188)" },
  igpdi: { nome: "IGP-DI", codigo: 190, fonte: "FGV, via Banco Central (SGS 190)" },
} as const;

export type Indice = keyof typeof SERIES;
export type Serie = { mes: string; valor: number }[]; // mes = "AAAA-MM"
export type Series = Partial<Record<Indice, Serie>>;

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

const url = (codigo: number, meses: number) => `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados/ultimos/${meses}?formato=json`;

async function buscarUma(codigo: number, meses: number, tentativas = 2): Promise<Serie> {
  for (let t = 0; t < tentativas; t++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12_000);
      const r = await fetch(url(codigo, meses), { signal: ctrl.signal, headers: { Accept: "application/json" } });
      clearTimeout(timer);
      if (r.ok) {
        const serie = lerSGS(await r.json());
        if (serie.length >= 12) return serie;
      }
    } catch {
      // tenta de novo
    }
  }
  return [];
}

/**
 * Busca as variações mensais no Banco Central. Funciona no build e no navegador.
 * Nunca lança erro: devolve só os índices que vieram.
 */
export async function buscarSeries(meses = 60): Promise<Series> {
  const resultado: Series = {};
  await Promise.all(
    (Object.keys(SERIES) as Indice[]).map(async (k) => {
      const serie = await buscarUma(SERIES[k].codigo, meses);
      if (serie.length) resultado[k] = serie;
    }),
  );
  return resultado;
}

/** Busca pela rota do próprio site (/api/indices), que consulta o Banco Central no servidor. */
export async function buscarSeriesViaSite(): Promise<Series> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12_000);
    const r = await fetch("/api/indices", { signal: ctrl.signal, headers: { Accept: "application/json" } });
    clearTimeout(timer);
    if (!r.ok) return {};
    const bruto = (await r.json()) as Record<string, unknown>;
    const resultado: Series = {};
    for (const k of Object.keys(SERIES) as Indice[]) {
      const serie = lerSGS(bruto[k]);
      if (serie.length >= 12) resultado[k] = serie;
    }
    return resultado;
  } catch {
    return {};
  }
}

/** Junta duas fontes: a mais nova prevalece mês a mês e acrescenta os meses que faltam. */
export function mesclar(base: Series, novas: Series): Series {
  const r: Series = { ...base };
  for (const k of Object.keys(novas) as Indice[]) {
    const mapa = new Map((base[k] ?? []).map((p) => [p.mes, p.valor]));
    for (const p of novas[k] ?? []) mapa.set(p.mes, p.valor);
    r[k] = [...mapa.entries()].map(([mes, valor]) => ({ mes, valor })).sort((a, b) => a.mes.localeCompare(b.mes));
  }
  return r;
}

/** Último mês disponível entre as séries (para saber se os dados estão atualizados). */
export function ultimoMes(series: Series): string | null {
  const meses = Object.values(series)
    .map((s) => s?.[s.length - 1]?.mes)
    .filter(Boolean) as string[];
  return meses.length ? meses.sort().at(-1)! : null;
}
