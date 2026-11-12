// Resultado comum das páginas de calendário (lado do navegador).
import { $, esc2 as esc, infoHTML, mostrar, rodapeHTML, topoHTML } from "../ui/calc-ui";
import { dataCurta, diasAte, gerarICS, hojeBrasilia, proximos, type Pagamento } from "./pagamentos";

export interface Calendario {
  titulo: string; // "INSS"
  sub: string; // "Final 3, até 1 salário mínimo"
  lista: Pagamento[];
  rotuloColuna: string; // "Competência"
  avisos: string[];
  alertas?: string[];
  rodape: string;
  arquivo: string; // nome do .ics
  rotuloProximo?: string; // padrão: "Próximo pagamento"
  rotuloData?: string; // padrão: "Data do depósito"
}

let atual: Calendario | null = null;

const quando = (dias: number) => (dias === 0 ? "é hoje" : dias === 1 ? "é amanhã" : `daqui a ${dias} dias`);

export function mostrarCalendario(c: Calendario) {
  atual = c;
  const hoje = hojeBrasilia();
  const prox = proximos(c.lista, hoje, 12);
  if (prox.length === 0) {
    mostrar(topoHTML(c.titulo, c.sub) + `<p class="vazio">Todos os pagamentos deste calendário já foram feitos. O próximo calendário aparece aqui assim que o governo publicar.</p>` + infoHTML(c.avisos, c.alertas));
    return;
  }
  const p = prox[0];
  const linhas = c.lista
    .map((x) => {
      const cls = x.data < hoje ? "passou" : x === p ? "atual" : "";
      return `<tr${cls ? ` class="${cls}"` : ""}><th scope="row">${esc(x.rotulo)}</th><td>${dataCurta(x.data, true, x.data.slice(0, 4) !== hoje.slice(0, 4))}</td></tr>`;
    })
    .join("");
  const html =
    topoHTML(c.titulo, c.sub) +
    `<p class="proxima"><span>${esc(c.rotuloProximo ?? "Próximo pagamento")}: ${esc(p.rotulo.toLowerCase())}</span><strong>${dataCurta(p.data, true, p.data.slice(0, 4) !== hoje.slice(0, 4))}</strong><small>${quando(diasAte(hoje, p.data))}</small></p>` +
    `<button type="button" class="botao-agenda" id="agenda">Adicionar ${prox.length === 1 ? "esta data" : `as próximas ${prox.length} datas`} à agenda</button>` +
    `<div class="mini-rolagem"><table class="mini"><thead><tr><th scope="col">${esc(c.rotuloColuna)}</th><th scope="col">${esc(c.rotuloData ?? "Data do depósito")}</th></tr></thead><tbody>${linhas}</tbody></table></div>` +
    infoHTML(c.avisos, c.alertas) +
    rodapeHTML(c.rodape);
  mostrar(html, {
    barra: { rotulo: c.rotuloProximo ?? "Próximo pagamento", valor: dataCurta(p.data, false) },
    compartilhar: {
      titulo: `Calendário ${c.titulo}`,
      detalhe: c.sub,
      itens: prox.slice(0, 3).map((x) => ({ rotulo: x.rotulo, valor: dataCurta(x.data) })),
      chamada: "Veja todas as datas e coloque na agenda do celular:",
    },
  });
}

/** Baixa o .ics com as próximas datas. No celular, abre direto a opção de adicionar à agenda. */
export function ligarAgenda() {
  $("holerite").addEventListener("click", (ev) => {
    const alvo = ev.target as HTMLElement;
    if (alvo.id !== "agenda" || !atual) return;
    const eventos = proximos(atual.lista, hojeBrasilia(), 12);
    const ics = gerarICS(eventos, atual.titulo, atual.sub, location.href);
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = atual.arquivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    alvo.textContent = "Arquivo da agenda baixado. Abra para adicionar.";
  });
}
