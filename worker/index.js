// Worker do Calculei: serve o site estático e a rota /api/indices,
// que busca os índices de preços no Banco Central e guarda em cache por 6 horas.

const SERIES = { igpm: 189, ipca: 433, inpc: 188, igpdi: 190 };
const SEIS_HORAS = 6 * 3600;

async function indices(request, ctx) {
  const cache = caches.default;
  const chave = new Request(new URL("/api/indices?v=1", request.url).toString());
  const guardada = await cache.match(chave);
  if (guardada) return guardada;

  const dados = {};
  await Promise.all(
    Object.entries(SERIES).map(async ([nome, codigo]) => {
      try {
        const r = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados/ultimos/60?formato=json`, {
          headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; Calculei/1.0; +https://calculei.com.br)" },
        });
        if (r.ok) {
          const json = await r.json();
          if (Array.isArray(json) && json.length) dados[nome] = json;
        }
      } catch {
        // segue sem este índice
      }
    }),
  );

  const ok = Object.keys(dados).length > 0;
  const resposta = new Response(JSON.stringify(dados), {
    status: ok ? 200 : 502,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": ok ? `public, max-age=${SEIS_HORAS}` : "no-store",
    },
  });
  if (ok) ctx.waitUntil(cache.put(chave, resposta.clone()));
  return resposta;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/indices" || url.pathname === "/api/indices/") return indices(request, ctx);
    return env.ASSETS.fetch(request);
  },
};
