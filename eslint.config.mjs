import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Дизайн-хендофф — референс-артефакт, а не наш исходник: не линтим и не форматируем.
    "design_handoff_ryk/**",
    // Сгенерированный клиент Prisma — не наш код.
    "generated/**",
    // Справочники Prisma, установленные CLI.
    ".agents/**",
  ]),
]);

export default eslintConfig;
