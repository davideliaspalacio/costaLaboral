import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": raiz,
      // Los tests unitarios cubren lógica pura; "server-only" lanza fuera de Next.
      "server-only": fileURLToPath(new URL("./test/unit/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    include: ["test/unit/**/*.test.ts"],
    environment: "node",
  },
});
