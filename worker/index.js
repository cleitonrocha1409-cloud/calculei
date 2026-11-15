// Worker do Cálculo em Dia: serve o site estático, a rota /api/indices
// (índices de preços do Banco Central, com cache de 6 horas) e a rota /api/lista-espera
// (inscrições na lista de espera do Cálculo em Dia Empresas, gravadas no banco D1 "LISTA").

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
          headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; CalculoEmDia/1.0; +https://calculoemdia.com.br)" },
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

const PERFIS = ["dono", "contador", "outro"];
const FAIXAS = ["1-3", "4-10", "11-20", "21+"];
const INTERESSES = ["holerite", "ferias-13", "ponto", "escalas", "contador", "rescisao"];
const json = (dados, status = 200) =>
  new Response(JSON.stringify(dados), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

async function hash(texto) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

/** Valida a inscrição; devolve os dados limpos ou uma mensagem de erro para mostrar à pessoa. */
export function validarInscricao(d) {
  if (!d || typeof d !== "object") return { erro: "Dados inválidos." };
  if (d.site) return { robo: true }; // campo escondido: só robôs preenchem
  const nome = String(d.nome ?? "").trim().replace(/\s+/g, " ");
  const email = String(d.email ?? "").trim().toLowerCase();
  const whatsapp = String(d.whatsapp ?? "").replace(/\D/g, "");
  if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { erro: "Confira o e-mail." };
  if (nome.length > 90) return { erro: "Nome muito longo." };
  if (whatsapp && (whatsapp.length < 10 || whatsapp.length > 13)) return { erro: "Confira o WhatsApp, com DDD." };
  if (d.perfil && !PERFIS.includes(d.perfil)) return { erro: "Escolha uma das opções de perfil." };
  if (d.funcionarios && !FAIXAS.includes(d.funcionarios)) return { erro: "Escolha o número de funcionários." };
  if (d.consentimento !== true) return { erro: "Marque a autorização para avisarmos você." };
  const interesses = Array.isArray(d.interesses) ? d.interesses.filter((i) => INTERESSES.includes(i)) : [];
  const origem = typeof d.origem === "string" && d.origem.startsWith("/") ? d.origem.slice(0, 120) : null;
  return { dados: { nome, email, whatsapp: whatsapp || null, perfil: d.perfil || "nao-informado", funcionarios: d.funcionarios || null, interesses: interesses.join(","), origem } };
}

async function listaEspera(request, env) {
  if (request.method !== "POST") return json({ erro: "Use POST." }, 405);
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).hostname !== new URL(request.url).hostname) return json({ erro: "Origem não permitida." }, 403);
  if (!env.LISTA) return json({ erro: "Lista indisponível no momento." }, 503);
  let corpo;
  try {
    corpo = await request.json();
  } catch {
    return json({ erro: "Dados inválidos." }, 400);
  }
  const v = validarInscricao(corpo);
  if (v.robo) return json({ ok: true });
  if (v.erro) return json({ erro: v.erro }, 400);

  // Limite de 5 inscrições por hora por endereço, sem guardar o IP (hash com o dia).
  const dia = new Date().toISOString().slice(0, 10);
  const ipHash = await hash(`${request.headers.get("cf-connecting-ip") ?? ""}|${dia}|calculoemdia`);
  const recentes = await env.LISTA.prepare("SELECT COUNT(*) AS n FROM inscricoes WHERE ip_hash = ? AND criado_em > strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-1 hour')")
    .bind(ipHash)
    .first();
  if ((recentes?.n ?? 0) >= 5) return json({ erro: "Muitas inscrições seguidas. Tente de novo mais tarde." }, 429);

  const d = v.dados;
  await env.LISTA.prepare(
    `INSERT INTO inscricoes (nome, email, whatsapp, perfil, funcionarios, interesses, origem, consentimento_em, ip_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), ?)
     ON CONFLICT(email) DO UPDATE SET
       nome = CASE WHEN excluded.nome <> '' THEN excluded.nome ELSE nome END,
       whatsapp = COALESCE(excluded.whatsapp, whatsapp),
       perfil = CASE WHEN excluded.perfil <> 'nao-informado' THEN excluded.perfil ELSE perfil END,
       funcionarios = COALESCE(excluded.funcionarios, funcionarios),
       interesses = CASE WHEN excluded.interesses <> '' THEN excluded.interesses ELSE interesses END,
       consentimento_em = excluded.consentimento_em`,
  )
    .bind(d.nome, d.email, d.whatsapp, d.perfil, d.funcionarios, d.interesses, d.origem, ipHash)
    .run();
  return json({ ok: true });
}

/** Saída da lista: apaga a inscrição do e-mail informado. */
async function sairDaLista(request, env) {
  if (request.method !== "POST") return json({ erro: "Use POST." }, 405);
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).hostname !== new URL(request.url).hostname) return json({ erro: "Origem não permitida." }, 403);
  if (!env.LISTA) return json({ erro: "Lista indisponível no momento." }, 503);
  let corpo;
  try {
    corpo = await request.json();
  } catch {
    return json({ erro: "Dados inválidos." }, 400);
  }
  const email = String(corpo?.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ erro: "Confira o e-mail." }, 400);
  await env.LISTA.prepare("DELETE FROM inscricoes WHERE email = ?").bind(email).run();
  // Mesma resposta exista ou não a inscrição, para não revelar quem está na lista.
  return json({ ok: true });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // Endereço único: www.calculoemdia.com.br leva para calculoemdia.com.br (melhor para o Google).
    if (url.hostname === "www.calculoemdia.com.br") {
      url.hostname = "calculoemdia.com.br";
      return Response.redirect(url.toString(), 301);
    }
    if (url.pathname === "/api/indices" || url.pathname === "/api/indices/") return indices(request, ctx);
    if (url.pathname === "/api/lista-espera") return listaEspera(request, env);
    if (url.pathname === "/api/lista-espera/sair") return sairDaLista(request, env);
    return env.ASSETS.fetch(request);
  },
};
