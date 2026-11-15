// Parte de navegador comum aos geradores de documentos da folha: dados das partes, lançamentos livres,
// desenho do recibo em duas vias e impressão.
import type { DocumentoFolha } from "../trabalhista/recibos";
import { lerValor } from "../dinheiro";
import { cnpjValido, cpfValido, mascararCNPJ, mascararCPF, numeroControle } from "./documentos";

export const $ = <T extends HTMLElement = HTMLInputElement>(id: string) => document.getElementById(id) as T;
export const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
export const positivo = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);
export const num = (id: string) => positivo(Number($(id).value.replace(",", ".")));
export const val = (id: string) => positivo(lerValor($(id).value));
export const dataBR = (iso: string) => (iso ? iso.split("-").reverse().join("/") : "");
const brl = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export interface Partes {
  empresa: string;
  documentoEmpresa: string;
  endereco: string;
  nome: string;
  cpf: string;
  cargo: string;
  cbo: string;
  matricula: string;
  admissao: string;
}

const CHAVE = "holerite-empresa";
const docEmpregadorValido = (t: string) => {
  const d = t.replace(/\D/g, "");
  return d.length === 11 ? cpfValido(d) : cnpjValido(d);
};
const campo = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value.trim() ?? "";

/** Liga máscaras, validação e a opção de lembrar a empresa. */
export function iniciarPartes() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) || "null");
    if (salvo) {
      $("empresa").value = salvo.empresa ?? "";
      $("cnpj").value = salvo.cnpj ?? "";
      $("endereco").value = salvo.endereco ?? "";
      $("lembrar").checked = true;
    }
  } catch {}
  $("cpf").addEventListener("input", () => ($("cpf").value = mascararCPF($("cpf").value)));
  $("cnpj").addEventListener("input", () => {
    const d = $("cnpj").value.replace(/\D/g, "");
    $("cnpj").value = d.length <= 11 ? mascararCPF(d) : mascararCNPJ(d);
  });
}

let pendencias: string[] = [];

/** Lê as partes; devolve null se faltar algo obrigatório (o documento só sai com dados válidos). */
export function lerPartes(): Partes | null {
  try {
    if ($("lembrar").checked) localStorage.setItem(CHAVE, JSON.stringify({ empresa: $("empresa").value, cnpj: $("cnpj").value, endereco: $("endereco").value }));
    else localStorage.removeItem(CHAVE);
  } catch {}
  const p: Partes = {
    empresa: campo("empresa"),
    documentoEmpresa: campo("cnpj"),
    endereco: campo("endereco"),
    nome: campo("nome"),
    cpf: campo("cpf"),
    cargo: campo("cargo"),
    cbo: campo("cbo"),
    matricula: campo("matricula"),
    admissao: campo("admissao"),
  };
  const cnpjOk = docEmpregadorValido(p.documentoEmpresa);
  const cpfOk = !p.cpf || cpfValido(p.cpf);
  $("erro-cnpj").hidden = !p.documentoEmpresa || cnpjOk;
  $("erro-cpf").hidden = cpfOk;
  pendencias = [
    !p.empresa && "nome da empresa",
    !cnpjOk && "CNPJ válido",
    !p.nome && "nome",
    !cpfOk && "CPF válido",
  ].filter(Boolean) as string[];
  return p.empresa && cnpjOk && p.nome && cpfOk ? p : null;
}

/** Botões "+ Outro vencimento / desconto". */
export function iniciarLivres(aoMudar: () => void) {
  document.querySelectorAll<HTMLButtonElement>("[data-adicionar]").forEach((b) =>
    b.addEventListener("click", () => {
      const tipo = b.dataset.adicionar as "proventos" | "descontos";
      const div = document.createElement("div");
      div.className = "livre";
      div.innerHTML = `
        <input class="livre__desc" maxlength="40" placeholder="${tipo === "proventos" ? "Ex.: Gratificação" : "Ex.: Convênio farmácia"}" aria-label="Descrição">
        <div class="moeda"><span aria-hidden="true">R$</span><input class="livre__valor" inputmode="decimal" placeholder="0,00" aria-label="Valor"></div>
        ${tipo === "proventos" ? '<label class="livre__incide"><input type="checkbox" checked> Incide INSS/IR/FGTS</label>' : ""}
        <button type="button" class="livre__remover" aria-label="Remover">×</button>`;
      div.querySelector(".livre__remover")!.addEventListener("click", () => {
        div.remove();
        aoMudar();
      });
      $(`lista-${tipo}`).appendChild(div);
      (div.querySelector(".livre__desc") as HTMLInputElement).focus();
    }),
  );
}
export const livres = (tipo: string) =>
  [...($(`lista-${tipo}`)?.querySelectorAll(".livre") ?? [])].map((el) => ({
    descricao: (el.querySelector(".livre__desc") as HTMLInputElement).value.trim(),
    valor: positivo(lerValor((el.querySelector(".livre__valor") as HTMLInputElement).value)),
    incide: (el.querySelector(".livre__incide input") as HTMLInputElement | null)?.checked ?? true,
  }));

