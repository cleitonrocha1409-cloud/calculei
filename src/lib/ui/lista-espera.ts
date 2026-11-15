// Inscrição na lista de espera do Cálculo em Dia Empresas, usada pelo convite dos geradores,
// pela janela antes de imprimir e pelo cartão das calculadoras.
const CHAVE = "lista-espera-ok";
const EMAIL = "lista-espera-email";

export function jaInscrito(): boolean {
  try {
    return !!localStorage.getItem(CHAVE);
  } catch {
    return false;
  }
}

export function emailInscrito(): string {
  try {
    return localStorage.getItem(EMAIL) ?? "";
  } catch {
    return "";
  }
}

export interface Inscricao {
  email: string;
  consentimento: boolean;
  nome?: string;
  whatsapp?: string;
  perfil?: string;
  funcionarios?: string;
  interesses?: string[];
  site?: string;
}

/** Envia a inscrição (ou o complemento dela). Lança erro com a mensagem para mostrar à pessoa. */
export async function inscrever(dados: Inscricao, ondeVeio: string): Promise<void> {
  const r = await fetch("/api/lista-espera", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...dados, origem: location.pathname }),
  });
  const resposta = await r.json().catch(() => ({}));
  if (!r.ok || !resposta.ok) throw new Error(resposta.erro || "Não foi possível enviar agora. Tente de novo em instantes.");
  const primeira = !jaInscrito();
  try {
    localStorage.setItem(CHAVE, "1");
    localStorage.setItem(EMAIL, dados.email.trim().toLowerCase());
  } catch {}
  if (primeira) (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.("event", "lista_espera", { origem: location.pathname, onde: ondeVeio });
  document.dispatchEvent(new CustomEvent("lista-espera:inscrito"));
}

/**
 * Janela antes de imprimir: aparece sempre que a pessoa ainda não está na lista.
 * Devolve true se a janela abriu (ela mesma chama `imprimir` depois); false se deve imprimir direto.
 */
export function conviteAntesDeImprimir(imprimir: () => void): boolean {
  const dlg = document.getElementById("convite-impressao") as HTMLDialogElement | null;
  if (!dlg || jaInscrito() || typeof dlg.showModal !== "function") return false;
  const email = dlg.querySelector<HTMLInputElement>("#ci-email")!;
  const consent = dlg.querySelector<HTMLInputElement>("#ci-consent")!;
  const erro = dlg.querySelector<HTMLElement>("#ci-erro")!;
  const avisar = dlg.querySelector<HTMLButtonElement>("#ci-avisar")!;
  const so = dlg.querySelector<HTMLButtonElement>("#ci-so")!;
  erro.hidden = true;
  const fechar = () => {
    dlg.close();
    setTimeout(imprimir, 120);
  };
  avisar.onclick = async () => {
    erro.hidden = true;
    avisar.disabled = true;
    try {
      await inscrever({ email: email.value, consentimento: consent.checked }, "antes-de-imprimir");
      fechar();
    } catch (e) {
      erro.textContent = (e as Error).message;
      erro.hidden = false;
    } finally {
      avisar.disabled = false;
    }
  };
  so.onclick = fechar;
  dlg.showModal();
  email.focus();
  return true;
}
