// 다우트 앤 벳 (서버 로직)
// - 카드 60장: 5색 × 10장 + 무지개(와일드) 10장. 각자 슬롯 수만큼 카드를 받는다(자기 카드만 보임).
// - 차례대로 "전체 카드 중 ○색이 N장 이상" 예측 + 코인을 건다.
// - 다음 사람은 인정(이전 예측자는 건 코인 돌려받음)하고 더 큰 숫자로 새 예측을 하거나, 다우트한다.
// - 다우트 → 두 사람 1:1 베팅(콜/레이즈/폴드). 콜이면 카드 공개: 실제 ≥ 예측이면 예측자 승, 아니면 다우트한 사람 승.
// - 슬롯은 코인 2개로 팔고 살 수 있다(최소 1, 최대 5). 최종 점수 = 코인 + 슬롯 × 2.

export const COLORS = {
  red: { name: "빨강", emoji: "🔴", hex: "#ef4444" },
  yellow: { name: "노랑", emoji: "🟡", hex: "#eab308" },
  green: { name: "초록", emoji: "🟢", hex: "#22c55e" },
  blue: { name: "파랑", emoji: "🔵", hex: "#3b82f6" },
  purple: { name: "보라", emoji: "🟣", hex: "#a855f7" },
  rainbow: { name: "무지개", emoji: "🌈", hex: "#f472b6" },
} as const;
export type CardColor = keyof typeof COLORS;
export type ClaimColor = Exclude<CardColor, "rainbow">;
export const CLAIM_COLORS: ClaimColor[] = ["red", "yellow", "green", "blue", "purple"];
const DECK: CardColor[] = (Object.keys(COLORS) as CardColor[]).flatMap((c) => Array<CardColor>(10).fill(c));

export const START_COINS = 10;
export const MAX_SLOTS = 5;
export const SLOT_VALUE = 2;
export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 10;

export type Phase = "lobby" | "bidding" | "showdown" | "end";

export type Player = {
  id: string;
  name: string;
  token: string;
  coins: number;
  slots: number;
  cards: CardColor[];
  out: boolean;
};

export type Claim = { by: string; color: ClaimColor; count: number; stake: number };

export type Showdown = {
  predictor: string;
  doubter: string;
  commit: Record<string, number>;
  toAct: string;
  log: { by: string; move: "doubt" | "call" | "raise" | "fold"; total: number }[];
};

export type HandResult = {
  hand: number;
  claim: Claim;
  doubter: string;
  folded: string | null;
  actual: number | null;
  winner: string;
  pot: number;
  cards: { playerId: string; cards: CardColor[] }[] | null; // 폴드면 공개 안 함
};

export type ChatMsg = { id: number; playerId: string; text: string; at: number };

