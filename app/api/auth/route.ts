import { NextResponse } from "next/server";
import { authenticateDev, authenticateWithInitData } from "@/lib/auth/authenticate";

/*
 * POST /api/auth — вход в Mini App.
 * Тело: { initData: string } из window.Telegram.WebApp.initData.
 * Вне Telegram (только dev): { dev: true } → сид-пользователь.
 */
export async function POST(request: Request) {
  let body: { initData?: string; dev?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  const result = body.initData
    ? await authenticateWithInitData(body.initData)
    : body.dev
      ? await authenticateDev()
      : { ok: false as const, reason: "no_init_data" };

  if (!result.ok) {
    const status = result.reason === "server_misconfigured" ? 500 : 401;
    return NextResponse.json({ ok: false, reason: result.reason }, { status });
  }

  return NextResponse.json({ ok: true, user: result.user });
}