export interface OpcoesDesenho {
  mensagem?: string;
  dataPagamento?: string; // AAAA-MM-DD
  linhasMinimas?: number;
  rotuloPessoa?: string; // "funcionário" ou "sócio"
  /** Campos da própria página que faltam (mostrados na barra do celular). */
  falta?: string[];
}

function desenhar(p: Partes, d: DocumentoFolha, o: OpcoesDesenho) {
  const pessoa = o.rotuloPessoa ?? "funcionário";
  const linhas = d.linhas
    .map(
      (l) =>
        `<tr><td class="c">${l.codigo}</td><td>${esc(l.descricao)}</td><td class="c">${esc(l.referencia)}</td><td class="n">${l.vencimento ? brl(l.vencimento) : ""}</td><td class="n">${l.desconto ? brl(l.desconto) : ""}</td></tr>`,
    )
    .join("");
  const vazias = Array.from({ length: Math.max(0, (o.linhasMinimas ?? 8) - d.linhas.length) }, () => `<tr class="vazia"><td></td><td></td><td></td><td></td><td></td></tr>`).join("");
  const controle = numeroControle([d.titulo, d.referencia, p.documentoEmpresa, p.cpf, p.nome, d.liquido.toFixed(2), d.totalVencimentos.toFixed(2)].join("|"));
  const tipoDoc = p.documentoEmpresa.replace(/\D/g, "").length === 11 ? "CPF" : "CNPJ";
  const segunda = pessoa === "sócio"
    ? `<td><small>Qualificação</small>Sócio</td><td class="largo"><small>Função</small>${esc(p.cargo) || "—"}</td><td><small>Matrícula</small>${esc(p.matricula) || "—"}</td>`
    : `<td><small>CBO</small>${esc(p.cbo) || "—"}</td><td class="largo"><small>Cargo</small>${esc(p.cargo) || "—"}</td><td><small>Admissão</small>${dataBR(p.admissao) || "—"}</td>`;
  const primeira = pessoa === "sócio"
    ? `<td><small>CPF</small>${esc(p.cpf) || "—"}</td><td class="largo"><small>Nome do sócio</small>${esc(p.nome)}</td><td></td>`
    : `<td><small>Matrícula</small>${esc(p.matricula) || "—"}</td><td class="largo"><small>Nome do funcionário</small>${esc(p.nome)}</td><td><small>CPF</small>${esc(p.cpf) || "—"}</td>`;

  return `
    <header class="hol__topo">
      <div>
        <strong class="hol__empresa">${esc(p.empresa)}</strong>
        <span>${tipoDoc} ${esc(p.documentoEmpresa)}</span>
        ${p.endereco ? `<span>${esc(p.endereco)}</span>` : ""}
      </div>
      <div class="hol__titulo"><strong>${esc(d.titulo)}</strong>${d.referencia.split(" · ").map((r) => `<span>${esc(r)}</span>`).join("")}</div>
    </header>
    <table class="hol__func"><tr>${primeira}</tr><tr>${segunda}</tr></table>
    <table class="hol__itens">
      <thead><tr><th class="c">Cód.</th><th>Descrição</th><th class="c">Referência</th><th class="n">Vencimentos</th><th class="n">Descontos</th></tr></thead>
      <tbody>${linhas}${vazias}</tbody>
      <tfoot>
        <tr><td colspan="3" class="hol__msg">${esc(o.mensagem ?? "")}</td><td class="n"><small>Total de vencimentos</small>${brl(d.totalVencimentos)}</td><td class="n"><small>Total de descontos</small>${brl(d.totalDescontos)}</td></tr>
        <tr class="hol__liquido"><td colspan="3"></td><td colspan="2" class="n"><small>Valor líquido</small>R$ ${brl(d.liquido)}</td></tr>
      </tfoot>
    </table>
    <table class="hol__bases"><tr>${d.bases.map((b) => `<td><small>${esc(b.rotulo)}</small>${esc(b.valor)}</td>`).join("")}</tr></table>
    <div class="hol__assinatura">
      <p>${esc(d.declaracao)}</p>
      <div><span>${dataBR(o.dataPagamento ?? "") || "____/____/______"}</span><small>Data</small></div>
      <div><span></span><small>Assinatura do ${pessoa}</small></div>
    </div>
    <footer class="hol__rodape">Documento ${controle} · emitido em ${new Date().toLocaleDateString("pt-BR")} · calculado com as tabelas de INSS, IRRF e FGTS de 2026 · calculoemdia.com.br</footer>`;
}

