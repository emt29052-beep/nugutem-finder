// 시간 경매 (서버 로직)
// - 각자 시간 통장(기본 10분)을 갖고 여러 라운드(기본 19) 동안 시간을 걸어 승리 토큰을 경매한다.
// - 라운드 시작 → 준비 시간 → 5초 카운트다운. 카운트다운이 끝날 때까지 버튼을 누르고 있어야 참가.
// - 참가자는 누르고 있는 동안 시간이 줄고, 손을 떼는 순간까지가 입찰. 가장 오래 버틴 사람이 토큰 1개.
// - 0.1초 단위 동점이면 무효. 누가 몇 초 썼는지는 게임이 끝날 때까지 비공개.
// 시간 측정은 각자 휴대폰에서 하고 결과(입찰 ms)만 서버로 보낸다.

export const PREP_MS = 6000; // 라운드 사이 준비 시간 (지난 결과 보기 + 버튼 누르기)
export const COUNTDOWN_MS = 5000;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 12;
export const TICK = 100; // 0.1초 단위

export type Phase = "lobby" | "round" | "end";

export type Player = {
  id: string;
  name: string;
  token: string;
  bank: number; // 남은 시간(ms)
  tokens: number;
  bids: number[]; // 라운드별 입찰(ms), 0 = 포기
  submitted: boolean;
};

export type RoundResult = {
  round: number;
  winner: string | null;
  outcome: "win" | "tie" | "none";
};

export type ChatMsg = { id: number; playerId: string; text: string; at: number };

export type GameState = {
  code: string;
  version: number;
  hostId: string;
  phase: Phase;
  round: number;
  totalRounds: number;
  startBank: number;
  hideBank: boolean;
  roundStart: number | null; // 카운트다운 시작 시각(서버 ms). 이때부터 COUNTDOWN_MS 뒤에 경매 시작
  players: Player[];
  results: RoundResult[];
  chat: ChatMsg[];
  createdAt: number;
};

export class GameError extends Error {}

export function randomId(len = 16) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (const b of crypto.getRandomValues(new Uint8Array(len))) s += chars[b % chars.length];
  return s;
}

export function randomRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (const b of crypto.getRandomValues(new Uint8Array(4))) s += chars[b % chars.length];
  return s;
}

function cleanName(name: unknown) {
  const n = String(name ?? "").trim().slice(0, 12);
  if (!n) throw new GameError("닉네임을 입력해주세요.");
  return n;
}

function newPlayer(name: string, bank: number): Player {
  return { id: randomId(8), name, token: randomId(24), bank, tokens: 0, bids: [], submitted: false };
}

export function createGame(code: string, hostName: unknown, rounds: unknown, minutes: unknown, hideBank: unknown) {
  const totalRounds = Math.min(30, Math.max(3, Math.floor(Number(rounds) || 19)));
  const startBank = Math.min(20, Math.max(1, Number(minutes) || 10)) * 60_000;
  const host = newPlayer(cleanName(hostName), startBank);
  const state: GameState = {
    code,
    version: 0,
    hostId: host.id,
    phase: "lobby",
    round: 0,
    totalRounds,
    startBank,
    hideBank: hideBank !== false,
    roundStart: null,
    players: [host],
    results: [],
    chat: [],
    createdAt: Date.now(),
  };
  return { state, player: host };
}

export function joinGame(state: GameState, name: unknown): Player {
  if (state.phase !== "lobby") throw new GameError("이미 게임이 시작되었습니다.");
  if (state.players.length >= MAX_PLAYERS) throw new GameError("방이 가득 찼습니다.");
  const n = cleanName(name);
  if (state.players.some((p) => p.name === n)) throw new GameError("이미 사용 중인 닉네임입니다.");
  const p = newPlayer(n, state.startBank);
  state.players.push(p);
  return p;
}

export function findPlayer(state: GameState, token: string | null | undefined) {
  if (!token) return null;
  return state.players.find((p) => p.token === token) ?? null;
}

function requirePlayer(state: GameState, token: string) {
  const p = findPlayer(state, token);
  if (!p) throw new GameError("이 방의 참가자가 아닙니다.");
  return p;
}

function requireHost(state: GameState, token: string) {
  const p = requirePlayer(state, token);
  if (p.id !== state.hostId) throw new GameError("방장만 할 수 있습니다.");
  return p;
}

function startRound(state: GameState, round: number, now: number) {
  state.phase = "round";
  state.round = round;
  state.roundStart = now + PREP_MS;
  for (const p of state.players) {
    p.submitted = false;
    // 시간이 바닥난 사람은 자동 포기
    if (p.bank < TICK) {
      p.bids[round - 1] = 0;
      p.submitted = true;
    }
  }
  if (state.players.every((p) => p.submitted)) resolveRound(state, now);
}

