// 딥씨 거래소: 다이빙 테마 주식 파티 게임 (서버 로직)
// - 종목마다 숨겨진 뉴스가 있고, 핵심 글자가 라운드마다 조금씩 공개된다.
// - 뉴스는 예고된 라운드 장 마감 때 주가에 반영된다.
// - 시크릿: 1인 1회, 한 종목의 다음 가격 변동을 다른 사람에게 숨긴다.
// - 아이템: 돈을 내고 사용하는 반전 카드 (1인당 종류별 1회).

export const START_CASH = 100000;
export const DEFAULT_ROUNDS = 20;
export const MAX_PLAYERS = 12;
export const MASK = "○";

type NewsPool = { templates: string[]; good: string[]; bad: string[] };

export const STOCK_DEFS = [
  {
    id: "A",
    name: "딥블루장비",
    emoji: "🤿",
    color: "#38bdf8",
    start: 12000,
    desc: "다이빙 장비 제조",
    news: {
      templates: ["딥블루장비, {K}", "[단독] 딥블루장비 {K}"],
      good: ["신형 다이브컴퓨터 완판", "해외 수출 대박 계약", "국제 안전 인증 획득", "프로 다이버 공식 후원", "신제품 핀 품절 대란"],
      bad: ["마스크 누수 대량 리콜", "공장 화재로 생산 중단", "특허 소송 최종 패소", "레귤레이터 결함 발견", "대표 횡령 혐의 수사"],
    },
  },
  {
    id: "B",
    name: "코랄리조트",
    emoji: "🪸",
    color: "#fb7185",
    start: 8000,
    desc: "산호초 다이빙 리조트",
    news: {
      templates: ["코랄리조트, {K}", "[속보] 코랄리조트 {K}"],
      good: ["성수기 예약 전부 완판", "해양보호구역 지정 수혜", "럭셔리 수상빌라 오픈", "여행 예능 촬영지 확정", "산호 복원 프로젝트 성공"],
      bad: ["산호 백화 현상 확산", "태풍으로 리조트 침수", "위생 문제로 영업 정지", "항공 노선 운항 중단", "해파리 떼 해변 습격"],
    },
  },
  {
    id: "C",
    name: "블루웨일투어",
    emoji: "🐋",
    color: "#818cf8",
    start: 6000,
    desc: "고래 관찰 & 다이빙 투어",
    news: {
      templates: ["블루웨일투어, {K}", "[단독] 블루웨일투어 {K}"],
      good: ["혹등고래 떼 대거 출현", "고래 관광 허가 확대", "유명 유튜버 투어 대박", "신규 대형 투어선 취항", "고래상어 출몰 명소 독점"],
      bad: ["고래 관광 전면 금지", "투어선 암초 좌초 사고", "고래 개체수 급감 발표", "환경단체 불매 운동", "유가 폭등에 운항 축소"],
    },
  },
  {
    id: "D",
    name: "프리다이브아카데미",
    emoji: "🧜",
    color: "#34d399",
    start: 10000,
    desc: "프리다이빙 교육",
    news: {
      templates: ["프리다이브아카데미, {K}", "[속보] 프리다이브아카데미 {K}"],
      good: ["국가대표 코치 전격 영입", "수강생 세계 신기록 달성", "수강 신청 폭발적 증가", "올림픽 종목 채택 추진", "인기 아이돌 수강 인증"],
      bad: ["안전사고로 강습 중단", "강사 자격 무더기 취소", "수영장 임대 계약 해지", "경쟁 학원 반값 공세", "블랙아웃 사고 은폐 논란"],
    },
  },
  {
    id: "E",
    name: "딥씨로보틱스",
    emoji: "🚢",
    color: "#fbbf24",
    start: 15000,
    desc: "심해 탐사 로봇",
    news: {
      templates: ["딥씨로보틱스, {K}", "[단독] 딥씨로보틱스 {K}"],
      good: ["심해 보물선 발견", "해군 탐사로봇 대량 수주", "해저 희토류 광맥 발견", "자율 잠수정 시험 성공", "글로벌 빅테크 투자 유치"],
      bad: ["탐사로봇 심해에서 분실", "정부 지원금 전액 삭감", "핵심 연구진 집단 퇴사", "잠수정 압력 시험 실패", "회계 부정 의혹 제기"],
    },
  },
  {
    id: "F",
    name: "펄오션",
    emoji: "🦪",
    color: "#e879f9",
    start: 5000,
    desc: "진주 양식",
    news: {
      templates: ["펄오션, {K}", "[속보] 펄오션 {K}"],
      good: ["흑진주 대량 수확 성공", "명품 브랜드 독점 납품", "양식장 확장 허가 승인", "희귀 핑크진주 발견", "해외 경매 최고가 낙찰"],
      bad: ["적조 발생 대량 폐사", "가짜 진주 유통 논란", "양식장 허가 전면 취소", "수온 급상승 피해 속출", "태풍에 양식장 유실"],
    },
  },
] as const satisfies readonly {
  id: string;
  name: string;
  emoji: string;
  color: string;
  start: number;
  desc: string;
  news: NewsPool;
}[];

