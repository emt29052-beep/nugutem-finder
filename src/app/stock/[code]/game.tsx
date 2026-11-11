"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  STOCK_DEFS,
  STOCK_IDS,
  type GameView,
  type Order,
  type StockId,
} from "@/lib/stock/game";
import { Rules } from "../rules";

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
const signed = (n: number) => (n > 0 ? `+${n.toLocaleString("ko-KR")}` : n.toLocaleString("ko-KR"));
const def = (id: StockId) => STOCK_DEFS.find((s) => s.id === id)!;
const emptyOrder = (): Order => ({ A: 0, B: 0, C: 0, D: 0 });
const noSubscribe = () => () => {};

const PHASE_LABEL: Record<GameView["phase"], string> = {
  lobby: "대기실",
  talk: "💬 대화 · 협상",
  order: "📝 비공개 주문",
  result: "📊 결과 공개",
  end: "🏆 게임 종료",
};

export function Game({ code }: { code: string }) {
  const tokenKey = `stock:token:${code}`;
  const storedToken = useSyncExternalStore(
    noSubscribe,
    () => localStorage.getItem(tokenKey) ?? "",
    () => null
  );
  const [joinedToken, setToken] = useState<string | null>(null);
  const token = joinedToken ?? storedToken;
  const [view, setView] = useState<GameView | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const versionRef = useRef(-1);

  const applyView = useCallback((v: GameView) => {
    versionRef.current = v.version;
    setView(v);
  }, []);

  const poll = useCallback(async () => {
    if (token === null) return;
    try {
      const res = await fetch(
        `/api/stock?code=${code}&token=${encodeURIComponent(token)}&v=${versionRef.current}`,
        { cache: "no-store" }
      );
      if (res.status === 404) return setNotFound(true);
      const data = await res.json();
      if (data.view) applyView(data.view);
    } catch {
      /* 다음 폴링에서 재시도 */
    }
  }, [code, token, applyView]);

  useEffect(() => {
    const first = setTimeout(poll, 0);
    const id = setInterval(poll, 1500);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [poll]);

  const act = useCallback(
    async (action: string, extra: Record<string, unknown> = {}) => {
      setBusy(true);
      setError("");
      try {
        const res = await fetch("/api/stock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, code, token, ...extra }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (data.token) {
          localStorage.setItem(tokenKey, data.token);
          setToken(data.token);
        }
        if (data.view) applyView(data.view);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [code, token, tokenKey, applyView]
  );

  if (notFound)
    return (
      <Shell>
        <div className="py-20 text-center">
          <p className="text-xl font-bold">방 {code}을(를) 찾을 수 없습니다.</p>
          <Link href="/stock" className="mt-4 inline-block text-emerald-400 underline">
            처음으로
          </Link>
        </div>
      </Shell>
    );
  if (!view) return <Shell><p className="py-20 text-center text-slate-400">불러오는 중…</p></Shell>;

  const me = view.me;

  return (
    <Shell>
      <TopBar view={view} />
      {error && (
        <div className="rounded-lg border border-rose-800 bg-rose-950/60 px-4 py-2 text-sm text-rose-300">{error}</div>
      )}

      {!me ? (
        view.phase === "lobby" ? (
          <JoinForm onJoin={(name) => act("join", { name })} busy={busy} />
        ) : (
          <Card>
            <p>이미 진행 중인 게임입니다. 관전 모드로 보는 중이에요.</p>
          </Card>
        )
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <StockBoard view={view} />
          {me && me.cards.length > 0 && view.phase !== "result" && <MyCards view={view} />}
          <PhasePanel view={view} act={act} busy={busy} />
        </div>
        <div className="space-y-4">
          {me && <Portfolio view={view} />}
          <Players view={view} />
          {me && (view.phase === "talk" || view.phase === "order") && <TransferBox view={view} act={act} busy={busy} />}
          {me && view.myTransfers.length > 0 && <TransferLog view={view} />}
          <details className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <summary className="cursor-pointer font-bold">게임 방법</summary>
            <div className="mt-3">
              <Rules />
            </div>
          </details>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-950 px-3 py-4 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-4">{children}</div>
    </main>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-800 bg-slate-900 p-4 ${className}`}>{children}</section>;
}

function TopBar({ view }: { view: GameView }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Link href="/stock" className="text-2xl font-black">
          📈 블러프 마켓
        </Link>
        <span className="rounded-md bg-slate-800 px-2 py-1 font-mono text-sm tracking-widest">{view.code}</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        {view.round > 0 && (
          <span className="rounded-full bg-slate-800 px-3 py-1">
            라운드 {view.round} / {view.totalRounds}
          </span>
        )}
        <span className="rounded-full bg-emerald-500/15 px-3 py-1 font-bold text-emerald-300">
          {PHASE_LABEL[view.phase]}
        </span>
      </div>
    </header>
  );
}

function JoinForm({ onJoin, busy }: { onJoin: (name: string) => void; busy: boolean }) {
  const [name, setName] = useState("");
  return (
    <Card>
      <p className="mb-2 font-bold">이 방에 참가하기</p>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={12}
          placeholder="닉네임"
          className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-emerald-500"
        />
        <button
          disabled={busy || !name.trim()}
          onClick={() => onJoin(name)}
          className="rounded-lg bg-emerald-500 px-4 font-bold text-slate-950 disabled:opacity-50"
        >
          참가
        </button>
      </div>
    </Card>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return <div className="h-10" />;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * 100},${36 - ((v - min) / range) * 32}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-10 w-full">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function StockBoard({ view }: { view: GameView }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {view.stocks.map((s) => {
        const d = def(s.id);
        const prev = s.history.length >= 2 ? s.history[s.history.length - 2] : null;
        const last = s.history[s.history.length - 1];
        const change = prev === null ? 0 : last - prev;
        const relisted = last === 0;
        return (
          <div key={s.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold">
                {d.emoji} {d.name}
              </span>
            </div>
            <p className="mt-1 font-mono text-2xl font-black">{won(s.price)}</p>
            <p
              className={`font-mono text-sm ${
                relisted ? "text-rose-400" : change > 0 ? "text-red-400" : change < 0 ? "text-sky-400" : "text-slate-500"
              }`}
            >
              {relisted ? "상장폐지 → 재상장" : prev === null ? "-" : `${change > 0 ? "▲" : change < 0 ? "▼" : "-"} ${signed(change)}`}
            </p>
            <Sparkline data={s.history} color={d.color} />
          </div>
        );
      })}
    </div>
  );
}

function MyCards({ view }: { view: GameView }) {
  return (
    <Card className="border-amber-700/60 bg-gradient-to-br from-amber-950/40 to-slate-900">
      <p className="mb-3 text-sm font-bold text-amber-300">🤫 나의 비밀 정보 카드 (이번 라운드)</p>
      <div className="flex flex-wrap gap-3">
        {view.me!.cards.map((c, i) => {
          const d = def(c.stock);
          return (
            <div
              key={i}
              className="min-w-32 rounded-xl border-2 bg-slate-950 px-4 py-3 text-center"
              style={{ borderColor: d.color }}
            >
              <p className="text-sm">
                {d.emoji} {d.name}
              </p>
              <p className={`font-mono text-3xl font-black ${c.delta > 0 ? "text-red-400" : "text-sky-400"}`}>
                {signed(c.delta)}
              </p>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-slate-400">
        실제 변동 = 모든 사람의 카드 합 + 시장 변동(−100~+100). 이 카드는 다른 사람에게 보이지 않습니다.
      </p>
    </Card>
  );
}

function HostButton({
  children,
  onClick,
  busy,
  tone = "emerald",
}: {
  children: React.ReactNode;
  onClick: () => void;
  busy: boolean;
  tone?: "emerald" | "slate";
}) {
  const cls = tone === "emerald" ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400" : "bg-slate-700 hover:bg-slate-600";
  return (
    <button disabled={busy} onClick={onClick} className={`rounded-lg px-4 py-2 font-bold disabled:opacity-50 ${cls}`}>
      {children}
    </button>
  );
}

type Act = (action: string, extra?: Record<string, unknown>) => Promise<boolean>;

function PhasePanel({ view, act, busy }: { view: GameView; act: Act; busy: boolean }) {
  const me = view.me;
  const isHost = !!me?.isHost;
  const host = view.players.find((p) => p.isHost)?.name;

  if (view.phase === "lobby") {
    return (
      <Card>
        <p className="text-lg font-bold">친구들을 초대하세요</p>
        <p className="mt-1 text-sm text-slate-400">
          방 코드 <b className="font-mono text-white">{view.code}</b> 를 알려주거나 아래 링크를 공유하세요. (
          {view.totalRounds}라운드 · 1인당 카드 {view.cardsPerPlayer}장)
        </p>
        <CopyLink />
        <div className="mt-4">
          {isHost ? (
            <HostButton busy={busy || view.players.length < 2} onClick={() => act("start")}>
              게임 시작 ({view.players.length}명)
            </HostButton>
          ) : (
            <p className="text-sm text-slate-400">방장({host})이 게임을 시작하길 기다리는 중…</p>
          )}
        </div>
      </Card>
    );
  }

  if (view.phase === "talk") {
    return (
      <Card>
        <p className="text-lg font-bold">💬 대화 · 협상 시간</p>
        <p className="mt-1 text-sm text-slate-400">
          카드 정보를 공유하거나 숨기거나, 거짓말을 하세요. 필요하면 오른쪽에서 현금·주식을 송금해 거래할 수 있습니다.
        </p>
        <div className="mt-4">
          {isHost ? (
            <HostButton busy={busy} onClick={() => act("openOrders")}>
              주문 받기 시작 →
            </HostButton>
          ) : (
            <p className="text-sm text-slate-400">방장이 주문 단계를 열면 매매할 수 있습니다.</p>
          )}
        </div>
      </Card>
    );
  }

  if (view.phase === "order") {
    const submitted = view.players.filter((p) => p.submitted).length;
    return (
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-lg font-bold">📝 비공개 주문</p>
          <span className="text-sm text-slate-400">
            제출 {submitted} / {view.players.length}
          </span>
        </div>
        {me ? <OrderForm view={view} act={act} busy={busy} /> : null}
        {isHost && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-800 pt-4">
            <HostButton busy={busy} onClick={() => act("reveal")}>
              결과 공개 {submitted < view.players.length && "(미제출자는 거래 없음)"}
            </HostButton>
            <HostButton busy={busy} tone="slate" onClick={() => act("backToTalk")}>
              ← 대화로 돌아가기
            </HostButton>
          </div>
        )}
      </Card>
    );
  }

  if (view.phase === "result" && view.lastResult) {
    return (
      <div className="space-y-4">
        <ResultPanel view={view} />
        <Ranking view={view} />
        <Card>
          {isHost ? (
            <HostButton busy={busy} onClick={() => act("next")}>
              {view.round >= view.totalRounds ? "최종 결과 보기 🏆" : `라운드 ${view.round + 1} 시작 →`}
            </HostButton>
          ) : (
            <p className="text-sm text-slate-400">방장이 다음 라운드를 시작하길 기다리는 중…</p>
          )}
        </Card>
      </div>
    );
  }

  if (view.phase === "end") {
    return (
      <div className="space-y-4">
        <Ranking view={view} final />
        {view.lastResult && <ResultPanel view={view} />}
        <Card>
          <Link href="/stock" className="font-bold text-emerald-400 underline">
            새 게임 만들기
          </Link>
        </Card>
      </div>
    );
  }

  return null;
}

function CopyLink() {
  const [copied, setCopied] = useState(false);
  const url = useSyncExternalStore(noSubscribe, () => window.location.href, () => "");
  return (
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
  );
}

function OrderForm({ view, act, busy }: { view: GameView; act: Act; busy: boolean }) {
  const me = view.me!;
  const [draft, setDraft] = useState<Order>(me.order ?? emptyOrder());
  const price = (id: StockId) => view.stocks.find((s) => s.id === id)!.price;

  const cashAfter =
    me.cash - STOCK_IDS.reduce((sum, id) => sum + draft[id] * price(id), 0);

  const set = (id: StockId, q: number) => {
    const clamped = Math.max(-me.shares[id], q);
    setDraft((d) => ({ ...d, [id]: clamped }));
  };

  const maxBuy = (id: StockId) => draft[id] + Math.max(0, Math.floor(cashAfter / price(id)));

  if (me.order) {
    return (
      <div className="mt-3 rounded-xl bg-emerald-950/40 p-4">
        <p className="font-bold text-emerald-300">✅ 주문 제출 완료</p>
        <OrderSummary order={me.order} />
        <button
          disabled={busy}
          onClick={async () => {
            setDraft(me.order!);
            await act("cancelOrder");
          }}
          className="mt-3 text-sm text-slate-400 underline"
        >
          주문 수정하기
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      {STOCK_IDS.map((id) => {
        const d = def(id);
        const q = draft[id];
        return (
          <div key={id} className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-950/60 p-3">
            <div className="w-32">
              <p className="text-sm font-bold">
                {d.emoji} {d.name}
              </p>
              <p className="text-xs text-slate-400">
                {won(price(id))} · 보유 {me.shares[id]}주
              </p>
            </div>
            <div className="flex flex-1 items-center justify-end gap-1">
              <Step onClick={() => set(id, -me.shares[id])}>전량매도</Step>
              <Step onClick={() => set(id, q - 5)}>-5</Step>
              <Step onClick={() => set(id, q - 1)}>-1</Step>
              <input
                type="number"
                value={q}
                onChange={(e) => set(id, Math.trunc(Number(e.target.value) || 0))}
                className="w-16 rounded bg-slate-800 px-1 py-1 text-center font-mono"
              />
              <Step onClick={() => set(id, q + 1)}>+1</Step>
              <Step onClick={() => set(id, q + 5)}>+5</Step>
              <Step onClick={() => set(id, maxBuy(id))}>최대매수</Step>
            </div>
            <p
              className={`w-full text-right text-xs font-bold ${
                q > 0 ? "text-red-400" : q < 0 ? "text-sky-400" : "text-slate-500"
              }`}
            >
              {q > 0 ? `${q}주 매수 (−${won(q * price(id))})` : q < 0 ? `${-q}주 매도 (+${won(-q * price(id))})` : "거래 없음"}
            </p>
          </div>
        );
      })}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        <p className={`text-sm ${cashAfter < 0 ? "text-rose-400" : "text-slate-300"}`}>
          주문 후 현금: <b className="font-mono">{won(cashAfter)}</b>
        </p>
        <div className="flex gap-2">
          <button onClick={() => setDraft(emptyOrder())} className="rounded-lg bg-slate-700 px-3 py-2 text-sm">
            초기화
          </button>
          <button
            disabled={busy || cashAfter < 0}
            onClick={() => act("order", { order: draft })}
            className="rounded-lg bg-emerald-500 px-4 py-2 font-bold text-slate-950 disabled:opacity-50"
          >
            {STOCK_IDS.every((id) => draft[id] === 0) ? "이번엔 거래 안 함" : "주문 제출"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded bg-slate-800 px-2 py-1 text-xs hover:bg-slate-700">
      {children}
    </button>
  );
}

function OrderSummary({ order }: { order: Order | null }) {
  if (!order || STOCK_IDS.every((id) => order[id] === 0))
    return <span className="text-sm text-slate-500">거래 없음</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {STOCK_IDS.filter((id) => order[id] !== 0).map((id) => (
        <span
          key={id}
          className={`rounded px-1.5 py-0.5 text-xs font-bold ${
            order[id] > 0 ? "bg-red-500/20 text-red-300" : "bg-sky-500/20 text-sky-300"
          }`}
        >
          {def(id).emoji}
          {def(id).name} {order[id] > 0 ? `매수 ${order[id]}` : `매도 ${-order[id]}`}
        </span>
      ))}
    </span>
  );
}

function ResultPanel({ view }: { view: GameView }) {
  const r = view.lastResult!;
  const name = (pid: string) => view.players.find((p) => p.id === pid)?.name ?? "?";
  return (
    <Card>
      <p className="mb-3 text-lg font-bold">📊 라운드 {r.round} 결과</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {STOCK_IDS.map((id) => {
          const d = def(id);
          const c = r.changes[id];
          const delta = c.to - c.from;
          const contributions = r.cards.flatMap((pc) =>
            pc.cards.filter((card) => card.stock === id).map((card) => ({ who: name(pc.playerId), delta: card.delta }))
          );
          return (
            <div key={id} className="rounded-xl bg-slate-950/60 p-3">
              <div className="flex items-center justify-between">
                <span className="font-bold">
                  {d.emoji} {d.name}
                </span>
                <span className={`font-mono font-bold ${delta > 0 ? "text-red-400" : delta < 0 ? "text-sky-400" : ""}`}>
                  {won(c.from)} → {won(c.to)}
                </span>
              </div>
              {c.delisted && <p className="text-sm font-bold text-rose-400">💥 상장폐지! 보유 주식 소멸, 1,000원으로 재상장</p>}
              <div className="mt-2 flex flex-wrap gap-1 text-xs">
                {contributions.map((x, i) => (
                  <span key={i} className="rounded bg-slate-800 px-1.5 py-0.5">
                    {x.who} <b className={x.delta > 0 ? "text-red-300" : "text-sky-300"}>{signed(x.delta)}</b>
                  </span>
                ))}
                <span className="rounded bg-slate-800 px-1.5 py-0.5">
                  시장 <b>{signed(c.market)}</b>
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mb-2 mt-4 font-bold">누가 무엇을 샀나</p>
      <div className="space-y-1">
        {r.orders.map((o) => (
          <div key={o.playerId} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="w-24 truncate font-bold">{name(o.playerId)}</span>
            <OrderSummary order={o.order} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function Ranking({ view, final = false }: { view: GameView; final?: boolean }) {
  const ranked = [...view.players].sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <Card className={final ? "border-amber-600/60" : ""}>
      <p className="mb-3 text-lg font-bold">{final ? "🏆 최종 순위" : "현재 순위 (총자산)"}</p>
      <div className="space-y-2">
        {ranked.map((p, i) => (
          <div key={p.id} className="rounded-xl bg-slate-950/60 px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="font-bold">
                {medals[i] ?? `${i + 1}.`} {p.name}
                {p.id === view.me?.id && <span className="ml-1 text-xs text-emerald-400">(나)</span>}
              </span>
              <span className="font-mono font-bold">{won(p.total ?? 0)}</span>
            </div>
            {final && p.shares && (
              <p className="mt-1 text-xs text-slate-400">
                현금 {won(p.cash ?? 0)} ·{" "}
                {STOCK_IDS.filter((id) => p.shares![id] > 0)
                  .map((id) => `${def(id).name} ${p.shares![id]}주`)
                  .join(", ") || "주식 없음"}
              </p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function Portfolio({ view }: { view: GameView }) {
  const me = view.me!;
  const price = (id: StockId) => view.stocks.find((s) => s.id === id)!.price;
  return (
    <Card>
      <p className="text-sm text-slate-400">{me.name}님의 자산</p>
      <p className="font-mono text-3xl font-black">{won(me.total)}</p>
      <div className="mt-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span>💵 현금</span>
          <span className="font-mono">{won(me.cash)}</span>
        </div>
        {STOCK_IDS.map((id) => (
          <div key={id} className="flex justify-between text-slate-300">
            <span>
              {def(id).emoji} {def(id).name} {me.shares[id]}주
            </span>
            <span className="font-mono">{won(me.shares[id] * price(id))}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Players({ view }: { view: GameView }) {
  return (
    <Card>
      <p className="mb-2 font-bold">참가자 {view.players.length}명</p>
      <ul className="space-y-1 text-sm">
        {view.players.map((p) => (
          <li key={p.id} className="flex items-center justify-between">
            <span>
              {p.isHost && "👑 "}
              {p.name}
              {p.id === view.me?.id && <span className="ml-1 text-xs text-emerald-400">(나)</span>}
            </span>
            {view.phase === "order" && (
              <span className={p.submitted ? "text-emerald-400" : "text-slate-500"}>
                {p.submitted ? "제출 완료" : "고민 중…"}
              </span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function TransferBox({ view, act, busy }: { view: GameView; act: Act; busy: boolean }) {
  const me = view.me!;
  const others = view.players.filter((p) => p.id !== me.id);
  const [to, setTo] = useState(others[0]?.id ?? "");
  const [cash, setCash] = useState(0);
  const [stock, setStock] = useState<StockId | "">("");
  const [qty, setQty] = useState(0);
  const toName = others.find((p) => p.id === to)?.name;

  return (
    <Card>
      <p className="font-bold">🤝 송금 · 주식 양도</p>
      <p className="mb-3 text-xs text-slate-400">정보 거래, 동맹, 뒷거래에 사용하세요. 받는 사람과 나에게만 기록이 보입니다.</p>
      <div className="space-y-2 text-sm">
        <select value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded bg-slate-800 px-2 py-2">
          {others.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2">
          <span className="w-12">현금</span>
          <input
            type="number"
            min={0}
            value={cash}
            onChange={(e) => setCash(Math.max(0, Math.trunc(Number(e.target.value) || 0)))}
            className="flex-1 rounded bg-slate-800 px-2 py-1 font-mono"
          />
        </label>
        <div className="flex items-center gap-2">
          <span className="w-12">주식</span>
          <select
            value={stock}
            onChange={(e) => setStock(e.target.value as StockId | "")}
            className="flex-1 rounded bg-slate-800 px-2 py-1"
          >
            <option value="">없음</option>
            {STOCK_IDS.map((id) => (
              <option key={id} value={id} disabled={me.shares[id] === 0}>
                {def(id).name} (보유 {me.shares[id]})
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            value={qty}
            disabled={!stock}
            onChange={(e) => setQty(Math.max(0, Math.trunc(Number(e.target.value) || 0)))}
            className="w-16 rounded bg-slate-800 px-2 py-1 font-mono disabled:opacity-40"
          />
        </div>
        <button
          disabled={busy || !to || (cash === 0 && (!stock || qty === 0))}
          onClick={async () => {
            const what = [cash > 0 && won(cash), stock && qty > 0 && `${def(stock).name} ${qty}주`]
              .filter(Boolean)
              .join(" + ");
            if (!confirm(`${toName}님에게 ${what}을(를) 보낼까요? 되돌릴 수 없습니다.`)) return;
            const ok = await act("transfer", { to, cash, stock: stock || null, qty: stock ? qty : 0 });
            if (ok) {
              setCash(0);
              setQty(0);
              setStock("");
            }
          }}
          className="w-full rounded-lg bg-amber-500 py-2 font-bold text-slate-950 disabled:opacity-50"
        >
          보내기
        </button>
      </div>
    </Card>
  );
}

function TransferLog({ view }: { view: GameView }) {
  const name = (pid: string) => view.players.find((p) => p.id === pid)?.name ?? "?";
  const me = view.me!;
  return (
    <Card>
      <p className="mb-2 font-bold">내 거래 기록</p>
      <ul className="space-y-1 text-xs text-slate-300">
        {[...view.myTransfers].reverse().map((t, i) => {
          const items = [t.cash > 0 && won(t.cash), t.stock && t.qty > 0 && `${def(t.stock).name} ${t.qty}주`]
            .filter(Boolean)
            .join(" + ");
          return (
            <li key={i}>
              R{t.round} ·{" "}
              {t.from === me.id ? (
                <>
                  <b>{name(t.to)}</b>에게 {items} 보냄
                </>
              ) : (
                <>
                  <b>{name(t.from)}</b>에게서 {items} 받음
                </>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
