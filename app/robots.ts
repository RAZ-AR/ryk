import type { MetadataRoute } from "next";

/*
 * Ryk — Telegram Mini App (ADR-001), а не публичный сайт: без Telegram initData
 * страница нефункциональна. Индексация не нужна ни на проде, ни тем более
 * на preview (тот вдобавок уже закрыт Vercel Deployment Protection).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