/** No celular o recibo é reduzido para caber na tela; um toque alterna para o tamanho real. */
let ampliado = false;
function encaixar() {
  const doc = $("documento");
  const largura = $("papel").clientWidth - 16;
  const escala = !ampliado && largura < 640 ? largura / 640 : 1;
  doc.style.setProperty("zoom", String(escala));
  $("papel").classList.toggle("previa__papel--reduzido", escala < 1);
}

/** Mostra o documento (duas vias) ou o aviso de campos faltando. */
export function exibir(p: Partes | null, d: DocumentoFolha | null, o: OpcoesDesenho = {}) {
  const pronto = !!(p && d);
  $("vazio").hidden = pronto;
  $("papel").hidden = !pronto;
  ($("imprimir") as HTMLButtonElement).disabled = !pronto;
  const barra = $("barra-movel");
  barra.classList.toggle("barra-movel--pronta", pronto);
  if (!p || !d) {
    $("avisos").innerHTML = "";
    const falta = [...pendencias, ...(o.falta ?? [])];
    $("barra-valor").textContent = falta.length ? `Falta: ${falta.join(", ")}` : "Preencha os campos";
    $("barra-rotulo").textContent = "Para gerar o documento";
    return;
  }
  const corpo = desenhar(p, d, o);
  const via = (nome: string) => `<article class="hol"><div class="hol__via">${nome}</div>${corpo}</article>`;
  const quem = o.rotuloPessoa === "sócio" ? "Via do sócio" : "Via do funcionário";
  $("documento").innerHTML = via("Via da empresa") + `<div class="hol__corte" aria-hidden="true">corte aqui</div>` + via(quem);
  $("avisos").innerHTML = d.avisos.map((a) => `<li>${esc(a)}</li>`).join("");
  $("barra-rotulo").textContent = "Valor líquido";
  $("barra-valor").textContent = `R$ ${brl(d.liquido)}`;
  encaixar();
}

/** Liga formulário e botão de impressão. */
export function iniciarGerador(tipo: string, atualizar: () => void) {
  const form = $<HTMLFormElement>("form");
  form.addEventListener("input", atualizar);
  form.addEventListener("change", atualizar);
  form.addEventListener("submit", (e) => e.preventDefault());
  // Barra fixa do celular: mostra o líquido e leva ao documento; perto dele, vira o botão de PDF.
  const previa = document.querySelector(".previa")!;
  const acao = $<HTMLButtonElement>("barra-acao");
  let naPrevia = false;
  new IntersectionObserver(([e]) => {
    naPrevia = e.isIntersecting;
    acao.textContent = naPrevia ? "Baixar PDF" : "Ver documento";
  }, { threshold: 0.15 }).observe(previa);
  acao.addEventListener("click", () => {
    if (!acao.closest(".barra-movel--pronta")) return form.querySelector<HTMLInputElement>("input:invalid, #empresa")?.focus();
    if (naPrevia) $("imprimir").click();
    else previa.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("documento").addEventListener("click", () => {
    if (!$("papel").classList.contains("previa__papel--reduzido") && !ampliado) return;
    ampliado = !ampliado;
    encaixar();
  });
  window.addEventListener("resize", encaixar);
  $("imprimir").addEventListener("click", () => {
    (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.("event", "gerar_documento", { tipo });
    window.print();
  });
  atualizar();
}
