import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  /*
   * Карта архитектуры лежит статикой в public/architecture.html — приложению
   * она не нужна, а роут потребовал бы переписать её в JSX и протащить через
   * layout с провайдером языка и шрифтами. Rewrite даёт ей человеческий адрес
   * /architecture, не заводя ни страницы, ни рендера.
   */
  async rewrites() {
    return [{ source: "/architecture", destination: "/architecture.html" }];
  },
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);
