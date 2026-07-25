"use server";

import { track } from "@/lib/analytics/track";
import { getSession } from "@/lib/auth/session";

/*
 * События, которые происходят на экране, а не в действии пользователя.
 * Пока такое одно — просмотр кандидатов, первый шаг воронки. Без него
 * не посчитать Weekly Selection Rate (11-analytics).
 */

export async function trackCandidatesViewed(count: number): Promise<void> {
  const session = await getSession();
  if (!session) return;
  await track(session.userId, { name: "candidates_viewed", props: { count } });
}
