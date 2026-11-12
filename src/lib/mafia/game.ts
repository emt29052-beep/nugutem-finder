// 마피아 게임 (서버 로직)
// 밤: 마피아가 한 명을 지목, 의사는 한 명을 보호, 경찰은 한 명을 조사
// 낮: 밤 결과 발표 후 자유 토론 → 투표로 한 명 처형
// 마피아가 모두 죽으면 시민 승리, 마피아 수 ≥ 나머지 생존자 수면 마피아 승리

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 12;

export const ROLES = {
  mafia: { name: "마피아", emoji: "🔪", team: "mafia", color: "#f43f5e", desc: "밤마다 동료와 함께 한 명을 제거하세요. 정체를 숨기고 시민인 척!" },
  doctor: { name: "의사", emoji: "💉", team: "citizen", color: "#34d399", desc: "밤마다 한 명을 골라 마피아의 공격에서 지킬 수 있어요. 자기 자신도 가능." },
  police: { name: "경찰", emoji: "🚓", team: "citizen", color: "#60a5fa", desc: "밤마다 한 명을 조사해 마피아인지 알 수 있어요." },
  citizen: { name: "시민", emoji: "🙂", team: "citizen", color: "#cbd5e1", desc: "특별한 능력은 없지만 토론과 투표로 마피아를 찾아내세요." },
} as const;

export type Role = keyof typeof ROLES;
export type Phase = "lobby" | "night" | "day" | "vote" | "end";
export type Channel = "all" | "mafia" | "dead";

export type Player = {
  id: string;
  name: string;
  token: string;
  role: Role | null;
  alive: boolean;
  diedOn: number | null;
  vote: string | null; // 대상 id 또는 "skip"
  nightPick: string | null;
  investigations: { day: number; targetId: string; isMafia: boolean }[];
};

export type LogEntry = { day: number; phase: "night" | "vote"; text: string; kind: "death" | "safe" | "vote" | "info" };

export type ChatMsg = { id: number; playerId: string; text: string; at: number; channel: Channel };

export type GameState = {
  code: string;
  version: number;
  hostId: string;
  phase: Phase;
  day: number;
  players: Player[];
  mafiaTarget: string | null;
  log: LogEntry[];
  lastVote: { day: number; votes: Record<string, string>; executed: string | null } | null;
  winner: "mafia" | "citizen" | null;
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

export function roleCounts(n: number): Record<Role, number> {
  const mafia = n >= 12 ? 3 : n >= 8 ? 2 : 1;
  const doctor = n >= 5 ? 1 : 0;
  const police = 1;
  return { mafia, doctor, police, citizen: Math.max(0, n - mafia - doctor - police) };
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
    role: null,
    alive: true,
    diedOn: null,
    vote: null,
    nightPick: null,
    investigations: [],
  };
}

