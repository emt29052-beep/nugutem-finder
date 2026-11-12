import { NextRequest, NextResponse } from "next/server";
import { GameError, applyAction, createGame, joinGame, randomRoomCode, toView, type GameState } from "@/lib/removeone/game";
import { createRoomStore } from "@/lib/store";

const store = createRoomStore<GameState>("removeone:");
const normCode = (c: unknown) => String(c ?? "").trim().toUpperCase().slice(0, 8);
const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const state = await store.load(normCode(sp.get("code")));
  if (!state) return fail("방을 찾을 수 없습니다.", 404);
  if (Number(sp.get("v") ?? -1) === state.version) return NextResponse.json({ unchanged: true });
  return NextResponse.json({ view: toView(state, sp.get("token")) });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return fail("잘못된 요청입니다.");
  }
  try {
    const action = String(body.action ?? "");
    if (action === "create") {
      for (let i = 0; i < 10; i++) {
        const { state, player } = createGame(randomRoomCode(), body.name, body.rounds, body.survival);
        if (await store.insert(state)) {
          return NextResponse.json({ code: state.code, token: player.token, view: toView(state, player.token) });
        }
      }
      return fail("방을 만들지 못했습니다. 다시 시도해주세요.", 500);
    }
    const code = normCode(body.code);
    if (action === "join") {
      const r = await store.update(code, (s) => joinGame(s, body.name));
      if (!r) return fail("방을 찾을 수 없습니다.", 404);
      return NextResponse.json({ code, token: r.result.token, view: toView(r.state, r.result.token) });
    }
    const token = String(body.token ?? "");
    const r = await store.update(code, (s) => applyAction(s, token, action, body));
    if (!r) return fail("방을 찾을 수 없습니다.", 404);
    return NextResponse.json({ view: toView(r.state, token) });
  } catch (e) {
    if (e instanceof GameError) return fail(e.message);
    console.error(e);
    return fail(e instanceof Error ? e.message : "서버 오류", 500);
  }
}
