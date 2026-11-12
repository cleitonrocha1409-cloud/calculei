// Datas de pagamento por final do benefício/NIS ou mês de nascimento, e arquivo de agenda (.ics).
import { CALENDARIOS } from "../../data/calendarios";

export interface Pagamento {
  rotulo: string; // ex.: "Benefício de novembro"
  data: string; // AAAA-MM-DD
}

export const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** Posição do final (1…9, 0) nas tabelas. */
const indiceFinal = (final: number) => (final === 0 ? 9 : final - 1);

export type FaixaINSS = "piso" | "acima";

/**
 * Datas do INSS no ano. Acima do piso, os finais pagam em pares (1 e 6, 2 e 7…),
 * na mesma data em que o piso paga os finais 6 a 0.
 */
export function datasINSS(final: number, faixa: FaixaINSS): Pagamento[] {
  const f = faixa === "acima" && final >= 1 && final <= 5 ? final + 5 : final;
  return juntarAnos(CALENDARIOS.inss as unknown as Record<string, unknown>, "Benefício", f);
}

/** Junta todos os anos cadastrados (2026, 2027…), em ordem. O ano aparece no rótulo a partir do segundo. */
function juntarAnos(fonte: Record<string, unknown>, nome: string, final: number): Pagamento[] {
  const anos = Object.keys(fonte).filter((k) => /^\d{4}$/.test(k)).sort();
  return anos.flatMap((ano, i) =>
    Object.entries(fonte[ano] as Record<number, string[]>).map(([m, datas]) => ({
      rotulo: `${nome} de ${MESES[Number(m) - 1]}${i > 0 ? `/${ano}` : ""}`,
      data: datas[indiceFinal(final)],
    })),
  );
}

export function datasBolsa(final: number): Pagamento[] {
  return juntarAnos(CALENDARIOS.bolsa as unknown as Record<string, unknown>, "Parcela", final);
}

export function dataPIS(mesNascimento: number, ano: 2026 | 2027): string {
  return CALENDARIOS.pis[ano][mesNascimento];
}

/** Os próximos `n` pagamentos a partir de hoje (inclusive). */
export function proximos(lista: Pagamento[], hoje: string, n = 3): Pagamento[] {
  return lista.filter((p) => p.data >= hoje).sort((a, b) => a.data.localeCompare(b.data)).slice(0, n);
}

/** Dias corridos entre duas datas AAAA-MM-DD. */
export function diasAte(hoje: string, data: string) {
  return Math.round((Date.UTC(+data.slice(0, 4), +data.slice(5, 7) - 1, +data.slice(8, 10)) - Date.UTC(+hoje.slice(0, 4), +hoje.slice(5, 7) - 1, +hoje.slice(8, 10))) / 86400000);
}

const SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** "24/11 (terça)" */
export function dataCurta(data: string, comSemana = true, comAno = false) {
  const [a, m, d] = data.split("-").map(Number);
  const sem = SEMANA[new Date(Date.UTC(a, m - 1, d)).getUTCDay()];
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}${comAno ? `/${a}` : ""}${comSemana ? ` (${sem})` : ""}`;
}

/** Hoje no fuso de Brasília, AAAA-MM-DD. */
export function hojeBrasilia(agora = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
}

const escICS = (t: string) => t.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

/**
 * Arquivo de agenda com um evento de dia inteiro por pagamento e aviso às 8h do dia.
 * Funciona no Google Agenda, no iPhone e no Outlook, sem aplicativo.
 */
export function gerarICS(eventos: Pagamento[], titulo: string, descricao: string, url: string, carimbo = "20261112T000000Z") {
  const linhas = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Calculo em Dia//Calendario de pagamentos//PT-BR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const e of eventos) {
    const d = e.data.replace(/-/g, "");
    const fim = new Date(Date.UTC(+e.data.slice(0, 4), +e.data.slice(5, 7) - 1, +e.data.slice(8, 10) + 1)).toISOString().slice(0, 10).replace(/-/g, "");
    linhas.push(
      "BEGIN:VEVENT",
      `UID:${d}-${titulo.toLowerCase().replace(/[^a-z0-9]+/g, "-")}@calculoemdia.com.br`,
      `DTSTAMP:${carimbo}`,
      `DTSTART;VALUE=DATE:${d}`,
      `DTEND;VALUE=DATE:${fim}`,
      `SUMMARY:${escICS(`${titulo}: ${e.rotulo.toLowerCase()}`)}`,
      `DESCRIPTION:${escICS(`${descricao}\n${url}`)}`,
      "TRANSP:TRANSPARENT",
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escICS(`${titulo} cai hoje`)}`,
      "TRIGGER:PT8H",
      "END:VALARM",
      "END:VEVENT",
    );
  }
  linhas.push("END:VCALENDAR");
  return linhas.join("\r\n") + "\r\n";
}
