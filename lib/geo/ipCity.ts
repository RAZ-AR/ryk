import { nearestCity, type City } from "@/lib/cities";

/*
 * Догадка о городе по IP — чтобы на шаге «Где ты?» нужный город уже был
 * отмечен, и человеку оставалось только согласиться.
 *
 * Vercel кладёт координаты IP в заголовки запроса. Это догадка, а не факт:
 * VPN или роуминг легко её ломают, поэтому экран говорит «похоже, ты здесь»
 * и ничего не сохраняет сам — город фиксирует только нажатие «Дальше».
 */
export function cityFromIpHeaders(headers: Pick<Headers, "get">): City | null {
  const lat = parseFloat(headers.get("x-vercel-ip-latitude") ?? "");
  const lng = parseFloat(headers.get("x-vercel-ip-longitude") ?? "");
  return nearestCity(lat, lng);
}
