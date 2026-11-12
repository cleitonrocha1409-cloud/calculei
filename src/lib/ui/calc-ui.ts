// Peças de interface usadas por todas as calculadoras (lado do navegador).
import { formatarBRL } from "../dinheiro";

export const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export interface LinhaUI {
  rotulo: string;
  valor: number;
  memoria: string;
  base?: string;
}

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function linhaHTML(l: LinhaUI, desconto = false) {
  return `<li><details><summary><span>${esc(l.rotulo)}</span><span class="valor ${desconto ? "neg" : ""}">${desconto ? "− " : ""}${formatarBRL(l.valor)}</span></summary>
    <p>${esc(l.memoria)}${l.base ? `<br><span class="base">${esc(l.base)}</span>` : ""}</p></details></li>`;
}

export const listaHTML = (linhas: LinhaUI[], desconto = false) => `<ul class="linhas">${linhas.map((l) => linhaHTML(l, desconto)).join("")}</ul>`;

export const subtotalHTML = (rotulo: string, valor: number, desconto = false) =>
  `<p class="subtotal"><span>${esc(rotulo)}</span><span class="${desconto ? "neg" : ""}">${desconto ? "− " : ""}${formatarBRL(valor)}</span></p>`;

export const destaqueHTML = (rotulo: string, valor: number) => `<p class="liquido"><span>${esc(rotulo)}</span><strong>${formatarBRL(valor)}</strong></p>`;

export const topoHTML = (titulo: string, sub: string) =>
  `<header class="holerite__topo"><p class="holerite__titulo">${esc(titulo)}</p><p>${esc(sub)}</p></header>`;

export const infoHTML = (itens: string[], alertas: string[] = []) =>
  `<ul class="info">${itens.map((i) => `<li>${esc(i)}</li>`).join("")}${alertas.map((a) => `<li class="alerta">${esc(a)}</li>`).join("")}</ul>`;

export const rodapeHTML = (t = "Valores estimados com as tabelas de 2026. Toque em uma linha para ver a conta.") => `<p class="rodape-holerite">${esc(t)}</p>`;

export interface Compartilhar {
  titulo: string; // ex.: "Simulei minha rescisão"
  detalhe?: string; // ex.: "Demissão sem justa causa"
  itens: { rotulo: string; valor: number }[];
}

/** Mensagem do WhatsApp: valores em negrito, link e assinatura do site. */
export function textoWhatsApp(c: Compartilhar, url: string) {
  const linhas = [
    `🧮 *${c.titulo} no Calculei*`,
    c.detalhe ? `_${c.detalhe}_` : "",
    "",
    ...c.itens.map((i) => `▸ ${i.rotulo}: *${formatarBRL(i.valor)}*`),
    "",
    "Veja a conta completa, linha por linha:",
    url,
    "",
    "Calculei: faça a sua conta em segundos, grátis.",
  ];
  return linhas.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n").replace(/^\n/, "");
}

/** Mostra o resultado, ou a mensagem de vazio/erro, e controla botões e barra fixa. */
export function mostrar(html: string | null, opcoes: { vazio?: string; erro?: string; barra?: { rotulo: string; valor: number }; compartilhar?: Compartilhar } = {}) {
  const holerite = $("holerite");
  const ok = html !== null && !opcoes.erro;
  if (opcoes.erro) holerite.innerHTML = `<p class="erro">${esc(opcoes.erro)}</p>`;
  else if (html === null) holerite.innerHTML = `<p class="vazio">${esc(opcoes.vazio ?? "Preencha os dados para ver o cálculo.")}</p>`;
  else holerite.innerHTML = html;
  $("acoes").hidden = !ok;
  $("barra").hidden = !ok || !opcoes.barra;
  if (ok && opcoes.barra) {
    $("barra-rotulo").textContent = opcoes.barra.rotulo;
    $("barra-valor").textContent = formatarBRL(opcoes.barra.valor);
  }
  if (ok && opcoes.compartilhar) {
    $<HTMLAnchorElement>("whats").href = `https://wa.me/?text=${encodeURIComponent(textoWhatsApp(opcoes.compartilhar, location.href))}`;
  }
}

/** Liga os botões de PDF e copiar link. */
export function ligarAcoes() {
  $("pdf").addEventListener("click", () => window.print());
  window.addEventListener("beforeprint", () => $("holerite").querySelectorAll("details").forEach((d) => (d.open = true)));
  $("copiar").addEventListener("click", async () => {
    const b = $<HTMLButtonElement>("copiar");
    try {
      await navigator.clipboard.writeText(location.href);
      b.textContent = "Link copiado";
    } catch {
      b.textContent = "Copie o endereço da página";
    }
    setTimeout(() => (b.textContent = "Copiar link"), 2500);
  });
}

/**
 * Guarda os campos do formulário no endereço da página, para o link reabrir o cálculo.
 * `campos` mapeia o id do campo para a chave curta da URL.
 */
export function estadoURL(form: HTMLFormElement, campos: Record<string, string>) {
  const salvar = () => {
    const p = new URLSearchParams();
    for (const [id, k] of Object.entries(campos)) {
      const el = form.querySelector<HTMLInputElement>(`#${id}`) ?? form.querySelector<HTMLInputElement>(`input[name=${id}]:checked`);
      if (!el) continue;
      if (el.type === "checkbox") {
        if (el.checked) p.set(k, "1");
      } else if (el.value && el.value !== "0") p.set(k, el.value);
    }
    history.replaceState(null, "", p.toString() ? `${location.pathname}?${p}` : location.pathname);
  };
  const ler = () => {
    const p = new URLSearchParams(location.search);
    for (const [id, k] of Object.entries(campos)) {
      const val = p.get(k);
      if (val === null) continue;
      const el = form.querySelector<HTMLInputElement>(`#${id}`);
      if (el) {
        if (el.type === "checkbox") el.checked = val === "1";
        else el.value = val;
      } else {
        const r = form.querySelector<HTMLInputElement>(`input[name=${id}][value="${CSS.escape(val)}"]`);
        if (r) r.checked = true;
      }
    }
  };
  return { salvar, ler };
}