export type StockId = (typeof STOCK_DEFS)[number]["id"];
export const STOCK_IDS = STOCK_DEFS.map((s) => s.id) as StockId[];
export const stockDef = (id: StockId) => STOCK_DEFS.find((s) => s.id === id)!;

export const ITEMS = [
  {
    id: "insider",
    name: "내부자 정보",
    emoji: "🔍",
    price: 5000,
    target: "stock",
    desc: "선택한 종목의 현재 숨겨진 뉴스 전체를 나만 확인합니다.",
  },
  {
    id: "sonar",
    name: "소나 탐지",
    emoji: "📡",
    price: 5000,
    target: "player",
    desc: "선택한 플레이어의 현재 현금과 보유 주식을 몰래 엿봅니다.",
  },
  {
    id: "shark",
    name: "상어 출몰",
    emoji: "🦈",
    price: 10000,
    target: "stock",
    desc: "이번 라운드 마감 때 선택한 종목 주가 −15%. (누가 썼는지는 비밀)",
  },
  {
    id: "pearl",
    name: "진주 발견",
    emoji: "💎",
    price: 10000,
    target: "stock",
    desc: "이번 라운드 마감 때 선택한 종목 주가 +15%. (누가 썼는지는 비밀)",
  },
  {
    id: "reverse",
    name: "조류 역전",
    emoji: "🔄",
    price: 20000,
    target: "stock",
    desc: "선택한 종목의 예고된 뉴스 효과를 반대로 뒤집습니다. 호재가 악재로, 악재가 호재로! 힌트 글자는 그대로라 아무도 모릅니다.",
  },
  {
    id: "airpocket",
    name: "에어포켓",
    emoji: "🫧",
    price: 10000,
    target: "none",
    desc: "이번 라운드 마감 때 내 보유 주식이 떨어지면 하락분을 전액 보상받습니다.",
  },
] as const;

export type ItemId = (typeof ITEMS)[number]["id"];
export const itemDef = (id: ItemId) => ITEMS.find((i) => i.id === id)!;

export type Phase = "lobby" | "trading" | "end";
export type Holdings = Record<StockId, number>;

export type NewsEvent = {
  id: string;
  stock: StockId;
  template: string;
  key: string;
  good: boolean;
  pct: number; // 반영 시 변동률 (조류 역전 전)
  announce: number;
  hit: number;
  order: number[]; // 공개될 글자 인덱스 순서
  reversed: boolean;
};

export type Stock = { id: StockId; price: number; history: number[]; event: NewsEvent | null };

export type Intel = {
  round: number;
  kind: "sonar" | "insider";
  text: string;
};

export type Player = {
  id: string;
  name: string;
  token: string;
  cash: number;
  shares: Holdings;
  itemsUsed: ItemId[];
  secretUsed: boolean;
  knownEvents: string[];
  intel: Intel[];
  airpocketRound: number | null;
};

export type Secret = { by: string; stock: StockId; round: number };
export type Effect = { stock: StockId; kind: "shark" | "pearl"; round: number };

export type StockChange = {
  from: number;
  to: number;
  news: { text: string; good: boolean; reversed: boolean } | null;
  shark: number;
  pearl: number;
};

export type RoundResult = {
  round: number;
  changes: Record<StockId, StockChange>;
  log: string[];
  private: { playerId: string; text: string }[];
  ranking?: string[]; // 장 마감 시점 총자산 순위 (playerId, 1등부터)
};

export type ChatMsg = { id: number; playerId: string; text: string; at: number };
export const CHAT_MAX_LEN = 200;

