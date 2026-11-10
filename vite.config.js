import { defineConfig } from "vite";

export default defineConfig({
  // Relative asset paths keep the build portable across static hosting providers.
  base: "./",
  server: {
    host: "0.0.0.0",
  },
});
