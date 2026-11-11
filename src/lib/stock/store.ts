import type { GameState } from "./game";

// 게임 방 저장소.
// - 기본: 서버 메모리 (npm run dev / npm start 처럼 서버가 하나일 때 동작)
// - Upstash Redis(Vercel KV) 환경변수가 있으면 Redis 사용 (Vercel 같은 서버리스 배포용)
//   KV_REST_API_URL / KV_REST_API_TOKEN 또는 UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN

const TTL_SECONDS = 60 * 60 * 24;
const KEY = (code: string) => `stockgame:${code}`;

const redisUrl = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(command: (string | number)[]) {
  const res = await fetch(redisUrl!, {
    method: "POST",
    headers: { Authorization: `Bearer ${redisToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const data = await res.json();
  if (data.error) throw new Error(`Redis error: ${data.error}`);
  return data.result;
}

// version 이 기대값일 때만 저장 (동시 요청 충돌 방지)
const CAS_SCRIPT = `
local cur = redis.call('GET', KEYS[1])
if not cur then return 0 end
if cjson.decode(cur).version ~= tonumber(ARGV[2]) then return 0 end
redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[3])
return 1`;

const mem = globalThis as unknown as { __stockRooms?: Map<string, string> };
const rooms = (mem.__stockRooms ??= new Map<string, string>());

export async function loadGame(code: string): Promise<GameState | null> {
  const raw = redisUrl ? await redis(["GET", KEY(code)]) : rooms.get(code);
  return raw ? (JSON.parse(raw) as GameState) : null;
}

export async function insertGame(state: GameState): Promise<boolean> {
  const raw = JSON.stringify(state);
  if (redisUrl) {
    const r = await redis(["SET", KEY(state.code), raw, "NX", "EX", TTL_SECONDS]);
    return r === "OK";
  }
  if (rooms.has(state.code)) return false;
  rooms.set(state.code, raw);
  return true;
}

async function compareAndSave(state: GameState, expectedVersion: number): Promise<boolean> {
  const raw = JSON.stringify(state);
  if (redisUrl) {
    const r = await redis(["EVAL", CAS_SCRIPT, 1, KEY(state.code), raw, expectedVersion, TTL_SECONDS]);
    return r === 1;
  }
  const cur = rooms.get(state.code);
  if (!cur || (JSON.parse(cur) as GameState).version !== expectedVersion) return false;
  rooms.set(state.code, raw);
  return true;
}

export async function updateGame<T>(
  code: string,
  mutate: (state: GameState) => T
): Promise<{ state: GameState; result: T } | null> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const state = await loadGame(code);
    if (!state) return null;
    const expected = state.version;
    const result = mutate(state);
    state.version = expected + 1;
    if (await compareAndSave(state, expected)) return { state, result };
    await new Promise((r) => setTimeout(r, 30 + Math.random() * 70));
  }
  throw new Error("요청이 몰려 처리하지 못했습니다. 다시 시도해주세요.");
}
