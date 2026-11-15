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
      // Pergunta de um toque antes de imprimir; "Pular e imprimir" segue direto.
      const porte = dlg.querySelector<HTMLElement>("#ci-porte");
      if (porte) {
        dlg.querySelectorAll<HTMLElement>(".ci-passo1, .convite__consent, #ci-botoes, #ci-erro").forEach((el) => (el.hidden = true));
        dlg.querySelector<HTMLElement>("#ci-titulo")!.textContent = "Pronto, você está na lista.";
        const texto = dlg.querySelector<HTMLElement>("#ci-titulo + p");
        if (texto) texto.hidden = true;
        if (perguntarPorte(porte, fechar, "Pular e imprimir")) return;
      }
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

const PORTE = "lista-espera-porte";
const OPCOES_PORTE: [string, string][] = [
  ["1-3", "1 a 3"],
  ["4-10", "4 a 10"],
  ["11-20", "11 a 20"],
  ["21+", "Mais de 20"],
  ["contador", "Sou contador"],
];

export function porteRespondido(): boolean {
  try {
    return !!localStorage.getItem(PORTE);
  } catch {
    return false;
  }
}

/**
 * Pergunta de um toque, logo depois da inscrição: quantos funcionários (ou se é contador).
 * Desenha os botões em `alvo`, salva na mesma inscrição e chama `aoTerminar` ao responder ou pular.
 */
export function perguntarPorte(alvo: HTMLElement, aoTerminar?: () => void, textoPular = "Pular") {
  if (porteRespondido() || !jaInscrito()) {
    alvo.hidden = true;
    return false;
  }
  alvo.hidden = false;
  // Se a pergunta for respondida em outro lugar da página, esta some.
  document.addEventListener("lista-espera:porte", () => {
    if (!alvo.dataset.respondeu) alvo.hidden = true;
  });
  alvo.innerHTML = `<p class="porte__pergunta">Quantos funcionários tem a empresa?</p>
    <div class="porte__opcoes">${OPCOES_PORTE.map(([v, t]) => `<button type="button" data-porte="${v}">${t}</button>`).join("")}</div>
    <button type="button" class="porte__pular">${textoPular}</button>
    <p class="porte__erro" role="alert" hidden></p>`;
  const erro = alvo.querySelector<HTMLElement>(".porte__erro")!;
  alvo.querySelector<HTMLButtonElement>(".porte__pular")!.onclick = () => {
    alvo.hidden = true;
    aoTerminar?.();
  };
  alvo.querySelectorAll<HTMLButtonElement>("[data-porte]").forEach((b) => {
    b.onclick = async () => {
      const v = b.dataset.porte!;
      alvo.querySelectorAll("button").forEach((x) => ((x as HTMLButtonElement).disabled = true));
      try {
        await inscrever({ email: emailInscrito(), consentimento: true, ...(v === "contador" ? { perfil: "contador" } : { funcionarios: v }) }, "porte");
        try {
          localStorage.setItem(PORTE, v);
        } catch {}
        (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.("event", "lista_espera_porte", { porte: v });
        alvo.dataset.respondeu = "1";
        document.dispatchEvent(new CustomEvent("lista-espera:porte"));
        alvo.innerHTML = `<p class="porte__obrigado">Obrigado!</p>`;
        setTimeout(() => aoTerminar?.(), 500);
      } catch (e) {
        erro.textContent = (e as Error).message;
        erro.hidden = false;
        alvo.querySelectorAll("button").forEach((x) => ((x as HTMLButtonElement).disabled = false));
      }
    };
  });
  return true;
}
