# Calculei (nome provisório)

Site de calculadoras trabalhistas, financeiras e de aluguel, com foco no fim da escala 6x1.

## Rodar no computador

```bash
npm install
npm run dev      # abre em http://localhost:4321
npm test         # testes das fórmulas
npm run build    # gera o site estático em dist/
```

## Onde fica cada coisa

- `src/config.ts` — nome e domínio do site (trocar quando o domínio for registrado)
- `src/data/parametros-2026.ts` — tabelas de INSS, IRRF e FGTS (atualizar aqui quando mudarem)
- `src/data/catalogo.ts` — lista de calculadoras e categorias (as sem `url` aparecem como "em breve")
- `src/lib/` — fórmulas, sem dependência da interface
- `src/pages/` — páginas do site
- `tests/` — casos de teste das fórmulas

## Publicar (Cloudflare Workers)

No painel do Cloudflare: Workers & Pages → Create → Import a repository → escolha este repositório.
- Comando de build: `npm run build`
- Comando de deploy: `npx wrangler deploy`

A configuração está em `wrangler.jsonc`. Cada envio ao branch principal publica o site sozinho.
