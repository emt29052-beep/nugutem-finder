// 블러프 마켓: 숨겨진 정보 카드로 주가를 추리하는 친구들용 주식 게임 (서버 로직)

export const START_CASH = 10000;
export const START_PRICE = 1000;
export const MAX_PLAYERS = 10;
export const INFO_DELTAS = [-200, -150, -100, -50, 50, 100, 150, 200];
export const MARKET_DELTAS = [-100, -50, 0, 50, 100];

export const STOCK_DEFS = [
  { id: "A", name: "알파전자", emoji: "💻", color: "#60a5fa" },
  { id: "B", name: "베타바이오", emoji: "🧬", color: "#34d399" },
  { id: "C", name: "감마에너지", emoji: "⚡", color: "#fbbf24" },
  { id: "D", name: "델타엔터", emoji: "🎬", color: "#f472b6" },
] as const;

export type StockId = (typeof STOCK_DEFS)[number]["id"];
export const STOCK_IDS = STOCK_DEFS.map((s) => s.id) as StockId[];

export type Phase = "lobby" | "talk" | "order" | "result" | "end";

export type Card = { stock: StockId; delta: number };
export type Holdings = Record<StockId, number>;
export type Order = Record<StockId, number>; // +매수 / -매도

export type Player = {
  id: string;
  name: string;
  token: string;
  cash: number;
  shares: Holdings;
  cards: Card[];
  order: Order | null;
};

export type Stock = { id: StockId; price: number; history: number[] };

export type StockChange = {
  from: number;
  to: number;
  market: number;
  delisted: boolean;
};

export type RoundResult = {
  round: number;
  cards: { playerId: string; cards: Card[] }[];
  orders: { playerId: string; order: Order | null }[];
  changes: Record<StockId, StockChange>;
};

export type Transfer = {
  round: number;
  from: string;
  to: string;
  cash: number;
  stock: StockId | null;
  qty: number;
  at: number;
};

export type GameState = {
  code: string;
  version: number;
  hostId: string;
  phase: Phase;
  round: number;
  totalRounds: number;
  cardsPerPlayer: number;
  stocks: Stock[];
  players: Player[];
  results: RoundResult[];
  transfers: Transfer[];
  createdAt: number;
};

export class GameError extends Error {}

const emptyHoldings = (): Holdings => ({ A: 0, B: 0, C: 0, D: 0 });

function rand<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomId(len = 16) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  for (const b of bytes) s += chars[b % chars.length];
  return s;
}

export function randomRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  for (const b of bytes) s += chars[b % chars.length];
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
    cash: START_CASH,
    shares: emptyHoldings(),
    cards: [],
    order: null,
  };
}

