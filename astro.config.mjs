import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://calculoemdia.com.br",
  trailingSlash: "always",
  build: { format: "directory" },
  // Páginas ainda não lançadas ficam fora do sitemap.
  integrations: [sitemap({ filter: (page) => !page.includes("/404") && !/\/(gerador-de-holerite|recibo-de-[a-z0-9-]+|folha-de-ponto|escala-de-trabalho)\//.test(page) })],
});
