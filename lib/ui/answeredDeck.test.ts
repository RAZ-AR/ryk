import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/discover", () => ({ reactToExperience: vi.fn() }));

const { keepOrder } = await import("./answeredDeck");

const cards = (...ids: string[]) => ids.map((id) => ({ id }));

describe("keepOrder", () => {
  it("держит порядок, в котором карточки впервые показали", () => {
    // Сервер перемешал колоду заново после ответа на «a».
    expect(keepOrder(["a", "b", "c", "d"], cards("d", "b", "c")).map((c) => c.id)).toEqual([
      "b",
      "c",
      "d",
    ]);
  });

  it("новые карточки встают в конец, а не в середину", () => {
    expect(keepOrder(["a", "b"], cards("x", "b", "a")).map((c) => c.id)).toEqual(["a", "b", "x"]);
  });

  it("исчезнувшие с сервера карточки не возвращаются", () => {
    expect(keepOrder(["a", "b", "c"], cards("c")).map((c) => c.id)).toEqual(["c"]);
  });
});
