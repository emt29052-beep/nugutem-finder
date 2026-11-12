// 하나 빼기 (서버 로직)
// - 각자 1~8 카드. 6라운드마다 새 덱.
// - 라운드: 카드 2장 비공개 제출 → 동시 공개 → 둘 중 하나를 몰래 선택 → 공개
// - 같은 숫자는 모두 무효, 남은 것 중 가장 작은 숫자가 승리 (숫자만큼 점수 + 토큰 1)
// - 낸 카드는 버리고, 안 낸 카드는 다음 라운드에 쉰다(사용 불가).
// - 생존 모드(선택): 3라운드마다 (점수 + 토큰) 1등이 생존해서 빠지고 나머지는 점수 0으로 초기화.

export const CARDS = [1, 2, 3, 4, 5, 6, 7, 8];
export const CYCLE = 6;
export const CHECK_EVERY = 3;
export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 12;

export type Phase = "lobby" | "pick" | "choose" | "end";

export type Player = {
  id: string;
  name: string;
  token: string;
  hand: number[]; // 이번 덱에서 아직 안 쓴 카드
  resting: number | null; // 지난 라운드에 안 낸 카드 (이번 라운드 사용 불가)
  pair: [number, number] | null;
  keep: 0 | 1 | null;
  score: number;
  tokens: number;
  lastWinRound: number;
  survivedAt: number | null; // 생존 모드: 생존 확정 라운드
};

export type RoundResult = {
  round: number;
  plays: { playerId: string; pair: [number, number]; kept: number }[];
  voided: number[];
  winner: string | null;
  points: number;
  checkpoint: { survivor: string | null; scores: { playerId: string; total: number }[]; final: boolean } | null;
};

export type ChatMsg = { id: number; playerId: string; text: string; at: number };

