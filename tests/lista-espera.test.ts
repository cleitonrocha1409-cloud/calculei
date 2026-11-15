import { describe, expect, it } from "vitest";
// @ts-expect-error módulo JS do worker
import { validarInscricao } from "../worker/index.js";

describe("lista de espera", () => {
  const base = { nome: "Maria Santos", email: "Maria@Exemplo.com ", perfil: "dono", consentimento: true };
  it("limpa e aceita uma inscrição válida", () => {
    const v = validarInscricao({ ...base, whatsapp: "(11) 98888-7777", interesses: ["ponto", "invalido"], origem: "/trabalhista/folha-de-ponto/" });
    expect(v.dados).toMatchObject({ email: "maria@exemplo.com", whatsapp: "11988887777", interesses: "ponto", origem: "/trabalhista/folha-de-ponto/" });
  });
  it("exige consentimento, e-mail válido e perfil", () => {
    expect(validarInscricao({ ...base, consentimento: false }).erro).toBeTruthy();
    expect(validarInscricao({ ...base, email: "maria@" }).erro).toBeTruthy();
    expect(validarInscricao({ ...base, perfil: "admin" }).erro).toBeTruthy();
    expect(validarInscricao({ ...base, whatsapp: "123" }).erro).toBeTruthy();
  });
  it("aceita só o e-mail com a autorização", () => {
    const v = validarInscricao({ email: "dono@loja.com.br", consentimento: true });
    expect(v.dados).toMatchObject({ email: "dono@loja.com.br", nome: "", perfil: "nao-informado" });
  });
  it("descarta robôs pelo campo escondido", () => {
    expect(validarInscricao({ ...base, site: "http://spam" }).robo).toBe(true);
  });
});
