import type { GameState } from "./game";

// 게임 방 저장소. 환경변수에 따라 셋 중 하나를 사용한다.
// 1) Supabase  : STOCKGAME_SUPABASE_URL + STOCKGAME_SUPABASE_KEY (supabase/stockgame.sql 의 함수 사용)
// 2) Upstash Redis(Vercel KV): KV_REST_API_URL / KV_REST_API_TOKEN 또는 UPSTASH_REDIS_REST_URL / _TOKEN
// 3) 서버 메모리 (기본값, 서버가 하나일 때만 안전)

const TTL_SECONDS = 60 * 60 * 24;

type Backend = {
  get(code: string): Promise<string | null>;
  insert(code: string, raw: string): Promise<boolean>;
  cas(code: string, raw: string, expectedVersion: number): Promise<boolean>;
};

// ---------- Supabase ----------
const sbUrl = process.env.STOCKGAME_SUPABASE_URL;
const sbKey = process.env.STOCKGAME_SUPABASE_KEY;

async function rpc(fn: string, args: Record<string, unknown>) {
  const res = await fetch(`${sbUrl}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: sbKey!, Authorization: `Bearer ${sbKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Supabase error ${res.status}: ${await res.text()}`);
  return res.json();
}

const supabase: Backend = {
  async get(code) {
    const data = await rpc("stockgame_get", { p_code: code });
    return data ? JSON.stringify(data) : null;
  },
  async insert(code, raw) {
    return (await rpc("stockgame_insert", { p_code: code, p_data: JSON.parse(raw) })) === true;
  },
  async cas(code, raw, expected) {
    return (await rpc("stockgame_cas", { p_code: code, p_data: JSON.parse(raw), p_expected: expected })) === true;
  },
};

// ---------- Upstash Redis ----------
const redisUrl = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = (code: string) => `stockgame:${code}`;

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

const upstash: Backend = {
  get: (code) => redis(["GET", KEY(code)]),
  insert: async (code, raw) => (await redis(["SET", KEY(code), raw, "NX", "EX", TTL_SECONDS])) === "OK",
  cas: async (code, raw, expected) =>
    (await redis(["EVAL", CAS_SCRIPT, 1, KEY(code), raw, expected, TTL_SECONDS])) === 1,
};

// ---------- 메모리 ----------
const mem = globalThis as unknown as { __stockRooms?: Map<string, string> };
const rooms = (mem.__stockRooms ??= new Map<string, string>());

const memory: Backend = {
  get: async (code) => rooms.get(code) ?? null,
  insert: async (code, raw) => {
    if (rooms.has(code)) return false;
    rooms.set(code, raw);
    return true;
  },
  cas: async (code, raw, expected) => {
    const cur = rooms.get(code);
    if (!cur || (JSON.parse(cur) as GameState).version !== expected) return false;
    rooms.set(code, raw);
    return true;
  },
};

const backend: Backend = sbUrl && sbKey ? supabase : redisUrl && redisToken ? upstash : memory;

// ---------- 공개 API ----------

export async function loadGame(code: string): Promise<GameState | null> {
  const raw = await backend.get(code);
  return raw ? (JSON.parse(raw) as GameState) : null;
}

export async function insertGame(state: GameState): Promise<boolean> {
  return backend.insert(state.code, JSON.stringify(state));
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
    if (await backend.cas(code, JSON.stringify(state), expected)) return { state, result };
    await new Promise((r) => setTimeout(r, 30 + Math.random() * 70));
  }
  throw new Error("요청이 몰려 처리하지 못했습니다. 다시 시도해주세요.");
}
