import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/*
 * Алиас @/* (tsconfig.json) не был здесь настроен — сходило с рук только
 * потому, что все прежние тесты либо мокали свои @/-импорты через vi.mock,
 * либо использовали их как `import type` (стирается на этапе сборки, до
 * реального резолва). Первый тест с настоящим, немоканым @/-импортом
 * (app/api/telegram/webhook/route.test.ts) сразу упал с
 * ERR_MODULE_NOT_FOUND — Node не знает про этот алиас без явной настройки.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    // prisma/ — потому что курируемый каталог и его переводы живут там,
    // а полнота переводов проверяется тестом, а не типом (см. catalogI18n.test.ts).
    include: ["lib/**/*.test.ts", "app/**/*.test.ts", "prisma/**/*.test.ts"],
  },
});
