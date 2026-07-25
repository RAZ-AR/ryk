import { prisma } from "@/lib/prisma";
import type { MemoryView } from "./weekly";

/*
 * Архив воспоминаний (PRD 5.9). Показываем истории по неделям, включая
 * перенесённые — «незавершённые желания без чувства вины».
 */

export async function getMemories(userId: string, limit = 24): Promise<MemoryView[]> {
  const stories = await prisma.weeklyStory.findMany({
    where: { userId, memory: { isNot: null } },
    orderBy: { weekStart: "desc" },
    take: limit,
    include: { experience: true, memory: true },
  });

  return stories.flatMap((s) => {
    if (!s.memory) return [];
    return [
      {
        id: s.memory.id,
        weekLabel: s.weekStart.toISOString().slice(0, 10),
        title: s.experience?.title ?? "",
        note: s.memory.note,
        emotion: s.memory.emotion,
        companion: s.memory.companion,
        category: s.experience?.category ?? null,
        deferred: s.memory.deferred,
      },
    ];
  });
}
