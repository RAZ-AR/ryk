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
    /*
     * Рабочие копии агентских веток. Это тот же репозиторий, только вторым
     * чекаутом, — линтить его повторно бессмысленно, а вреда много: копии
     * тянут за собой и design_handoff_ryk, и generated/, из-за чего `eslint`
     * без аргументов выдавал под двадцать тысяч замечаний и настоящие
     * прятались среди чужих. Игнор здесь, а не в .gitignore: git их и так
     * не видит, спотыкался именно линтер.
     */
    ".claude/**",
  ]),
]);

export default eslintConfig;