function resolveRound(state: GameState, now: number) {
  const r = state.round;
  for (const p of state.players) {
    if (!p.submitted) {
      p.bids[r - 1] = 0;
      p.submitted = true;
    }
  }
  const bids = state.players.map((p) => ({ p, bid: p.bids[r - 1] ?? 0 })).filter((x) => x.bid > 0);
  bids.sort((a, b) => b.bid - a.bid);
  let result: RoundResult;
  if (bids.length === 0) result = { round: r, winner: null, outcome: "none" };
  else if (bids.length > 1 && bids[0].bid === bids[1].bid) result = { round: r, winner: null, outcome: "tie" };
  else {
    bids[0].p.tokens += 1;
    result = { round: r, winner: bids[0].p.id, outcome: "win" };
  }
  state.results.push(result);

  if (r >= state.totalRounds) {
    state.phase = "end";
    state.roundStart = null;
  } else {
    startRound(state, r + 1, now);
  }
}

export function applyAction(
  state: GameState,
  token: string,
  action: string,
  body: Record<string, unknown>,
  now = Date.now()
) {
  const p = requirePlayer(state, token);
  switch (action) {
    case "start": {
      requireHost(state, token);
      if (state.phase !== "lobby") throw new GameError("이미 시작되었습니다.");
      if (state.players.length < MIN_PLAYERS) throw new GameError(`${MIN_PLAYERS}명 이상 필요합니다.`);
      startRound(state, 1, now);
      return;
    }
    case "bid": {
      if (state.phase !== "round") throw new GameError("경매 중이 아닙니다.");
      if (Number(body.round) !== state.round) throw new GameError("이미 끝난 라운드예요.");
      if (p.submitted) throw new GameError("이번 라운드는 이미 제출했어요.");
      // 0.1초 단위로 내림, 남은 시간보다 많이 쓸 수는 없음
      let bid = Math.floor(Math.max(0, Number(body.ms) || 0) / TICK) * TICK;
      bid = Math.min(bid, Math.floor(p.bank / TICK) * TICK);
      p.bids[state.round - 1] = bid;
      p.bank -= bid;
      p.submitted = true;
      if (state.players.every((x) => x.submitted)) resolveRound(state, now);
      return;
    }
    case "forceClose": {
      requireHost(state, token);
      if (state.phase !== "round") throw new GameError("경매 중이 아닙니다.");
      resolveRound(state, now);
      return;
    }
    case "chat": {
      const text = String(body.text ?? "").trim().slice(0, 200);
      if (!text) throw new GameError("메시지를 입력해주세요.");
      state.chat.push({ id: (state.chat[state.chat.length - 1]?.id ?? 0) + 1, playerId: p.id, text, at: now });
      if (state.chat.length > 150) state.chat.splice(0, state.chat.length - 150);
      return;
    }
    default:
      throw new GameError("알 수 없는 요청입니다.");
  }
}

// ---------- 순위 ----------

export function ranking(state: GameState) {
  return [...state.players].sort((a, b) => b.tokens - a.tokens || b.bank - a.bank);
}

// ---------- 화면용 데이터 ----------

export type GameView = {
  code: string;
  version: number;
  serverNow: number;
  phase: Phase;
  round: number;
  totalRounds: number;
  startBank: number;
  hideBank: boolean;
  roundStart: number | null;
  players: {
    id: string;
    name: string;
    isHost: boolean;
    tokens: number;
    bank: number | null; // 게임 종료 후에만
    bids: number[] | null; // 게임 종료 후에만
  }[];
  me: {
    id: string;
    isHost: boolean;
    bank: number;
    tokens: number;
    submitted: boolean;
    bids: number[];
  } | null;
  waitingCount: number; // 아직 제출 안 한 사람 수 (방장 진행용)
  results: { round: number; winner: string | null; winnerName: string | null; outcome: RoundResult["outcome"] }[];
  chat: { id: number; playerId: string; name: string; text: string }[];
};

export function toView(state: GameState, token: string | null, now = Date.now()): GameView {
  const me = findPlayer(state, token);
  const ended = state.phase === "end";
  const nameOf = (id: string | null) => state.players.find((p) => p.id === id)?.name ?? null;
  return {
    code: state.code,
    version: state.version,
    serverNow: now,
    phase: state.phase,
    round: state.round,
    totalRounds: state.totalRounds,
    startBank: state.startBank,
    hideBank: state.hideBank,
    roundStart: state.roundStart,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      isHost: p.id === state.hostId,
      tokens: p.tokens,
      bank: ended ? p.bank : null,
      bids: ended ? p.bids : null,
    })),
    me: me
      ? { id: me.id, isHost: me.id === state.hostId, bank: me.bank, tokens: me.tokens, submitted: me.submitted, bids: me.bids }
      : null,
    waitingCount: state.phase === "round" ? state.players.filter((p) => !p.submitted).length : 0,
    results: state.results.map((r) => ({ ...r, winnerName: nameOf(r.winner) })),
    chat: state.chat.slice(-100).map((m) => ({ id: m.id, playerId: m.playerId, name: nameOf(m.playerId) ?? "?", text: m.text })),
  };
}