export type GameState = {
  code: string;
  version: number;
  hostId: string;
  phase: Phase;
  round: number;
  totalRounds: number;
  survival: boolean;
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

function newPlayer(name: string): Player {
  return {
    id: randomId(8),
    name,
    token: randomId(24),
    hand: [...CARDS],
    resting: null,
    pair: null,
    keep: null,
    score: 0,
    tokens: 0,
    lastWinRound: 0,
    survivedAt: null,
  };
}

export function createGame(code: string, hostName: unknown, rounds: unknown, survival: unknown) {
  const r = Number(rounds);
  const totalRounds = [6, 12, 18].includes(r) ? r : 18;
  const host = newPlayer(cleanName(hostName));
  const state: GameState = {
    code,
    version: 0,
    hostId: host.id,
    phase: "lobby",
    round: 0,
    totalRounds,
    survival: survival === true,
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
  const p = newPlayer(n);
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

export const active = (state: GameState) => state.players.filter((p) => p.survivedAt === null);
export const available = (p: Player) => p.hand.filter((c) => c !== p.resting);

function startRound(state: GameState, round: number) {
  state.round = round;
  state.phase = "pick";
  const newDeck = (round - 1) % CYCLE === 0;
  for (const p of state.players) {
    if (newDeck) {
      p.hand = [...CARDS];
      p.resting = null;
    }
    p.pair = null;
    p.keep = null;
  }
}

function randomPick<T>(arr: T[]): T {
  return arr[crypto.getRandomValues(new Uint32Array(1))[0] % arr.length];
}

function autoPair(p: Player): [number, number] {
  const av = [...available(p)];
  const a = randomPick(av);
  const b = randomPick(av.filter((x) => x !== a));
  return a < b ? [a, b] : [b, a];
}

/** (점수 + 토큰) 기준 순위 비교 — 동점이면 토큰, 그다음 최근에 이긴 사람 */
function compare(a: Player, b: Player) {
  return b.score + b.tokens - (a.score + a.tokens) || b.tokens - a.tokens || b.lastWinRound - a.lastWinRound;
}

function resolveRound(state: GameState) {
  const r = state.round;
  const players = active(state);
  const plays = players.map((p) => ({ p, kept: p.pair![p.keep ?? 0] }));
  const counts = new Map<number, number>();
  for (const x of plays) counts.set(x.kept, (counts.get(x.kept) ?? 0) + 1);
  const voided = [...counts.entries()].filter(([, n]) => n > 1).map(([c]) => c).sort((a, b) => a - b);
  const valid = plays.filter((x) => counts.get(x.kept) === 1).sort((a, b) => a.kept - b.kept);
  const win = valid[0] ?? null;
  if (win) {
    win.p.score += win.kept;
    win.p.tokens += 1;
    win.p.lastWinRound = r;
  }
  // 카드 정리: 낸 카드는 버리고, 안 낸 카드는 한 라운드 휴식
  for (const x of plays) {
    const unused = x.p.pair![x.p.keep === 1 ? 0 : 1];
    x.p.hand = x.p.hand.filter((c) => c !== x.kept);
    x.p.resting = unused;
  }

  const result: RoundResult = {
    round: r,
    plays: plays.map((x) => ({ playerId: x.p.id, pair: x.p.pair!, kept: x.kept })),
    voided,
    winner: win?.p.id ?? null,
    points: win?.kept ?? 0,
    checkpoint: null,
  };

  // 생존 모드 체크포인트
  const last = r >= state.totalRounds;
  if (state.survival && (r % CHECK_EVERY === 0 || last)) {
    const ranked = [...players].sort(compare);
    const scores = ranked.map((p) => ({ playerId: p.id, total: p.score + p.tokens }));
    if (last) {
      // 마지막: 꼴찌 한 명만 빼고 모두 생존
      for (const p of ranked.slice(0, -1)) p.survivedAt = r;
      result.checkpoint = { survivor: null, scores, final: true };
    } else {
      ranked[0].survivedAt = r;
      result.checkpoint = { survivor: ranked[0].id, scores, final: false };
      for (const p of players) if (p.survivedAt === null) p.score = 0;
    }
  }
  state.results.push(result);

  if (last || (state.survival && active(state).length <= 1)) state.phase = "end";
  else startRound(state, r + 1);
}

function maybeAdvance(state: GameState) {
  const players = active(state);
  if (state.phase === "pick" && players.every((p) => p.pair)) state.phase = "choose";
  else if (state.phase === "choose" && players.every((p) => p.keep !== null)) resolveRound(state);
}

export function applyAction(state: GameState, token: string, action: string, body: Record<string, unknown>) {
  const p = requirePlayer(state, token);
  switch (action) {
    case "start": {
      requireHost(state, token);
      if (state.phase !== "lobby") throw new GameError("이미 시작되었습니다.");
      if (state.players.length < MIN_PLAYERS) throw new GameError(`${MIN_PLAYERS}명 이상 필요합니다.`);
      startRound(state, 1);
      return;
    }
    case "pick": {
      if (state.phase !== "pick") throw new GameError("카드를 고르는 시간이 아닙니다.");
      if (p.survivedAt !== null) throw new GameError("이미 생존해서 구경 중이에요.");
      if (p.pair) throw new GameError("이미 제출했어요.");
      const cards = Array.isArray(body.cards) ? body.cards.map(Number) : [];
      const av = available(p);
      if (cards.length !== 2 || cards[0] === cards[1] || !cards.every((c) => av.includes(c)))
        throw new GameError("낼 수 있는 카드 2장을 골라주세요.");
      p.pair = cards[0] < cards[1] ? [cards[0], cards[1]] : [cards[1], cards[0]];
      maybeAdvance(state);
      return;
    }
    case "keep": {
      if (state.phase !== "choose") throw new GameError("선택하는 시간이 아닙니다.");
      if (p.survivedAt !== null || !p.pair) throw new GameError("참가 중이 아니에요.");
      if (p.keep !== null) throw new GameError("이미 골랐어요.");
      const k = Number(body.side);
      if (k !== 0 && k !== 1) throw new GameError("카드를 골라주세요.");
      p.keep = k;
      maybeAdvance(state);
      return;
    }
    case "force": {
      requireHost(state, token);
      if (state.phase === "pick") {
        for (const x of active(state)) if (!x.pair) x.pair = autoPair(x);
      } else if (state.phase === "choose") {
        for (const x of active(state)) if (x.keep === null) x.keep = Math.random() < 0.5 ? 0 : 1;
      } else throw new GameError("진행 중이 아닙니다.");
      maybeAdvance(state);
      return;
    }
    case "chat": {
      const text = String(body.text ?? "").trim().slice(0, 200);
      if (!text) throw new GameError("메시지를 입력해주세요.");
      state.chat.push({ id: (state.chat[state.chat.length - 1]?.id ?? 0) + 1, playerId: p.id, text, at: Date.now() });
      if (state.chat.length > 150) state.chat.splice(0, state.chat.length - 150);
      return;
    }
    default:
      throw new GameError("알 수 없는 요청입니다.");
  }
}

/** 최종 순위: 생존 모드는 생존이 빠른 순, 기본 모드는 (점수 + 토큰) */
export function finalRanking(state: GameState) {
  if (!state.survival) return [...state.players].sort(compare);
  const survived = state.players
    .filter((p) => p.survivedAt !== null)
    .sort((a, b) => a.survivedAt! - b.survivedAt! || compare(a, b));
  const rest = state.players.filter((p) => p.survivedAt === null).sort(compare);
  return [...survived, ...rest];
}

// ---------- 화면용 데이터 ----------

export type GameView = {
  code: string;
  version: number;
  phase: Phase;
  round: number;
  totalRounds: number;
  survival: boolean;
  players: {
    id: string;
    name: string;
    isHost: boolean;
    score: number;
    tokens: number;
    survivedAt: number | null;
    ready: boolean; // 이번 단계 제출 여부
    pair: [number, number] | null; // 선택 단계 이후 공개
    cardsLeft: number;
    resting: number | null; // 공개 정보 (지난 라운드에 남긴 카드)
  }[];
  me: {
    id: string;
    isHost: boolean;
    hand: number[];
    resting: number | null;
    pair: [number, number] | null;
    keep: 0 | 1 | null;
    active: boolean;
  } | null;
  lastResult: RoundResult | null;
  results: RoundResult[];
  ranking: string[] | null;
  chat: { id: number; playerId: string; name: string; text: string }[];
};

export function toView(state: GameState, token: string | null): GameView {
  const me = findPlayer(state, token);
  const nameOf = (id: string) => state.players.find((p) => p.id === id)?.name ?? "?";
  return {
    code: state.code,
    version: state.version,
    phase: state.phase,
    round: state.round,
    totalRounds: state.totalRounds,
    survival: state.survival,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      isHost: p.id === state.hostId,
      score: p.score,
      tokens: p.tokens,
      survivedAt: p.survivedAt,
      ready: state.phase === "pick" ? !!p.pair : state.phase === "choose" ? p.keep !== null : false,
      pair: state.phase === "choose" ? p.pair : null,
      cardsLeft: p.hand.length,
      resting: p.resting,
    })),
    me: me
      ? {
          id: me.id,
          isHost: me.id === state.hostId,
          hand: me.hand,
          resting: me.resting,
          pair: me.pair,
          keep: me.keep,
          active: me.survivedAt === null,
        }
      : null,
    lastResult: state.results[state.results.length - 1] ?? null,
    results: state.phase === "end" ? state.results : [],
    ranking: state.phase === "end" ? finalRanking(state).map((p) => p.id) : null,
    chat: state.chat.slice(-100).map((m) => ({ id: m.id, playerId: m.playerId, name: nameOf(m.playerId), text: m.text })),
  };
}
