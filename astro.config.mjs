import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://calculoemdia.com.br",
  trailingSlash: "always",
  build: { format: "directory" },
  // A página de saída da lista de espera fica fora do sitemap.
  integrations: [sitemap({ filter: (page) => !page.includes("/404") && !page.includes("/lista-de-espera/") })],
});
