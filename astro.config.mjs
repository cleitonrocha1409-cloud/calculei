import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://calculei.com.br",
  trailingSlash: "always",
  build: { format: "directory" },
});
