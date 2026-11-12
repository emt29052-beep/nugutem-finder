"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Chat } from "@/components/chat";
import { CLAIM_COLORS, COLORS, MAX_SLOTS, SLOT_VALUE, type CardColor, type ClaimColor, type GameView } from "@/lib/doubt/game";
import { DoubtRules } from "../rules";

const noSubscribe = () => () => {};
type Act = (action: string, extra?: Record<string, unknown>) => Promise<boolean>;

export function DoubtGame({ code }: { code: string }) {
  const tokenKey = `doubt:token:${code}`;
  const storedToken = useSyncExternalStore(noSubscribe, () => localStorage.getItem(tokenKey) ?? "", () => null);
  const [joinedToken, setToken] = useState<string | null>(null);
  const token = joinedToken ?? storedToken;
  const [view, setView] = useState<GameView | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [toast, setToast] = useState<{ text: string; error: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const versionRef = useRef(-1);
  const tokenRef = useRef(token);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const applyView = useCallback((v: GameView) => {
    if (v.version < versionRef.current) return;
    versionRef.current = v.version;
    setView(v);
  }, []);

  const showToast = useCallback((text: string, error = false) => {
    setToast({ text, error });
    setTimeout(() => setToast((t) => (t?.text === text ? null : t)), 2500);
  }, []);

  const poll = useCallback(async () => {
    if (token === null) return;
    const sentToken = token;
    try {
      const res = await fetch(`/api/doubt?code=${code}&token=${encodeURIComponent(token)}&v=${versionRef.current}`, {
        cache: "no-store",
      });
      if (res.status === 404) return setNotFound(true);
      const data = await res.json();
      if (sentToken !== tokenRef.current) return;
      if (data.view) applyView(data.view);
    } catch {
      /* 다음 폴링에서 재시도 */
    }
  }, [code, token, applyView]);

  useEffect(() => {
    const first = setTimeout(poll, 0);
    const id = setInterval(poll, 1200);
    const onVisible = () => document.visibilityState === "visible" && poll();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [poll]);

  const act: Act = useCallback(
    async (action, extra = {}) => {
      setBusy(true);
      try {
        const res = await fetch("/api/doubt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, code, token, ...extra }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (data.token) {
          tokenRef.current = data.token;
          localStorage.setItem(tokenKey, data.token);
          setToken(data.token);
        }
        if (data.view) applyView(data.view);
        return true;
      } catch (e) {
        showToast(e instanceof Error ? e.message : "오류가 발생했습니다.", true);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [code, token, tokenKey, applyView, showToast]
  );

  if (notFound)
    return (
      <Shell>
        <div className="py-20 text-center">
          <p className="text-xl font-bold">방 {code}을(를) 찾을 수 없습니다.</p>
          <Link href="/doubt" className="mt-4 inline-block text-fuchsia-400 underline">
            처음으로
          </Link>
        </div>
      </Shell>
    );
  if (!view)
    return (
      <Shell>
        <p className="py-20 text-center text-slate-400">불러오는 중…</p>
      </Shell>
    );

  const me = view.me;
  return (
    <Shell>
      <TopBar view={view} />
      {toast && (
        <div
          className={`fixed inset-x-3 top-16 z-50 mx-auto max-w-md rounded-xl px-4 py-3 text-center text-sm font-bold shadow-2xl ${
            toast.error ? "bg-rose-600 text-white" : "bg-emerald-500 text-slate-950"
          }`}
        >
          {toast.text}
        </div>
      )}
      {me && <Chat messages={view.chat} meId={me.id} onSend={(text) => act("chat", { text })} />}

      {view.phase === "lobby" && <Lobby view={view} act={act} busy={busy} />}
      {(view.phase === "bidding" || view.phase === "showdown") && (
        <div className="grid gap-4 lg:grid-cols-[1fr_330px]">
          <div className="space-y-4">
            {view.lastResult && view.lastResult.hand === view.hand - 1 && <ResultCard view={view} />}
            {me && !me.out && <MyCards view={view} />}
            <ClaimBoard view={view} />
            {view.phase === "bidding" && me && view.turn === me.id && <MyTurn key={`${view.hand}-${view.history.length}`} view={view} act={act} busy={busy} />}
            {view.phase === "showdown" && <ShowdownPanel key={view.showdown?.log.length} view={view} act={act} busy={busy} />}
          </div>
          <div className="space-y-4">
            <Table view={view} />
            {me && !me.out && <SlotPanel view={view} act={act} busy={busy} />}
            {me?.isHost && <HostPanel act={act} busy={busy} />}
            <details className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <summary className="cursor-pointer font-bold">게임 방법</summary>
              <div className="mt-3">
                <DoubtRules />
              </div>
            </details>
          </div>
        </div>
      )}
      {view.phase === "end" && <EndScreen view={view} />}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-fuchsia-950/60 via-slate-950 to-slate-950 px-3 py-4 pb-24 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-4">{children}</div>
    </main>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-800 bg-slate-900/80 p-4 ${className}`}>{children}</section>;
}

const nameOf = (view: GameView, id: string | null | undefined) => view.players.find((p) => p.id === id)?.name ?? "?";
const claimText = (c: { color: ClaimColor; count: number }) => `${COLORS[c.color].emoji} ${COLORS[c.color].name} ${c.count}장 이상`;

function ColorCard({ c, size = "md" }: { c: CardColor; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "h-8 w-6 text-xs" : "h-16 w-12 text-2xl";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-lg border-2 border-white/30 font-black shadow ${sz}`}
      style={{
        background: c === "rainbow" ? "linear-gradient(135deg,#ef4444,#eab308,#22c55e,#3b82f6,#a855f7)" : COLORS[c].hex,
      }}
      title={COLORS[c].name}
    >
      {c === "rainbow" ? "🌈" : ""}
    </span>
  );
}

function TopBar({ view }: { view: GameView }) {
  return (
    <header className="sticky top-0 z-40 -mx-3 flex flex-wrap items-center justify-between gap-2 bg-slate-950/80 px-3 py-2 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="flex items-center gap-2">
        <Link href="/doubt" className="text-xl font-black">
          🃏 다우트 앤 벳
        </Link>
        <span className="rounded-md bg-slate-800 px-2 py-0.5 font-mono text-sm tracking-widest">{view.code}</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        {view.phase !== "lobby" && view.phase !== "end" && (
          <span className="rounded-full bg-slate-800 px-3 py-1">판에 카드 {view.totalCards}장</span>
        )}
        <span className="rounded-full bg-fuchsia-500/20 px-3 py-1 font-bold text-fuchsia-200">
          {view.phase === "lobby" ? "대기실" : view.phase === "end" ? "🏁 게임 종료" : `${view.hand} / ${view.totalHands}판`}
        </span>
      </div>
    </header>
  );
}

function Lobby({ view, act, busy }: { view: GameView; act: Act; busy: boolean }) {
  const me = view.me;
  const [name, setName] = useState("");
  const url = useSyncExternalStore(noSubscribe, () => window.location.href, () => "");
  const [copied, setCopied] = useState(false);
  const n = view.players.length;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_330px]">
      <div className="space-y-4">
        {!me && (
          <Card>
            <p className="mb-2 font-bold">이 방에 참가하기</p>
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={12}
                placeholder="닉네임"
                className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-fuchsia-500"
              />
              <button
                disabled={busy || !name.trim()}
                onClick={() => act("join", { name })}
                className="rounded-lg bg-fuchsia-500 px-4 font-bold text-white disabled:opacity-50"
              >
                참가
              </button>
            </div>
          </Card>
        )}
        <Card>
          <p className="text-lg font-bold">친구들을 초대하세요</p>
          <p className="mt-1 text-sm text-slate-400">
            방 코드 <b className="font-mono text-white">{view.code}</b> · {view.totalHands}판 · 최소 3명
          </p>
          <div className="mt-3 flex gap-2">
            <input readOnly value={url} className="min-w-0 flex-1 rounded-lg bg-slate-950 px-3 py-2 font-mono text-xs text-slate-400" />
            <button
              onClick={async () => {
                await navigator.clipboard?.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="rounded-lg bg-slate-700 px-3 text-sm font-bold"
            >
              {copied ? "복사됨!" : "링크 복사"}
            </button>
          </div>
          <div className="mt-4">
            {me?.isHost ? (
              <button
                disabled={busy || n < 3}
                onClick={() => act("start")}
                className="rounded-lg bg-fuchsia-500 px-5 py-2 font-bold text-white disabled:opacity-50"
              >
                {n < 3 ? `${3 - n}명 더 필요해요` : `게임 시작 (${n}명)`}
              </button>
            ) : (
              <p className="text-sm text-slate-400">방장이 게임을 시작하길 기다리는 중…</p>
            )}
          </div>
        </Card>
        <details open className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <summary className="cursor-pointer font-bold">게임 방법</summary>
          <div className="mt-3">
            <DoubtRules />
          </div>
        </details>
      </div>
      <Card>
        <p className="mb-2 font-bold">참가자 {n}명</p>
        <ul className="space-y-1 text-sm">
          {view.players.map((p) => (
            <li key={p.id}>
              {p.isHost && "👑 "}
              {p.name}
              {p.id === me?.id && <span className="ml-1 text-xs text-fuchsia-300">(나)</span>}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function MyCards({ view }: { view: GameView }) {
  const me = view.me!;
  const counts = CLAIM_COLORS.map((c) => ({ c, n: me.cards.filter((x) => x === c).length })).filter((x) => x.n > 0);
  const rainbow = me.cards.filter((x) => x === "rainbow").length;
  return (
    <Card className="border-fuchsia-800/60">
      <p className="text-sm font-bold text-fuchsia-200">🤫 내 카드 (나만 보여요)</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {me.cards.map((c, i) => (
          <ColorCard key={i} c={c} />
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-400">
        {counts.map((x) => `${COLORS[x.c].emoji}${x.n}`).join(" ")}
        {rainbow > 0 && ` 🌈${rainbow} (무지개는 모든 색으로 셈)`}
      </p>
    </Card>
  );
}

function ClaimBoard({ view }: { view: GameView }) {
  const c = view.claim;
  return (
    <Card>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">현재 예측</p>
        {view.phase === "bidding" && view.turn && (
          <p className="text-sm">
            ⏳ <b className="text-fuchsia-200">{view.turn === view.me?.id ? "내" : `${nameOf(view, view.turn)}님`}</b> 차례
          </p>
        )}
      </div>
      {c ? (
        <>
          <p className="mt-1 text-3xl font-black">{claimText(c)}</p>
          <p className="text-sm text-slate-400">
            {nameOf(view, c.by)}님 예측 · 🪙{c.stake} 걸음
          </p>
        </>
      ) : (
        <p className="mt-1 text-lg text-slate-300">아직 예측이 없어요. 첫 예측을 기다리는 중…</p>
      )}
      {view.history.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-1 border-t border-slate-800 pt-3 text-xs text-slate-400">
          {view.history.slice(0, -1).map((h, i) => (
            <span key={i} className="rounded bg-slate-950/70 px-1.5 py-0.5">
              {nameOf(view, h.by)}: {COLORS[h.color].emoji}
              {h.count}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

function Stepper({ value, set, min, max, label }: { value: number; set: (n: number) => void; min: number; max: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 text-sm text-slate-400">{label}</span>
      <button className="h-10 w-10 rounded-lg bg-slate-800 text-lg" onClick={() => set(Math.max(min, value - 1))}>
        −
      </button>
      <span className="w-12 text-center font-mono text-2xl font-black">{value}</span>
      <button className="h-10 w-10 rounded-lg bg-slate-800 text-lg" onClick={() => set(Math.min(max, value + 1))}>
        +
      </button>
      <span className="text-xs text-slate-500">
        ({min}~{max})
      </span>
    </div>
  );
}

function MyTurn({ view, act, busy }: { view: GameView; act: Act; busy: boolean }) {
  const me = view.me!;
  const claim = view.claim;
  const minCount = (claim?.count ?? 0) + 1;
  const canClaim = minCount <= view.totalCards && me.coins >= 1;
  const [color, setColor] = useState<ClaimColor>(claim?.color ?? "red");
  const [count, setCount] = useState(Math.min(minCount, view.totalCards));
  const [stake, setStake] = useState(1);
  const predictor = view.players.find((p) => p.id === claim?.by);
  const doubtMin = claim ? Math.min(claim.stake, me.coins) : 0;
  const doubtMax = claim && predictor ? Math.max(doubtMin, Math.min(me.coins, predictor.coins + claim.stake)) : 0;
  const [doubtAmt, setDoubtAmt] = useState(doubtMin);

  return (
    <Card className="border-fuchsia-500">
      <p className="text-lg font-black">🎯 내 차례!</p>
      {claim && (
        <div className="mt-3 rounded-xl bg-rose-950/40 p-3">
          <p className="font-bold">
            🚨 다우트 — &quot;{claimText(claim)}&quot;은 거짓말이다!
          </p>
          <div className="mt-2">
            <Stepper label="걸 코인" value={doubtAmt} set={setDoubtAmt} min={doubtMin} max={doubtMax} />
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {doubtAmt <= claim.stake ? "같은 금액이면 바로 카드 공개" : "더 걸면 상대가 콜/레이즈/폴드를 선택해요"}
          </p>
          <button
            disabled={busy || me.coins < 1}
            onClick={() => act("doubt", { amount: doubtAmt })}
            className="mt-2 w-full rounded-xl bg-rose-500 py-3 text-lg font-black text-white disabled:opacity-40"
          >
            다우트! (🪙{doubtAmt})
          </button>
        </div>
      )}
      <div className="mt-3 rounded-xl bg-slate-950/60 p-3">
        <p className="font-bold">{claim ? "✅ 인정하고 더 높게 예측" : "📣 첫 예측하기"}</p>
        {canClaim ? (
          <>
            <div className="mt-2 flex flex-wrap gap-2">
              {CLAIM_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`rounded-lg border-2 px-3 py-2 text-sm font-bold ${color === c ? "border-white bg-slate-700" : "border-transparent bg-slate-800"}`}
                >
                  {COLORS[c].emoji} {COLORS[c].name}
                </button>
              ))}
            </div>
            <div className="mt-3 space-y-2">
              <Stepper label="장수" value={count} set={setCount} min={minCount} max={view.totalCards} />
              <Stepper label="걸 코인" value={stake} set={setStake} min={1} max={me.coins} />
            </div>
            <button
              disabled={busy}
              onClick={() => act("claim", { color, count, stake })}
              className="mt-3 w-full rounded-xl bg-fuchsia-500 py-3 text-lg font-black text-white disabled:opacity-40"
            >
              &quot;{COLORS[color].emoji} {COLORS[color].name} {count}장 이상!&quot; (🪙{stake})
            </button>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-400">
            {me.coins < 1 ? "코인이 없어요. 슬롯을 팔아 코인을 만드세요." : "더 높게 부를 수 없어요. 다우트해야 해요!"}
          </p>
        )}
      </div>
    </Card>
  );
}

function ShowdownPanel({ view, act, busy }: { view: GameView; act: Act; busy: boolean }) {
  const sd = view.showdown!;
  const me = view.me;
  const claim = view.claim!;
  const myTurn = me && sd.toAct === me.id;
  const other = me?.id === sd.predictor ? sd.doubter : sd.predictor;
  const otherCommit = sd.commit[other] ?? 0;
  const max = view.maxRaise ?? 0;
  const [raise, setRaise] = useState(Math.min(otherCommit + 1, max));
  return (
    <Card className="border-rose-500 bg-rose-950/30">
      <p className="text-xl font-black">⚔️ 다우트 대결!</p>
      <p className="mt-1 text-sm">
        <b>{nameOf(view, sd.predictor)}</b> &quot;{claimText(claim)}&quot; vs <b>{nameOf(view, sd.doubter)}</b> 🚨다우트
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        {[sd.predictor, sd.doubter].map((id) => (
          <div key={id} className={`rounded-xl p-2 ${sd.toAct === id ? "bg-slate-800 ring-2 ring-rose-400" : "bg-slate-950/60"}`}>
            <p className="text-xs text-slate-400">{id === sd.predictor ? "예측" : "다우트"}</p>
            <p className="font-bold">{nameOf(view, id)}</p>
            <p className="font-mono text-2xl font-black text-amber-300">🪙{sd.commit[id]}</p>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1 text-xs text-slate-400">
        {sd.log.map((l, i) => (
          <span key={i} className="rounded bg-slate-950/70 px-1.5 py-0.5">
            {nameOf(view, l.by)} {l.move === "doubt" ? "다우트" : l.move === "raise" ? "레이즈" : l.move === "call" ? "콜" : "폴드"} {l.total}
          </span>
        ))}
      </div>
      {myTurn ? (
        <div className="mt-4 space-y-2">
          <p className="font-bold">내 선택은?</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              disabled={busy}
              onClick={() => act("respond", { move: "call" })}
              className="rounded-xl bg-emerald-500 py-3 font-black text-slate-950 disabled:opacity-40"
            >
              콜 (🪙{otherCommit}) → 공개
            </button>
            <button
              disabled={busy}
              onClick={() => {
                if (confirm("폴드하면 지금까지 건 코인을 잃어요. 할까요?")) act("respond", { move: "fold" });
              }}
              className="rounded-xl bg-slate-700 py-3 font-black disabled:opacity-40"
            >
              폴드 (포기)
            </button>
          </div>
          {max > otherCommit && (
            <div className="rounded-xl bg-slate-950/60 p-3">
              <Stepper label="레이즈" value={raise} set={setRaise} min={otherCommit + 1} max={max} />
              <button
                disabled={busy}
                onClick={() => act("respond", { move: "raise", total: raise })}
                className="mt-2 w-full rounded-xl bg-amber-500 py-2 font-black text-slate-950 disabled:opacity-40"
              >
                🪙{raise}로 레이즈
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-400">{nameOf(view, sd.toAct)}님이 고민 중…</p>
      )}
    </Card>
  );
}

function ResultCard({ view }: { view: GameView }) {
  const r = view.lastResult!;
  const mine = r.winner === view.me?.id;
  const predictorWon = r.winner === r.claim.by;
  return (
    <Card className={mine ? "border-emerald-500" : "border-amber-600/60"}>
      <p className="text-xs text-slate-400">{r.hand}판 결과</p>
      <p className="text-lg font-black">
        {nameOf(view, r.claim.by)} &quot;{claimText(r.claim)}&quot; vs {nameOf(view, r.doubter)} 다우트
      </p>
      {r.folded ? (
        <p className="mt-1 text-xl font-black">🏳️ {nameOf(view, r.folded)} 폴드! → {mine ? "내가" : `${nameOf(view, r.winner)}님이`} 🪙{r.pot} 획득</p>
      ) : (
        <>
          <p className="mt-1 text-xl font-black">
            실제 {COLORS[r.claim.color].emoji} {r.actual}장 → {predictorWon ? "✅ 예측 성공" : "❌ 거짓말 들킴"}!{" "}
            {mine ? "🎉 내가" : `🏆 ${nameOf(view, r.winner)}님이`} 🪙{r.pot} 획득
          </p>
          <div className="mt-3 space-y-1">
            {r.cards!.map((x) => (
              <div key={x.playerId} className="flex items-center gap-2">
                <span className="w-16 truncate text-xs text-slate-400">{nameOf(view, x.playerId)}</span>
                <span className="flex flex-wrap gap-1">
                  {x.cards.map((c, i) => (
                    <span key={i} className={c === r.claim.color || c === "rainbow" ? "" : "opacity-25"}>
                      <ColorCard c={c} size="sm" />
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
      {view.events.length > 0 && (
        <div className="mt-2 text-xs text-amber-200">
          {view.events.map((e, i) => (
            <p key={i}>{e}</p>
          ))}
        </div>
      )}
    </Card>
  );
}

function Table({ view }: { view: GameView }) {
  return (
    <Card>
      <p className="mb-2 font-bold">🪑 테이블</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-500">
            <th className="text-left font-normal">이름</th>
            <th className="font-normal">코인</th>
            <th className="font-normal">슬롯</th>
            <th className="font-normal">점수</th>
          </tr>
        </thead>
        <tbody>
          {view.players.map((p) => (
            <tr key={p.id} className={`${p.out ? "text-slate-600 line-through" : ""} ${view.turn === p.id ? "text-fuchsia-200" : ""}`}>
              <td className="py-0.5">
                {view.turn === p.id ? "▶ " : p.isHost ? "👑 " : ""}
                {p.name}
                {p.id === view.me?.id && <span className="ml-1 text-xs text-fuchsia-300">(나)</span>}
              </td>
              <td className="text-center font-mono text-amber-300">{p.coins}</td>
              <td className="text-center font-mono">{p.slots}</td>
              <td className="text-center font-mono text-slate-400">{p.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-slate-500">점수 = 코인 + 슬롯×{SLOT_VALUE}</p>
    </Card>
  );
}

function SlotPanel({ view, act, busy }: { view: GameView; act: Act; busy: boolean }) {
  const me = view.me!;
  return (
    <Card>
      <p className="font-bold">🎰 슬롯 거래</p>
      <p className="mt-1 text-xs text-slate-400">
        슬롯 1개 = 코인 {SLOT_VALUE}개. 다음 판부터 슬롯 수만큼 카드를 받아요.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          disabled={busy || me.slots <= 1}
          onClick={() => act("sellSlot")}
          className="rounded-lg bg-slate-700 py-2 text-sm font-bold disabled:opacity-40"
        >
          팔기 (+🪙{SLOT_VALUE})
        </button>
        <button
          disabled={busy || me.slots >= MAX_SLOTS || me.coins - SLOT_VALUE < 1}
          onClick={() => act("buySlot")}
          className="rounded-lg bg-slate-700 py-2 text-sm font-bold disabled:opacity-40"
        >
          사기 (−🪙{SLOT_VALUE})
        </button>
      </div>
    </Card>
  );
}

function HostPanel({ act, busy }: { act: Act; busy: boolean }) {
  return (
    <Card className="border-amber-700/50">
      <p className="text-sm font-bold text-amber-300">👑 방장 메뉴</p>
      <p className="mt-1 text-xs text-slate-400">자리를 비운 사람이 있을 때만 쓰세요. 그 사람 대신 가장 기본 선택(다우트/콜)을 해요.</p>
      <button
        disabled={busy}
        onClick={() => {
          if (confirm("지금 차례인 사람 대신 진행할까요?")) act("force");
        }}
        className="mt-3 w-full rounded-lg bg-slate-700 py-2 text-sm font-bold disabled:opacity-50"
      >
        강제 진행
      </button>
    </Card>
  );
}

function EndScreen({ view }: { view: GameView }) {
  const ranked = (view.ranking ?? []).map((id) => view.players.find((p) => p.id === id)!);
  return (
    <div className="space-y-4">
      {view.lastResult && <ResultCard view={view} />}
      <Card className="border-fuchsia-500/70">
        <p className="mb-3 text-center text-2xl font-black">🏁 최종 결과</p>
        <div className="space-y-2">
          {ranked.map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                i === 0 ? "bg-amber-500/20" : i === ranked.length - 1 ? "bg-rose-500/10" : "bg-slate-950/60"
              }`}
            >
              <span className="font-bold">
                {i === 0 ? "🏆" : i === ranked.length - 1 ? "💀" : `${i + 1}.`} {p.name}
                {p.id === view.me?.id && <span className="ml-1 text-xs text-fuchsia-300">(나)</span>}
              </span>
              <span className="text-sm">
                <b>{p.out ? "파산" : `${p.score}점`}</b>
                <span className="ml-2 text-xs text-slate-400">
                  (🪙{p.coins} · 슬롯 {p.slots})
                </span>
              </span>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <Link href="/doubt" className="font-bold text-fuchsia-300 underline">
          새 게임 만들기
        </Link>
      </Card>
    </div>
  );
}
