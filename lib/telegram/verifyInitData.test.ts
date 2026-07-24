import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyInitData } from "./verifyInitData";

/*
 * Тестируем сам алгоритм на СИНТЕТИЧЕСКОМ токене — реальный секрет не нужен.
 * Собираем валидный initData той же схемой, что и Telegram, и проверяем,
 * что подделка/просрочка отклоняются.
 */

const FAKE_TOKEN = "123456:FAKE-TEST-TOKEN";

function buildInitData(fields: Record<string, string>, token = FAKE_TOKEN): string {
  const checkString = Object.entries(fields)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  const hash = createHmac("sha256", secret).update(checkString).digest("hex");
  const params = new URLSearchParams(fields);
  params.set("hash", hash);
  return params.toString();
}

const nowSec = () => Math.floor(Date.now() / 1000);

const validUser = JSON.stringify({
  id: 42,
  first_name: "Аня",
  username: "anya",
  language_code: "ru",
});

describe("verifyInitData", () => {
  it("принимает корректно подписанные данные", () => {
    const initData = buildInitData({
      user: validUser,
      auth_date: String(nowSec()),
      query_id: "abc",
    });
    const res = verifyInitData(initData, FAKE_TOKEN);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.user.id).toBe(42);
      expect(res.data.user.firstName).toBe("Аня");
      expect(res.data.user.languageCode).toBe("ru");
    }
  });

  it("отклоняет подделанные данные (изменено поле после подписи)", () => {
    const initData = buildInitData({ user: validUser, auth_date: String(nowSec()) });
    const tampered = initData.replace(/id%22%3A42/, "id%22%3A99");
    const res = verifyInitData(tampered, FAKE_TOKEN);
    expect(res.ok).toBe(false);
  });

  it("отклоняет чужой токен", () => {
    const initData = buildInitData({ user: validUser, auth_date: String(nowSec()) });
    const res = verifyInitData(initData, "999:OTHER-TOKEN");
    expect(res).toMatchObject({ ok: false, reason: "bad_hash" });
  });

  it("отклоняет просроченную подпись", () => {
    const old = nowSec() - 2 * 86_400;
    const initData = buildInitData({ user: validUser, auth_date: String(old) });
    const res = verifyInitData(initData, FAKE_TOKEN, 86_400);
    expect(res).toMatchObject({ ok: false, reason: "expired" });
  });

  it("отклоняет данные без hash", () => {
    const res = verifyInitData("user=" + encodeURIComponent(validUser), FAKE_TOKEN);
    expect(res).toMatchObject({ ok: false, reason: "no_hash" });
  });

  it("отклоняет пустой ввод", () => {
    expect(verifyInitData("", FAKE_TOKEN).ok).toBe(false);
    expect(verifyInitData("x=1", "").ok).toBe(false);
  });
});