export type GameState = {
  code: string;
  version: number;
  hostId: string;
  phase: Phase;
  round: number;
  totalRounds: number;
  roundSeconds: number; // 0 = 방장이 수동으로 마감
  deadline: number | null;
  stocks: Stock[];
  players: Player[];
  secrets: Secret[];
  effects: Effect[];
  results: RoundResult[];
  chat?: ChatMsg[];
  createdAt: number;
};

export class GameError extends Error {}

const emptyHoldings = (): Holdings => ({ A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 });

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

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

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

// ---------- 뉴스 ----------

function makeEvent(stock: StockId, announce: number, totalRounds: number): NewsEvent | null {
  if (announce > totalRounds) return null;
  const pool = stockDef(stock).news;
  const good = Math.random() < 0.5;
  const key = pick(good ? pool.good : pool.bad);
  const hit = Math.min(totalRounds, announce + randInt(1, 3)); // 2~4라운드 동안 노출
  const big = Math.random() < 0.25;
  const magnitude = big ? randInt(35, 55) : randInt(12, 30);
  return {
    id: randomId(8),
    stock,
    template: pick(pool.templates),
    key,
    good,
    pct: (good ? magnitude : -magnitude) / 100,
    announce,
    hit,
    order: revealOrder(stock, key, good),
    reversed: false,
  };
}

// 호재/악재 문구에 공통으로 들어가는 애매한 글자부터 먼저 공개하고,
// 방향을 결정짓는 글자는 최대한 늦게 공개한다.
function revealOrder(stock: StockId, key: string, good: boolean) {
  const pool = stockDef(stock).news;
  const opposite = (good ? pool.bad : pool.good).join("");
  const same = (good ? pool.good : pool.bad).filter((k) => k !== key).join("");
  const chars = [...key];
  const score = (ch: string) => (opposite.includes(ch) ? 2 : 0) + (same.includes(ch) ? 0.5 : 0) + Math.random() * 1.5;
  return chars
    .map((ch, i) => ({ i, ch }))
    .filter((x) => x.ch !== " ")
    .map((x) => ({ i: x.i, s: score(x.ch) }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.i);
}

export const REVEAL_RATIO = 0.45; // 반영 직전까지 공개되는 글자 비율

export function revealedCount(e: NewsEvent, round: number) {
  const total = e.order.length;
  const span = e.hit - e.announce + 1;
  const target = Math.max(1, Math.round(total * REVEAL_RATIO));
  const step = Math.min(span, Math.max(1, round - e.announce + 1));
  const n = Math.floor((target * step) / span);
  return Math.min(total - 1, Math.max(step === span ? 1 : 0, n));
}

export function maskedKey(e: NewsEvent, round: number) {
  const shown = new Set(e.order.slice(0, revealedCount(e, round)));
  return [...e.key].map((ch, i) => (ch === " " || shown.has(i) ? ch : MASK)).join("");
}

export const fullHeadline = (e: NewsEvent) => e.template.replace("{K}", e.key);

// ---------- 생성 / 참가 ----------

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
    itemsUsed: [],
    secretUsed: false,
    knownEvents: [],
    intel: [],
    airpocketRound: null,
  };
}