export function createGame(
  code: string,
  hostName: unknown,
  totalRounds: unknown,
  cardsPerPlayer: unknown
): { state: GameState; player: Player } {
  const rounds = Math.min(10, Math.max(3, Math.floor(Number(totalRounds) || 5)));
  const cards = Math.min(3, Math.max(1, Math.floor(Number(cardsPerPlayer) || 2)));
  const host = newPlayer(cleanName(hostName));
  const state: GameState = {
    code,
    version: 0,
    hostId: host.id,
    phase: "lobby",
    round: 0,
    totalRounds: rounds,
    cardsPerPlayer: cards,
    stocks: STOCK_IDS.map((id) => ({ id, price: START_PRICE, history: [START_PRICE] })),
    players: [host],
    results: [],
    transfers: [],
    createdAt: Date.now(),
  };
  return { state, player: host };
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

export function joinGame(state: GameState, name: unknown): Player {
  if (state.phase !== "lobby") throw new GameError("이미 게임이 시작되었습니다.");
  if (state.players.length >= MAX_PLAYERS) throw new GameError("방이 가득 찼습니다.");
  const n = cleanName(name);
  if (state.players.some((p) => p.name === n)) throw new GameError("이미 사용 중인 닉네임입니다.");
  const p = newPlayer(n);
  state.players.push(p);
  return p;
}

function dealRound(state: GameState) {
  state.round += 1;
  for (const p of state.players) {
    p.cards = Array.from({ length: state.cardsPerPlayer }, () => ({
      stock: rand(STOCK_IDS),
      delta: rand(INFO_DELTAS),
    }));
    p.order = null;
  }
  state.phase = "talk";
}

export function priceOf(state: GameState, id: StockId) {
  return state.stocks.find((s) => s.id === id)!.price;
}

export function totalAssets(state: GameState, p: Player) {
  return p.cash + STOCK_IDS.reduce((sum, id) => sum + p.shares[id] * priceOf(state, id), 0);
}

function parseOrder(raw: unknown): Order {
  const order = emptyHoldings();
  const obj = (raw ?? {}) as Record<string, unknown>;
  for (const id of STOCK_IDS) {
    const v = Math.trunc(Number(obj[id] ?? 0));
    if (!Number.isFinite(v) || Math.abs(v) > 100000) throw new GameError("주문 수량이 올바르지 않습니다.");
    order[id] = v;
  }
  return order;
}

function validateOrder(state: GameState, p: Player, order: Order) {
  let cash = p.cash;
  for (const id of STOCK_IDS) {
    if (order[id] < 0) {
      if (-order[id] > p.shares[id]) throw new GameError("보유 수량보다 많이 팔 수 없습니다.");
      cash += -order[id] * priceOf(state, id);
    }
  }
  for (const id of STOCK_IDS) {
    if (order[id] > 0) cash -= order[id] * priceOf(state, id);
  }
  if (cash < 0) throw new GameError("현금이 부족합니다.");
}

function executeOrder(state: GameState, p: Player) {
  if (!p.order) return;
  // 송금 등으로 상황이 바뀌어 주문이 불가능해졌다면 무효 처리
  try {
    validateOrder(state, p, p.order);
  } catch {
    p.order = null;
    return;
  }
  for (const id of STOCK_IDS) {
    const q = p.order[id];
    p.cash -= q * priceOf(state, id);
    p.shares[id] += q;
  }
}

function resolveRound(state: GameState) {
  for (const p of state.players) executeOrder(state, p);

  const changes = {} as Record<StockId, StockChange>;
  for (const s of state.stocks) {
    const market = rand(MARKET_DELTAS);
    const cardSum = state.players
      .flatMap((p) => p.cards)
      .filter((c) => c.stock === s.id)
      .reduce((sum, c) => sum + c.delta, 0);
    const from = s.price;
    let to = from + cardSum + market;
    let delisted = false;
    if (to <= 0) {
      delisted = true;
      to = 0;
      for (const p of state.players) p.shares[s.id] = 0;
    }
    changes[s.id] = { from, to, market, delisted };
    s.price = delisted ? START_PRICE : to; // 상장폐지 후 재상장
    s.history.push(to);
  }

  state.results.push({
    round: state.round,
    cards: state.players.map((p) => ({ playerId: p.id, cards: p.cards })),
    orders: state.players.map((p) => ({ playerId: p.id, order: p.order })),
    changes,
  });
  state.phase = "result";
}

export function applyAction(
  state: GameState,
  token: string,
  action: string,
  body: Record<string, unknown>
) {
  switch (action) {
    case "start": {
      requireHost(state, token);
      if (state.phase !== "lobby") throw new GameError("이미 시작되었습니다.");
      if (state.players.length < 2) throw new GameError("2명 이상 필요합니다.");
      dealRound(state);
      return;
    }
    case "openOrders": {
      requireHost(state, token);
      if (state.phase !== "talk") throw new GameError("지금은 할 수 없습니다.");
      state.phase = "order";
      return;
    }
    case "backToTalk": {
      requireHost(state, token);
      if (state.phase !== "order") throw new GameError("지금은 할 수 없습니다.");
      state.phase = "talk";
      return;
    }
    case "order": {
      const p = requirePlayer(state, token);
      if (state.phase !== "order") throw new GameError("주문 시간이 아닙니다.");
      const order = parseOrder(body.order);
      validateOrder(state, p, order);
      p.order = order;
      return;
    }
    case "cancelOrder": {
      const p = requirePlayer(state, token);
      if (state.phase !== "order") throw new GameError("주문 시간이 아닙니다.");
      p.order = null;
      return;
    }
    case "reveal": {
      requireHost(state, token);
      if (state.phase !== "order") throw new GameError("주문 단계에서만 공개할 수 있습니다.");
      resolveRound(state);
      return;
    }
    case "next": {
      requireHost(state, token);
      if (state.phase !== "result") throw new GameError("지금은 할 수 없습니다.");
      if (state.round >= state.totalRounds) {
        state.phase = "end";
        for (const p of state.players) p.cards = [];
      } else {
        dealRound(state);
      }
      return;
    }
    case "transfer": {
      const p = requirePlayer(state, token);
      if (state.phase !== "talk" && state.phase !== "order")
        throw new GameError("대화/주문 단계에서만 송금할 수 있습니다.");
      const to = state.players.find((x) => x.id === body.to);
      if (!to || to.id === p.id) throw new GameError("받는 사람을 선택해주세요.");
      const cash = Math.max(0, Math.trunc(Number(body.cash) || 0));
      const stock = STOCK_IDS.includes(body.stock as StockId) ? (body.stock as StockId) : null;
      const qty = stock ? Math.max(0, Math.trunc(Number(body.qty) || 0)) : 0;
      if (cash === 0 && qty === 0) throw new GameError("보낼 현금이나 주식 수량을 입력해주세요.");
      if (cash > p.cash) throw new GameError("현금이 부족합니다.");
      if (stock && qty > p.shares[stock]) throw new GameError("보유 주식이 부족합니다.");
      p.cash -= cash;
      to.cash += cash;
      if (stock) {
        p.shares[stock] -= qty;
        to.shares[stock] += qty;
      }
      // 이미 낸 주문이 불가능해졌으면 취소
      for (const x of [p, to]) {
        if (x.order) {
          try {
            validateOrder(state, x, x.order);
          } catch {
            x.order = null;
          }
        }
      }
      state.transfers.push({ round: state.round, from: p.id, to: to.id, cash, stock, qty, at: Date.now() });
      return;
    }
    default:
      throw new GameError("알 수 없는 요청입니다.");
  }
}

// ---- 클라이언트로 보내는 화면용 데이터 (남의 비밀 정보는 제거) ----

export type PublicPlayer = {
  id: string;
  name: string;
  isHost: boolean;
  submitted: boolean;
  total: number | null;
  cash: number | null;
  shares: Holdings | null;
};

export type GameView = {
  code: string;
  version: number;
  phase: Phase;
  round: number;
  totalRounds: number;
  cardsPerPlayer: number;
  stocks: Stock[];
  players: PublicPlayer[];
  me: {
    id: string;
    name: string;
    isHost: boolean;
    cash: number;
    shares: Holdings;
    cards: Card[];
    order: Order | null;
    total: number;
  } | null;
  lastResult: RoundResult | null;
  results: { round: number; changes: Record<StockId, StockChange> }[];
  myTransfers: Transfer[];
};

export function toView(state: GameState, token: string | null): GameView {
  const me = findPlayer(state, token);
  const showTotals = state.phase === "result" || state.phase === "end";
  const showAll = state.phase === "end";
  const revealed = state.phase === "result" || state.phase === "end";
  return {
    code: state.code,
    version: state.version,
    phase: state.phase,
    round: state.round,
    totalRounds: state.totalRounds,
    cardsPerPlayer: state.cardsPerPlayer,
    stocks: state.stocks,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      isHost: p.id === state.hostId,
      submitted: p.order !== null,
      total: showTotals ? totalAssets(state, p) : null,
      cash: showAll ? p.cash : null,
      shares: showAll ? p.shares : null,
    })),
    me: me
      ? {
          id: me.id,
          name: me.name,
          isHost: me.id === state.hostId,
          cash: me.cash,
          shares: me.shares,
          cards: me.cards,
          order: me.order,
          total: totalAssets(state, me),
        }
      : null,
    lastResult: revealed ? state.results[state.results.length - 1] ?? null : null,
    results: state.results.map((r) => ({ round: r.round, changes: r.changes })),
    myTransfers: me ? state.transfers.filter((t) => t.from === me.id || t.to === me.id) : [],
  };
}