export function createGame(code: string, hostName: unknown) {
  const host = newPlayer(cleanName(hostName));
  const state: GameState = {
    code,
    version: 0,
    hostId: host.id,
    phase: "lobby",
    day: 0,
    players: [host],
    mafiaTarget: null,
    log: [],
    lastVote: null,
    winner: null,
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

const alive = (state: GameState) => state.players.filter((p) => p.alive);
const nameOf = (state: GameState, id: string | null) => state.players.find((p) => p.id === id)?.name ?? "?";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function checkWinner(state: GameState) {
  const living = alive(state);
  const mafia = living.filter((p) => p.role === "mafia").length;
  if (mafia === 0) state.winner = "citizen";
  else if (mafia >= living.length - mafia) state.winner = "mafia";
  if (state.winner) state.phase = "end";
  return !!state.winner;
}

function startNight(state: GameState) {
  state.day += 1;
  state.phase = "night";
  state.mafiaTarget = null;
  for (const p of state.players) {
    p.nightPick = null;
    p.vote = null;
  }
}

/** 밤에 해야 할 행동이 모두 끝났는가 */
function nightDone(state: GameState) {
  const living = alive(state);
  const mafiaAlive = living.some((p) => p.role === "mafia");
  if (mafiaAlive && !state.mafiaTarget) return false;
  for (const p of living) {
    if ((p.role === "doctor" || p.role === "police") && !p.nightPick) return false;
  }
  return true;
}

function resolveNight(state: GameState) {
  const doctor = state.players.find((p) => p.role === "doctor" && p.alive);
  const target = state.players.find((p) => p.id === state.mafiaTarget && p.alive);
  if (target && doctor?.nightPick === target.id) {
    state.log.push({ day: state.day, phase: "night", kind: "safe", text: "의사가 마피아의 공격을 막아냈습니다! 아무도 죽지 않았어요." });
  } else if (target) {
    target.alive = false;
    target.diedOn = state.day;
    state.log.push({ day: state.day, phase: "night", kind: "death", text: `${target.name}님이 마피아에게 살해당했습니다.` });
  } else {
    state.log.push({ day: state.day, phase: "night", kind: "safe", text: "조용한 밤이었습니다. 아무도 죽지 않았어요." });
  }
  if (!checkWinner(state)) state.phase = "day";
}

function voteDone(state: GameState) {
  return alive(state).every((p) => p.vote !== null);
}

function resolveVote(state: GameState) {
  const votes: Record<string, string> = {};
  const tally = new Map<string, number>();
  for (const p of alive(state)) {
    const v = p.vote ?? "skip";
    votes[p.id] = v;
    tally.set(v, (tally.get(v) ?? 0) + 1);
  }
  const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  const [top, second] = sorted;
  let executed: string | null = null;
  if (top && top[0] !== "skip" && (!second || top[1] > second[1])) executed = top[0];

  if (executed) {
    const p = state.players.find((x) => x.id === executed)!;
    p.alive = false;
    p.diedOn = state.day;
    state.log.push({
      day: state.day,
      phase: "vote",
      kind: "vote",
      text: `투표 결과 ${p.name}님이 처형되었습니다. 정체는… ${ROLES[p.role!].emoji} ${ROLES[p.role!].name}!`,
    });
  } else {
    state.log.push({ day: state.day, phase: "vote", kind: "info", text: "투표가 동률이거나 기권이 많아 아무도 처형되지 않았습니다." });
  }
  state.lastVote = { day: state.day, votes, executed };
  if (!checkWinner(state)) startNight(state);
}

export function applyAction(state: GameState, token: string, action: string, body: Record<string, unknown>) {
  const p = requirePlayer(state, token);

  switch (action) {
    case "start": {
      requireHost(state, token);
      if (state.phase !== "lobby") throw new GameError("이미 시작되었습니다.");
      if (state.players.length < MIN_PLAYERS) throw new GameError(`${MIN_PLAYERS}명 이상 필요합니다.`);
      const counts = roleCounts(state.players.length);
      const deck = (Object.keys(counts) as Role[]).flatMap((r) => Array<Role>(counts[r]).fill(r));
      shuffle(state.players).forEach((pl, i) => (pl.role = deck[i]));
      state.log.push({ day: 0, phase: "night", kind: "info", text: "게임이 시작되었습니다. 각자 자기 역할을 확인하세요!" });
      startNight(state);
      return;
    }
    case "night": {
      if (state.phase !== "night") throw new GameError("밤이 아닙니다.");
      if (!p.alive) throw new GameError("죽은 사람은 행동할 수 없어요.");
      const target = state.players.find((x) => x.id === body.target && x.alive);
      if (!target) throw new GameError("대상을 선택해주세요.");
      if (p.role === "mafia") {
        if (target.role === "mafia") throw new GameError("동료 마피아는 지목할 수 없어요.");
        state.mafiaTarget = target.id;
        p.nightPick = target.id;
      } else if (p.role === "doctor") {
        p.nightPick = target.id;
      } else if (p.role === "police") {
        if (p.nightPick) throw new GameError("오늘 밤은 이미 조사했어요.");
        if (target.id === p.id) throw new GameError("자기 자신은 조사할 수 없어요.");
        p.nightPick = target.id;
        p.investigations.push({ day: state.day, targetId: target.id, isMafia: target.role === "mafia" });
      } else {
        throw new GameError("시민은 밤에 할 일이 없어요. 푹 주무세요 😴");
      }
      if (nightDone(state)) resolveNight(state);
      return;
    }
    case "endNight": {
      requireHost(state, token);
      if (state.phase !== "night") throw new GameError("밤이 아닙니다.");
      resolveNight(state);
      return;
    }
    case "startVote": {
      requireHost(state, token);
      if (state.phase !== "day") throw new GameError("낮에만 투표를 시작할 수 있어요.");
      state.phase = "vote";
      for (const x of state.players) x.vote = null;
      return;
    }
    case "vote": {
      if (state.phase !== "vote") throw new GameError("투표 시간이 아닙니다.");
      if (!p.alive) throw new GameError("죽은 사람은 투표할 수 없어요.");
      const t = body.target;
      if (t !== "skip" && !state.players.some((x) => x.id === t && x.alive)) throw new GameError("대상을 선택해주세요.");
      p.vote = t as string;
      if (voteDone(state)) resolveVote(state);
      return;
    }
    case "endVote": {
      requireHost(state, token);
      if (state.phase !== "vote") throw new GameError("투표 중이 아닙니다.");
      resolveVote(state);
      return;
    }
    case "chat": {
      const text = String(body.text ?? "").trim().slice(0, 200);
      if (!text) throw new GameError("메시지를 입력해주세요.");
      let channel: Channel = "all";
      if (state.phase !== "lobby" && state.phase !== "end") {
        if (!p.alive) channel = "dead";
        else if (state.phase === "night") {
          if (p.role !== "mafia") throw new GameError("밤에는 조용히… 마피아만 대화할 수 있어요 🌙");
          channel = "mafia";
        }
      }
      state.chat.push({ id: (state.chat[state.chat.length - 1]?.id ?? 0) + 1, playerId: p.id, text, at: Date.now(), channel });
      if (state.chat.length > 200) state.chat.splice(0, state.chat.length - 200);
      return;
    }
    default:
      throw new GameError("알 수 없는 요청입니다.");
  }
}

// ---------- 화면용 데이터 ----------

export type GameView = {
  code: string;
  version: number;
  phase: Phase;
  day: number;
  winner: GameState["winner"];
  roleCounts: Record<Role, number>;
  players: {
    id: string;
    name: string;
    isHost: boolean;
    alive: boolean;
    role: Role | null; // 공개된 경우만
    voted: boolean;
    isMafiaMate: boolean;
  }[];
  me: {
    id: string;
    isHost: boolean;
    role: Role | null;
    alive: boolean;
    nightPick: string | null;
    vote: string | null;
    investigations: { day: number; name: string; isMafia: boolean }[];
  } | null;
  mafiaTarget: string | null; // 마피아에게만
  nightProgress: { done: number; total: number } | null;
  log: LogEntry[];
  lastVote: { day: number; votes: { voter: string; target: string }[]; executed: string | null } | null;
  chat: { id: number; playerId: string; name: string; text: string; at: number; channel: Channel }[];
  chatChannel: Channel | null; // 지금 내가 보낼 수 있는 채널, null 이면 채팅 불가
};

export function toView(state: GameState, token: string | null): GameView {
  const me = findPlayer(state, token);
  const ended = state.phase === "end";
  const iAmMafia = me?.role === "mafia";
  const iAmDead = !!me && !me.alive && state.phase !== "lobby";

  const canSeeRole = (p: Player) => ended || iAmDead || !p.alive || p.id === me?.id || (iAmMafia && p.role === "mafia");

  let nightProgress: GameView["nightProgress"] = null;
  if (state.phase === "night") {
    const living = alive(state);
    const actors = [
      living.some((p) => p.role === "mafia") ? !!state.mafiaTarget : null,
      ...living.filter((p) => p.role === "doctor" || p.role === "police").map((p) => !!p.nightPick),
    ].filter((x) => x !== null);
    nightProgress = { done: actors.filter(Boolean).length, total: actors.length };
  }

  let chatChannel: Channel | null = "all";
  if (!me) chatChannel = null;
  else if (state.phase !== "lobby" && !ended) {
    if (!me.alive) chatChannel = "dead";
    else if (state.phase === "night") chatChannel = iAmMafia ? "mafia" : null;
  }

  const visibleChat = state.chat.filter(
    (m) => m.channel === "all" || ended || (m.channel === "mafia" && iAmMafia) || (m.channel === "dead" && iAmDead)
  );

  return {
    code: state.code,
    version: state.version,
    phase: state.phase,
    day: state.day,
    winner: state.winner,
    roleCounts: roleCounts(Math.max(state.players.length, MIN_PLAYERS)),
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      isHost: p.id === state.hostId,
      alive: p.alive,
      role: canSeeRole(p) ? p.role : null,
      voted: state.phase === "vote" && p.alive && p.vote !== null,
      isMafiaMate: iAmMafia && p.role === "mafia" && p.id !== me?.id,
    })),
    me: me
      ? {
          id: me.id,
          isHost: me.id === state.hostId,
          role: me.role,
          alive: me.alive,
          nightPick: me.nightPick,
          vote: me.vote,
          investigations: me.investigations.map((x) => ({ day: x.day, name: nameOf(state, x.targetId), isMafia: x.isMafia })),
        }
      : null,
    mafiaTarget: iAmMafia || ended ? state.mafiaTarget : null,
    nightProgress,
    log: state.log,
    lastVote: state.lastVote
      ? {
          day: state.lastVote.day,
          votes: Object.entries(state.lastVote.votes).map(([voter, target]) => ({ voter, target })),
          executed: state.lastVote.executed,
        }
      : null,
    chat: visibleChat.slice(-100).map((m) => ({ ...m, name: nameOf(state, m.playerId) })),
    chatChannel,
  };
}