export function createGame(code: string, hostName: unknown, rounds: unknown, seconds: unknown) {
  const totalRounds = Math.min(30, Math.max(5, Math.floor(Number(rounds) || DEFAULT_ROUNDS)));
  const roundSeconds = Math.min(600, Math.max(0, Math.floor(Number(seconds) || 0)));
  const host = newPlayer(cleanName(hostName));
  const state: GameState = {
    code,
    version: 0,
    hostId: host.id,
    phase: "lobby",
    round: 0,
    totalRounds,
    roundSeconds,
    deadline: null,
    stocks: STOCK_DEFS.map((d) => ({ id: d.id, price: d.start, history: [d.start], event: null })),
    players: [host],
    secrets: [],
    effects: [],
    results: [],
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

const stockOf = (state: GameState, id: StockId) => state.stocks.find((s) => s.id === id)!;

export function totalAssets(state: GameState, p: Player) {
  return p.cash + STOCK_IDS.reduce((sum, id) => sum + p.shares[id] * stockOf(state, id).price, 0);
}

// ---------- 라운드 진행 ----------

function startRound(state: GameState, round: number) {
  state.round = round;
  state.phase = "trading";
  state.deadline = state.roundSeconds > 0 ? Date.now() + state.roundSeconds * 1000 : null;
}

function resolveRound(state: GameState) {
  const r = state.round;
  const changes = {} as Record<StockId, StockChange>;
  const log: string[] = [];
  const priv: RoundResult["private"] = [];

  for (const s of state.stocks) {
    const d = stockDef(s.id);
    const from = s.price;
    let pct = randInt(-4, 4) / 100; // 평소 등락
    const fx = state.effects.filter((e) => e.stock === s.id && e.round === r);
    const shark = fx.filter((e) => e.kind === "shark").length;
    const pearl = fx.filter((e) => e.kind === "pearl").length;
    pct += pearl * 0.15 - shark * 0.15;
    if (shark) log.push(`🦈 누군가 ${d.name}에 상어를 풀었다! (${shark > 1 ? `${shark}마리, ` : ""}−${15 * shark}%)`);
    if (pearl) log.push(`💎 누군가 ${d.name}에서 진주를 발견했다! (+${15 * pearl}%)`);

    let news: StockChange["news"] = null;
    if (s.event && s.event.hit === r) {
      const e = s.event;
      pct += e.reversed ? -e.pct : e.pct;
      news = { text: fullHeadline(e), good: e.reversed ? !e.good : e.good, reversed: e.reversed };
      s.event = makeEvent(s.id, r + 1, state.totalRounds);
    }

    const to = Math.max(100, Math.round((from * (1 + pct)) / 10) * 10);
    s.price = to;
    s.history.push(to);
    changes[s.id] = { from, to, news, shark, pearl };
  }

  for (const sec of state.secrets.filter((x) => x.round === r)) {
    log.push(`🤫 누군가 ${stockDef(sec.stock).name}에 시크릿을 걸었다! 이번 변동은 한 라운드 동안 비공개`);
  }

  for (const p of state.players) {
    if (p.airpocketRound !== r) continue;
    let refund = 0;
    for (const id of STOCK_IDS) {
      const c = changes[id];
      if (c.to < c.from) refund += p.shares[id] * (c.from - c.to);
    }
    p.cash += refund;
    p.airpocketRound = null;
    priv.push({ playerId: p.id, text: `🫧 에어포켓 발동! 하락분 ${won(refund)} 보상` });
  }

  const ranking = [...state.players]
    .sort((x, y) => totalAssets(state, y) - totalAssets(state, x))
    .map((p) => p.id);
  state.results.push({ round: r, changes, log, private: priv, ranking });

  if (r >= state.totalRounds) {
    state.phase = "end";
    state.deadline = null;
  } else {
    startRound(state, r + 1);
  }
}

/** 타이머가 끝났으면 라운드를 마감한다. 변경이 있었으면 true */
export function tick(state: GameState, now = Date.now()) {
  if (state.phase === "trading" && state.deadline !== null && now >= state.deadline) {
    resolveRound(state);
    return true;
  }
  return false;
}

export function isDue(state: GameState, now = Date.now()) {
  return state.phase === "trading" && state.deadline !== null && now >= state.deadline;
}

// ---------- 액션 ----------

function parseStock(v: unknown): StockId {
  if (!STOCK_IDS.includes(v as StockId)) throw new GameError("종목을 선택해주세요.");
  return v as StockId;
}

export function applyAction(state: GameState, token: string, action: string, body: Record<string, unknown>) {
  if (action === "start") {
    requireHost(state, token);
    if (state.phase !== "lobby") throw new GameError("이미 시작되었습니다.");
    if (state.players.length < 2) throw new GameError("2명 이상 필요합니다.");
    for (const s of state.stocks) s.event = makeEvent(s.id, 1, state.totalRounds);
    startRound(state, 1);
    return;
  }

  if (action === "endRound") {
    requireHost(state, token);
    if (state.phase !== "trading") throw new GameError("지금은 할 수 없습니다.");
    resolveRound(state);
    return;
  }

  const p = requirePlayer(state, token);

  if (action === "chat") {
    const text = String(body.text ?? "").trim().slice(0, CHAT_MAX_LEN);
    if (!text) throw new GameError("메시지를 입력해주세요.");
    const chat = (state.chat ??= []);
    chat.push({ id: (chat[chat.length - 1]?.id ?? 0) + 1, playerId: p.id, text, at: Date.now() });
    if (chat.length > 150) chat.splice(0, chat.length - 150);
    return;
  }

  if (state.phase !== "trading") throw new GameError("거래 시간이 아닙니다.");
  if (isDue(state)) throw new GameError("라운드가 마감되었습니다. 새 가격을 확인하세요.");

  switch (action) {
    case "trade": {
      const id = parseStock(body.stock);
      const qty = Math.trunc(Number(body.qty) || 0);
      if (qty === 0 || Math.abs(qty) > 1_000_000) throw new GameError("수량을 입력해주세요.");
      const price = stockOf(state, id).price;
      if (qty > 0 && qty * price > p.cash) throw new GameError("현금이 부족합니다.");
      if (qty < 0 && -qty > p.shares[id]) throw new GameError("보유 수량보다 많이 팔 수 없습니다.");
      p.cash -= qty * price;
      p.shares[id] += qty;
      return;
    }
    case "secret": {
      const id = parseStock(body.stock);
      if (p.secretUsed) throw new GameError("시크릿은 한 번만 사용할 수 있습니다.");
      if (state.round >= state.totalRounds) throw new GameError("마지막 라운드에는 시크릿을 걸 수 없습니다.");
      if (state.secrets.some((s) => s.stock === id && s.round === state.round))
        throw new GameError("이번 라운드에 이미 누군가 이 종목에 시크릿을 걸었습니다.");
      p.secretUsed = true;
      state.secrets.push({ by: p.id, stock: id, round: state.round });
      return;
    }
    case "item": {
      const item = ITEMS.find((i) => i.id === body.item);
      if (!item) throw new GameError("알 수 없는 아이템입니다.");
      if (p.itemsUsed.includes(item.id)) throw new GameError("이 아이템은 이미 사용했습니다.");
      if (p.cash < item.price) throw new GameError("현금이 부족합니다.");

      if (item.id === "airpocket") {
        p.airpocketRound = state.round;
      } else if (item.id === "sonar") {
        const t = state.players.find((x) => x.id === body.target);
        if (!t || t.id === p.id) throw new GameError("대상 플레이어를 선택해주세요.");
        const held = STOCK_IDS.filter((id) => t.shares[id] > 0)
          .map((id) => `${stockDef(id).name} ${t.shares[id]}주`)
          .join(", ");
        p.intel.push({
          round: state.round,
          kind: "sonar",
          text: `📡 ${t.name}: 현금 ${won(t.cash)} · ${held || "주식 없음"}`,
        });
      } else {
        const id = parseStock(body.stock);
        const s = stockOf(state, id);
        if (item.id === "insider") {
          if (!s.event) throw new GameError("이 종목에는 남은 뉴스가 없습니다.");
          p.knownEvents.push(s.event.id);
          p.intel.push({
            round: state.round,
            kind: "insider",
            text: `🔍 ${stockDef(id).name} (R${s.event.hit} 반영): “${fullHeadline(s.event)}”`,
          });
        } else if (item.id === "reverse") {
          if (!s.event) throw new GameError("이 종목에는 남은 뉴스가 없습니다.");
          s.event.reversed = !s.event.reversed;
        } else {
          state.effects.push({ stock: id, kind: item.id, round: state.round });
        }
      }
      p.cash -= item.price;
      p.itemsUsed.push(item.id);
      return;
    }
    default:
      throw new GameError("알 수 없는 요청입니다.");
  }
}

// ---------- 화면용 데이터 (남의 비밀 제거) ----------

export type StockView = {
  id: StockId;
  price: number | null; // null = 시크릿으로 비공개
  history: (number | null)[];
  hint: { text: string; hit: number; known: boolean } | null;
  mySecretActive: boolean; // 내가 이번 라운드에 건 시크릿
};

export type ChangeView = {
  from: number | null;
  to: number | null;
  news: StockChange["news"];
  hidden: boolean;
};

export type GameView = {
  code: string;
  version: number;
  serverNow: number;
  phase: Phase;
  round: number;
  totalRounds: number;
  roundSeconds: number;
  deadline: number | null;
  stocks: StockView[];
  players: { id: string; name: string; isHost: boolean; total: number | null; cash: number | null; shares: Holdings | null }[];
  me: {
    id: string;
    name: string;
    isHost: boolean;
    cash: number;
    shares: Holdings;
    total: number;
    totalHasHidden: boolean;
    itemsUsed: ItemId[];
    secretUsed: boolean;
    airpocketActive: boolean;
    intel: Intel[];
  } | null;
  lastResult: {
    round: number;
    changes: Record<StockId, ChangeView>;
    log: string[];
    mine: string[];
    ranking: { id: string; name: string; rank: number; prevRank: number | null }[];
  } | null;
  chat: { id: number; playerId: string; name: string; text: string; at: number }[];
  newsFeed: { round: number; stock: StockId; text: string; good: boolean; reversed: boolean }[];
};

export function toView(state: GameState, token: string | null): GameView {
  const me = findPlayer(state, token);
  const ended = state.phase === "end";

  // round 라운드 마감 때의 변동이 지금 나에게 숨겨져 있는가
  const hidden = (stock: StockId, round: number) =>
    !ended &&
    state.round === round + 1 &&
    state.secrets.some((s) => s.stock === stock && s.round === round && s.by !== me?.id);

  const stocks: StockView[] = state.stocks.map((s) => {
    const h = hidden(s.id, state.round - 1);
    const history: (number | null)[] = [...s.history];
    if (h) history[history.length - 1] = null;
    const e = s.event;
    const known = !!(e && me?.knownEvents.includes(e.id));
    return {
      id: s.id,
      price: h ? null : s.price,
      history,
      hint:
        e && state.phase === "trading" && e.announce <= state.round
          ? {
              text: e.template.replace("{K}", known ? e.key : maskedKey(e, state.round)),
              hit: e.hit,
              known,
            }
          : null,
      mySecretActive: !!me && state.secrets.some((x) => x.by === me.id && x.stock === s.id && x.round === state.round),
    };
  });

  const nameOf = (id: string) => state.players.find((p) => p.id === id)?.name ?? "?";
  const last = state.results[state.results.length - 1];
  const lastResult = last
    ? {
        round: last.round,
        changes: Object.fromEntries(
          STOCK_IDS.map((id) => {
            const c = last.changes[id];
            const h = hidden(id, last.round);
            return [id, h ? { from: c.from, to: null, news: null, hidden: true } : { ...c, hidden: false }];
          })
        ) as Record<StockId, ChangeView>,
        log: last.log,
        mine: me ? last.private.filter((x) => x.playerId === me.id).map((x) => x.text) : [],
        ranking: (last.ranking ?? []).map((id, i) => {
          const prev = state.results[state.results.length - 2]?.ranking;
          const pi = prev ? prev.indexOf(id) : -1;
          return { id, name: nameOf(id), rank: i + 1, prevRank: pi >= 0 ? pi + 1 : null };
        }),
      }
    : null;

  const newsFeed = state.results
    .flatMap((r) =>
      STOCK_IDS.filter((id) => r.changes[id].news && !hidden(id, r.round)).map((id) => ({
        round: r.round,
        stock: id,
        ...r.changes[id].news!,
      }))
    )
    .reverse();

  let myTotal = 0;
  let totalHasHidden = false;
  if (me) {
    myTotal = me.cash;
    for (const s of stocks) {
      if (s.price === null) {
        if (me.shares[s.id] > 0) totalHasHidden = true;
      } else myTotal += me.shares[s.id] * s.price;
    }
  }

  return {
    code: state.code,
    version: state.version,
    serverNow: Date.now(),
    phase: state.phase,
    round: state.round,
    totalRounds: state.totalRounds,
    roundSeconds: state.roundSeconds,
    deadline: state.deadline,
    stocks,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      isHost: p.id === state.hostId,
      total: ended ? totalAssets(state, p) : null,
      cash: ended ? p.cash : null,
      shares: ended ? p.shares : null,
    })),
    me: me
      ? {
          id: me.id,
          name: me.name,
          isHost: me.id === state.hostId,
          cash: me.cash,
          shares: me.shares,
          total: myTotal,
          totalHasHidden,
          itemsUsed: me.itemsUsed,
          secretUsed: me.secretUsed,
          airpocketActive: me.airpocketRound === state.round && state.phase === "trading",
          intel: [...me.intel].reverse(),
        }
      : null,
    lastResult,
    newsFeed,
    chat: (state.chat ?? []).slice(-100).map((m) => ({ ...m, name: nameOf(m.playerId) })),
  };
}