export type GameState = {
  code: string;
  version: number;
  hostId: string;
  phase: Phase;
  hand: number;
  totalHands: number;
  players: Player[];
  turn: string | null;
  claim: Claim | null;
  history: { by: string; color: ClaimColor; count: number; stake: number }[];
  showdown: Showdown | null;
  results: HandResult[];
  events: string[];
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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cleanName(name: unknown) {
  const n = String(name ?? "").trim().slice(0, 12);
  if (!n) throw new GameError("닉네임을 입력해주세요.");
  return n;
}

function newPlayer(name: string): Player {
  return { id: randomId(8), name, token: randomId(24), coins: START_COINS, slots: MAX_SLOTS, cards: [], out: false };
}

export function createGame(code: string, hostName: unknown, hands: unknown) {
  const h = Number(hands);
  const totalHands = [5, 10, 15, 20].includes(h) ? h : 10;
  const host = newPlayer(cleanName(hostName));
  const state: GameState = {
    code,
    version: 0,
    hostId: host.id,
    phase: "lobby",
    hand: 0,
    totalHands,
    players: [host],
    turn: null,
    claim: null,
    history: [],
    showdown: null,
    results: [],
    events: [],
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

const byId = (state: GameState, id: string) => state.players.find((p) => p.id === id)!;
export const activePlayers = (state: GameState) => state.players.filter((p) => !p.out);
// 판에 깔린 카드 (중간에 파산한 사람의 카드도 그 판이 끝날 때까지는 센다)
export const totalCards = (state: GameState) => state.players.reduce((s, p) => s + p.cards.length, 0);
export const score = (p: Player) => p.coins + p.slots * SLOT_VALUE;

function nextActive(state: GameState, fromId: string) {
  const list = state.players;
  const i = list.findIndex((p) => p.id === fromId);
  for (let k = 1; k <= list.length; k++) {
    const p = list[(i + k) % list.length];
    if (!p.out) return p.id;
  }
  return fromId;
}

/** 차례를 넘긴다. 코인이 0인 사람은 슬롯을 자동으로 팔고, 그것도 안 되면 파산 처리 후 다음 사람에게 */
function setTurn(state: GameState, id: string) {
  for (let guard = 0; guard < state.players.length; guard++) {
    const p = byId(state, id);
    if (p.coins === 0 && p.slots > 1) {
      p.slots -= 1;
      p.coins += SLOT_VALUE;
      state.events.push(`${p.name}님이 코인이 없어 슬롯 1개를 팔았어요.`);
    }
    if (p.coins > 0) {
      state.turn = id;
      return;
    }
    p.out = true;
    state.events.push(`💀 ${p.name}님 파산!`);
    id = nextActive(state, id);
  }
  state.turn = id;
}

function startHand(state: GameState, starter: string) {
  state.hand += 1;
  state.events = [];
  for (const p of state.players) {
    if (p.out) continue;
    // 코인이 없으면 슬롯을 팔아서라도 계속, 그것도 안 되면 탈락
    while (p.coins === 0 && p.slots > 1) {
      p.slots -= 1;
      p.coins += SLOT_VALUE;
      state.events.push(`${p.name}님이 코인이 없어 슬롯 1개를 팔았어요.`);
    }
    if (p.coins === 0) {
      p.out = true;
      p.cards = [];
      state.events.push(`💀 ${p.name}님 파산!`);
    }
  }
  if (activePlayers(state).length <= 1) return endGame(state);
  const deck = shuffle(DECK);
  for (const p of activePlayers(state)) p.cards = deck.splice(0, p.slots);
  state.phase = "bidding";
  state.claim = null;
  state.history = [];
  state.showdown = null;
  setTurn(state, byId(state, starter).out ? nextActive(state, starter) : starter);
}

function endGame(state: GameState) {
  state.phase = "end";
  state.turn = null;
  state.claim = null;
  state.showdown = null;
}

function countColor(state: GameState, color: ClaimColor) {
  return state.players.reduce((s, p) => s + p.cards.filter((c) => c === color || c === "rainbow").length, 0);
}

function resolveShowdown(state: GameState, folded: string | null) {
  const sd = state.showdown!;
  const claim = state.claim!;
  const pot = Object.values(sd.commit).reduce((a, b) => a + b, 0);
  let winner: string;
  let actual: number | null = null;
  if (folded) winner = folded === sd.predictor ? sd.doubter : sd.predictor;
  else {
    actual = countColor(state, claim.color);
    winner = actual >= claim.count ? sd.predictor : sd.doubter;
  }
  byId(state, winner).coins += pot;
  const loser = winner === sd.predictor ? sd.doubter : sd.predictor;
  state.results.push({
    hand: state.hand,
    claim,
    doubter: sd.doubter,
    folded,
    actual,
    winner,
    pot,
    cards: folded ? null : state.players.filter((p) => p.cards.length > 0).map((p) => ({ playerId: p.id, cards: p.cards })),
  });
  if (state.hand >= state.totalHands) {
    for (const p of state.players) p.cards = [];
    return endGame(state);
  }
  startHand(state, loser);
}

function maxTotal(state: GameState, sd: Showdown) {
  // 두 사람 모두 감당할 수 있는 최대 베팅
  const a = byId(state, sd.predictor);
  const b = byId(state, sd.doubter);
  return Math.min(a.coins + sd.commit[a.id], b.coins + sd.commit[b.id]);
}

function commitTo(state: GameState, sd: Showdown, p: Player, total: number) {
  const add = total - sd.commit[p.id];
  if (add > p.coins) throw new GameError("코인이 부족해요.");
  p.coins -= add;
  sd.commit[p.id] = total;
}

export function applyAction(state: GameState, token: string, action: string, body: Record<string, unknown>) {
  const p = requirePlayer(state, token);
  switch (action) {
    case "start": {
      requireHost(state, token);
      if (state.phase !== "lobby") throw new GameError("이미 시작되었습니다.");
      if (state.players.length < MIN_PLAYERS) throw new GameError(`${MIN_PLAYERS}명 이상 필요합니다.`);
      const first = state.players[crypto.getRandomValues(new Uint32Array(1))[0] % state.players.length];
      startHand(state, first.id);
      return;
    }
    case "claim": {
      if (state.phase !== "bidding" || state.turn !== p.id) throw new GameError("내 차례가 아니에요.");
      const color = body.color as ClaimColor;
      if (!CLAIM_COLORS.includes(color)) throw new GameError("색을 골라주세요.");
      const count = Math.trunc(Number(body.count));
      const stake = Math.trunc(Number(body.stake));
      const min = (state.claim?.count ?? 0) + 1;
      if (!(count >= min && count <= totalCards(state))) throw new GameError(`${min}~${totalCards(state)}장 사이로 예측하세요.`);
      if (!(stake >= 1 && stake <= p.coins)) throw new GameError("걸 코인을 확인해주세요.");
      if (state.claim) {
        // 이전 예측 인정 → 이전 예측자는 건 코인을 돌려받음
        byId(state, state.claim.by).coins += state.claim.stake;
      }
      p.coins -= stake;
      state.claim = { by: p.id, color, count, stake };
      state.history.push({ ...state.claim });
      setTurn(state, nextActive(state, p.id));
      if (activePlayers(state).length <= 1) endGame(state);
      return;
    }
    case "doubt": {
      if (state.phase !== "bidding" || state.turn !== p.id) throw new GameError("내 차례가 아니에요.");
      if (!state.claim) throw new GameError("다우트할 예측이 없어요.");
      const claim = state.claim;
      const predictor = byId(state, claim.by);
      const cap = Math.min(p.coins, predictor.coins + claim.stake);
      const amount = Math.trunc(Number(body.amount ?? claim.stake));
      if (p.coins < 1) throw new GameError("코인이 없어요. 슬롯을 팔아보세요.");
      // 코인이 모자라면 가진 만큼만(올인) 콜 가능
      const need = Math.min(claim.stake, p.coins);
      if (!(amount >= need && amount <= Math.max(cap, need))) throw new GameError(`${need}~${Math.max(cap, need)}코인 사이로 걸어주세요.`);
      const sd: Showdown = {
        predictor: claim.by,
        doubter: p.id,
        commit: { [claim.by]: claim.stake, [p.id]: 0 },
        toAct: claim.by,
        log: [],
      };
      commitTo(state, sd, p, amount);
      sd.log.push({ by: p.id, move: "doubt", total: amount });
      state.showdown = sd;
      state.phase = "showdown";
      state.turn = null;
      // 예측자가 건 만큼만 받았으면 바로 콜 → 공개
      if (amount <= claim.stake) resolveShowdown(state, null);
      return;
    }
    case "respond": {
      const sd = state.showdown;
      if (state.phase !== "showdown" || !sd || sd.toAct !== p.id) throw new GameError("내 차례가 아니에요.");
      const other = p.id === sd.predictor ? sd.doubter : sd.predictor;
      const move = body.move;
      if (move === "fold") {
        sd.log.push({ by: p.id, move: "fold", total: sd.commit[p.id] });
        resolveShowdown(state, p.id);
      } else if (move === "call") {
        const target = Math.min(sd.commit[other], p.coins + sd.commit[p.id]); // 모자라면 올인
        commitTo(state, sd, p, target);
        sd.log.push({ by: p.id, move: "call", total: target });
        resolveShowdown(state, null);
      } else if (move === "raise") {
        const total = Math.trunc(Number(body.total));
        const cap = maxTotal(state, sd);
        if (!(total > sd.commit[other] && total <= cap)) throw new GameError(`${sd.commit[other] + 1}~${cap}코인 사이로 올려주세요.`);
        commitTo(state, sd, p, total);
        sd.log.push({ by: p.id, move: "raise", total });
        sd.toAct = other;
      } else throw new GameError("콜, 레이즈, 폴드 중에 골라주세요.");
      return;
    }
    case "sellSlot": {
      if (p.out || state.phase === "end") throw new GameError("지금은 할 수 없어요.");
      if (p.slots <= 1) throw new GameError("슬롯은 최소 1개는 남겨야 해요.");
      p.slots -= 1;
      p.coins += SLOT_VALUE;
      return;
    }
    case "buySlot": {
      if (p.out || state.phase === "end") throw new GameError("지금은 할 수 없어요.");
      if (p.slots >= MAX_SLOTS) throw new GameError("슬롯은 최대 5개예요.");
      if (p.coins - SLOT_VALUE < 1) throw new GameError("코인이 최소 1개는 남아야 해요.");
      p.slots += 1;
      p.coins -= SLOT_VALUE;
      return;
    }
    case "force": {
      requireHost(state, token);
      if (state.phase === "bidding") {
        if (byId(state, state.turn!).coins === 0) {
          setTurn(state, state.turn!);
          if (activePlayers(state).length <= 1) endGame(state);
          return;
        }
        const actor = byId(state, state.turn!);
        if (state.claim) applyAction(state, actor.token, "doubt", { amount: Math.min(state.claim.stake, actor.coins) });
        else applyAction(state, actor.token, "claim", { color: "red", count: 1, stake: 1 });
      } else if (state.phase === "showdown") {
        applyAction(state, byId(state, state.showdown!.toAct).token, "respond", { move: "call" });
      } else throw new GameError("진행 중이 아닙니다.");
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

export function ranking(state: GameState) {
  return [...state.players].sort((a, b) => Number(a.out) - Number(b.out) || score(b) - score(a));
}

// ---------- 화면용 데이터 ----------

export type GameView = {
  code: string;
  version: number;
  phase: Phase;
  hand: number;
  totalHands: number;
  totalCards: number;
  turn: string | null;
  claim: Claim | null;
  history: GameState["history"];
  showdown: Showdown | null;
  maxRaise: number | null;
  players: {
    id: string;
    name: string;
    isHost: boolean;
    coins: number;
    slots: number;
    cardCount: number;
    out: boolean;
    score: number;
  }[];
  me: { id: string; isHost: boolean; cards: CardColor[]; coins: number; slots: number; out: boolean } | null;
  lastResult: HandResult | null;
  events: string[];
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
    hand: state.hand,
    totalHands: state.totalHands,
    totalCards: totalCards(state),
    turn: state.turn,
    claim: state.claim,
    history: state.history,
    showdown: state.showdown,
    maxRaise: state.showdown ? maxTotal(state, state.showdown) : null,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      isHost: p.id === state.hostId,
      coins: p.coins,
      slots: p.slots,
      cardCount: p.cards.length,
      out: p.out,
      score: score(p),
    })),
    me: me ? { id: me.id, isHost: me.id === state.hostId, cards: me.cards, coins: me.coins, slots: me.slots, out: me.out } : null,
    lastResult: state.results[state.results.length - 1] ?? null,
    events: state.events,
    ranking: state.phase === "end" ? ranking(state).map((p) => p.id) : null,
    chat: state.chat.slice(-100).map((m) => ({ id: m.id, playerId: m.playerId, name: nameOf(m.playerId), text: m.text })),
  };
}
