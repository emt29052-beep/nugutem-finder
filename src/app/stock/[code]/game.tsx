"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Chat } from "./chat";
import { ITEMS, STOCK_IDS, stockDef, type GameView, type ItemId, type StockId } from "@/lib/stock/game";
import { Rules } from "../rules";

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
const pctText = (from: number, to: number) => {
  const p = ((to - from) / from) * 100;
  return `${p > 0 ? "+" : ""}${p.toFixed(1)}%`;
};
const upDown = (n: number) => (n > 0 ? "text-red-400" : n < 0 ? "text-sky-400" : "text-slate-400");
const noSubscribe = () => () => {};

type Act = (action: string, extra?: Record<string, unknown>) => Promise<boolean>;

export function Game({ code }: { code: string }) {
  const tokenKey = `stock:token:${code}`;
  const storedToken = useSyncExternalStore(noSubscribe, () => localStorage.getItem(tokenKey) ?? "", () => null);
  const [joinedToken, setToken] = useState<string | null>(null);
  const token = joinedToken ?? storedToken;
  const [view, setView] = useState<GameView | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [toast, setToast] = useState<{ text: string; error: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const versionRef = useRef(-1);
  const [offset, setOffset] = useState(0);

  const applyView = useCallback((v: GameView) => {
    versionRef.current = v.version;
    setOffset(v.serverNow - Date.now());
    setView(v);
  }, []);

  const showToast = useCallback((text: string, error = false) => {
    setToast({ text, error });
    setTimeout(() => setToast((t) => (t?.text === text ? null : t)), 2500);
  }, []);

  const poll = useCallback(async () => {
    if (token === null) return;
    try {
      const res = await fetch(`/api/stock?code=${code}&token=${encodeURIComponent(token)}&v=${versionRef.current}`, {
        cache: "no-store",
      });
      if (res.status === 404) return setNotFound(true);
      const data = await res.json();
      if (data.view) applyView(data.view);
    } catch {
      /* 다음 폴링에서 재시도 */
    }
  }, [code, token, applyView]);

  useEffect(() => {
    const first = setTimeout(poll, 0);
    const id = setInterval(poll, 1200);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [poll]);

  const act: Act = useCallback(
    async (action, extra = {}) => {
      setBusy(true);
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
        showToast(e instanceof Error ? e.message : "오류가 발생했습니다.", true);
        poll();
        return false;
      } finally {
        setBusy(false);
      }
    },
    [code, token, tokenKey, applyView, showToast, poll]
  );

  if (notFound)
    return (
      <Shell>
        <div className="py-20 text-center">
          <p className="text-xl font-bold">방 {code}을(를) 찾을 수 없습니다.</p>
          <Link href="/stock" className="mt-4 inline-block text-cyan-400 underline">
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
      <TopBar view={view} offset={offset} />
      {toast && (
        <div
          className={`fixed inset-x-3 top-16 z-50 mx-auto max-w-md rounded-xl px-4 py-3 text-center text-sm font-bold shadow-2xl ${
            toast.error ? "bg-rose-600 text-white" : "bg-emerald-500 text-slate-950"
          }`}
        >
          {toast.text}
        </div>
      )}

      {me && <Chat view={view} act={act} />}

      {view.phase === "lobby" && <Lobby view={view} act={act} busy={busy} />}

      {view.phase === "trading" && (
        <>
          {!me && (
            <Card>
              <p className="text-sm text-slate-400">이미 진행 중인 게임이에요. 관전 모드로 보는 중입니다.</p>
            </Card>
          )}
          {me && <MyAssets view={view} />}
          {view.lastResult && <LastResult view={view} />}
          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="grid content-start gap-3 md:grid-cols-2">
              {view.stocks.map((s) => (
                <StockCard key={s.id} view={view} id={s.id} act={act} busy={busy} toast={showToast} />
              ))}
            </div>
            <div className="space-y-4">
              {me?.isHost && <HostPanel view={view} act={act} busy={busy} />}
              {me && <SecretPanel view={view} act={act} busy={busy} toast={showToast} />}
              {me && <ItemShop view={view} act={act} busy={busy} toast={showToast} />}
              {me && me.intel.length > 0 && <IntelPanel view={view} />}
              <NewsFeed view={view} />
              <Players view={view} />
              <RulesBox />
            </div>
          </div>
        </>
      )}

      {view.phase === "end" && (
        <div className="space-y-4">
          <Ranking view={view} />
          {view.lastResult && <LastResult view={view} />}
          <NewsFeed view={view} />
          <Card>
            <Link href="/stock" className="font-bold text-cyan-400 underline">
              새 게임 만들기
            </Link>
          </Card>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-950 via-slate-950 to-slate-950 px-3 py-4 pb-24 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-4">{children}</div>
    </main>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-800 bg-slate-900/80 p-4 ${className}`}>{children}</section>;
}

function useNow(ms = 250) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

function TopBar({ view, offset }: { view: GameView; offset: number }) {
  const now = useNow();
  const remain =
    view.deadline !== null ? Math.max(0, Math.ceil((view.deadline - (now + offset)) / 1000)) : null;
  return (
    <header className="sticky top-0 z-40 -mx-3 flex flex-wrap items-center justify-between gap-2 bg-slate-950/90 px-3 py-2 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="flex items-center gap-2">
        <Link href="/stock" className="text-xl font-black">
          🌊 딥씨 거래소
        </Link>
        <span className="rounded-md bg-slate-800 px-2 py-0.5 font-mono text-sm tracking-widest">{view.code}</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        {view.phase === "trading" && (
          <span className="rounded-full bg-slate-800 px-3 py-1 font-bold">
            R{view.round} / {view.totalRounds}
          </span>
        )}
        {view.phase === "trading" && remain !== null && (
          <span
            className={`rounded-full px-3 py-1 font-mono font-bold ${
              remain <= 10 ? "animate-pulse bg-rose-600 text-white" : "bg-cyan-500/20 text-cyan-300"
            }`}
          >
            ⏱ {Math.floor(remain / 60)}:{String(remain % 60).padStart(2, "0")}
          </span>
        )}
        {view.phase === "lobby" && <span className="rounded-full bg-slate-800 px-3 py-1">대기실</span>}
        {view.phase === "end" && <span className="rounded-full bg-amber-500/20 px-3 py-1 text-amber-300">🏆 게임 종료</span>}
      </div>
    </header>
  );
}

function Lobby({ view, act, busy }: { view: GameView; act: Act; busy: boolean }) {
  const me = view.me;
  const [name, setName] = useState("");
  const url = useSyncExternalStore(noSubscribe, () => window.location.href, () => "");
  const [copied, setCopied] = useState(false);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
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
                className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-cyan-500"
              />
              <button
                disabled={busy || !name.trim()}
                onClick={() => act("join", { name })}
                className="rounded-lg bg-cyan-500 px-4 font-bold text-slate-950 disabled:opacity-50"
              >
                참가
              </button>
            </div>
          </Card>
        )}
        <Card>
          <p className="text-lg font-bold">친구들을 초대하세요</p>
          <p className="mt-1 text-sm text-slate-400">
            방 코드 <b className="font-mono text-white">{view.code}</b> · {view.totalRounds}라운드 ·{" "}
            {view.roundSeconds ? `라운드당 ${view.roundSeconds}초` : "방장이 라운드 마감"}
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
                disabled={busy || view.players.length < 2}
                onClick={() => act("start")}
                className="rounded-lg bg-cyan-500 px-5 py-2 font-bold text-slate-950 disabled:opacity-50"
              >
                게임 시작 ({view.players.length}명)
              </button>
            ) : (
              <p className="text-sm text-slate-400">방장이 게임을 시작하길 기다리는 중…</p>
            )}
          </div>
        </Card>
        <RulesBox open />
      </div>
      <Players view={view} />
    </div>
  );
}

function MyAssets({ view }: { view: GameView }) {
  const me = view.me!;
  const profit = me.total - 100000;
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 border-cyan-900">
      <div>
        <p className="text-xs text-slate-400">{me.name}님의 총자산</p>
        <p className="font-mono text-2xl font-black">
          {won(me.total)}
          {me.totalHasHidden && <span className="text-base text-slate-400"> + ???</span>}
        </p>
        {!me.totalHasHidden && (
          <p className={`font-mono text-xs ${upDown(profit)}`}>
            시작 대비 {profit >= 0 ? "+" : ""}
            {won(profit)}
          </p>
        )}
      </div>
      <div className="text-right">
        <p className="text-xs text-slate-400">💵 현금</p>
        <p className="font-mono text-xl font-bold">{won(me.cash)}</p>
        {me.airpocketActive && <p className="text-xs text-cyan-300">🫧 에어포켓 작동 중</p>}
      </div>
    </Card>
  );
}

function Sparkline({ data, color }: { data: (number | null)[]; color: string }) {
  const nums = data.filter((v): v is number => v !== null);
  if (data.length < 2) return <div className="h-10" />;
  const max = Math.max(...nums);
  const min = Math.min(...nums);
  const range = max - min || 1;
  const x = (i: number) => (i / (data.length - 1)) * 100;
  const y = (v: number) => 36 - ((v - min) / range) * 32;
  const pts = data
    .map((v, i) => (v === null ? null : `${x(i)},${y(v)}`))
    .filter(Boolean)
    .join(" ");
  const hiddenLast = data[data.length - 1] === null;
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-10 w-full">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      {hiddenLast && (
        <text x="97" y="24" textAnchor="end" fontSize="14" fill="#94a3b8">
          ?
        </text>
      )}
    </svg>
  );
}

function StockCard({
  view,
  id,
  act,
  busy,
  toast,
}: {
  view: GameView;
  id: StockId;
  act: Act;
  busy: boolean;
  toast: (t: string, e?: boolean) => void;
}) {
  const s = view.stocks.find((x) => x.id === id)!;
  const d = stockDef(id);
  const me = view.me;
  const [qty, setQty] = useState(1);
  const prev = s.history.length >= 2 ? s.history[s.history.length - 2] : null;
  const held = me?.shares[id] ?? 0;

  async function trade(sign: 1 | -1) {
    if (qty <= 0) return;
    const ok = await act("trade", { stock: id, qty: sign * qty });
    if (ok) toast(`${d.name} ${qty}주 ${sign > 0 ? "매수" : "매도"} 완료`);
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold">
            {d.emoji} {d.name}
          </p>
          <p className="text-xs text-slate-500">{d.desc}</p>
        </div>
        <div className="text-right">
          {s.price === null ? (
            <p className="font-mono text-2xl font-black text-slate-400">🤫 ???</p>
          ) : (
            <p className="font-mono text-2xl font-black">{won(s.price)}</p>
          )}
          {s.price !== null && prev !== null && (
            <p className={`font-mono text-xs ${upDown(s.price - prev)}`}>
              {s.price > prev ? "▲" : s.price < prev ? "▼" : "-"} {pctText(prev, s.price)}
            </p>
          )}
          {s.price === null && <p className="text-xs text-slate-500">누군가 시크릿을 걸었다</p>}
        </div>
      </div>
      <Sparkline data={s.history} color={d.color} />

      {s.hint ? (
        <div className={`mt-1 rounded-lg px-3 py-2 ${s.hint.known ? "bg-amber-950/60" : "bg-slate-950/70"}`}>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>{s.hint.known ? "🔍 내부자 정보 (나만 보임)" : "📰 숨겨진 뉴스"}</span>
            <span className={s.hint.hit === view.round ? "font-bold text-rose-400" : ""}>
              {s.hint.hit === view.round ? "⚡ 이번 장 마감 반영!" : `R${s.hint.hit} 마감 반영 (${s.hint.hit - view.round}라운드 후)`}
            </span>
          </div>
          <p className="mt-0.5 font-mono text-[15px] font-bold tracking-wide text-slate-100">{s.hint.text}</p>
        </div>
      ) : (
        <div className="mt-1 rounded-lg bg-slate-950/70 px-3 py-2 text-xs text-slate-500">예정된 뉴스 없음</div>
      )}

      {s.mySecretActive && <p className="mt-2 text-xs font-bold text-fuchsia-300">🤫 내가 시크릿을 건 종목</p>}

      {me && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              보유 <b className="text-slate-100">{held}주</b>
              {s.price !== null && held > 0 && <> · {won(held * s.price)}</>}
            </span>
            <span className="flex gap-1">
              {s.price !== null && (
                <button
                  className="rounded bg-slate-800 px-2 py-0.5"
                  onClick={() => setQty(Math.max(1, Math.floor(me.cash / s.price!)))}
                >
                  최대매수
                </button>
              )}
              <button className="rounded bg-slate-800 px-2 py-0.5" onClick={() => setQty(Math.max(1, held))}>
                전량
              </button>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button className="rounded bg-slate-800 px-2 py-2 text-sm" onClick={() => setQty((q) => Math.max(1, q - 1))}>
              −
            </button>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(0, Math.trunc(Number(e.target.value) || 0)))}
              className="w-14 min-w-0 flex-1 rounded bg-slate-800 px-2 py-2 text-center font-mono"
            />
            <button className="rounded bg-slate-800 px-2 py-2 text-sm" onClick={() => setQty((q) => q + 1)}>
              +
            </button>
            <button
              disabled={busy || qty <= 0}
              onClick={() => trade(1)}
              className="rounded-lg bg-red-500 px-3 py-2 text-sm font-bold text-white disabled:opacity-40"
            >
              매수
            </button>
            <button
              disabled={busy || qty <= 0 || held === 0}
              onClick={() => trade(-1)}
              className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-bold text-white disabled:opacity-40"
            >
              매도
            </button>
          </div>
          {s.price !== null && qty > 0 && (
            <p className="text-right text-[11px] text-slate-500">
              {qty}주 = {won(qty * s.price)}
            </p>
          )}
          {s.price === null && <p className="text-right text-[11px] text-slate-500">가격 비공개 상태로 체결돼요</p>}
        </div>
      )}
    </div>
  );
}

function LastResult({ view }: { view: GameView }) {
  const r = view.lastResult!;
  return (
    <Card className="border-cyan-900/70">
      <p className="mb-2 font-bold">📢 R{r.round} 장 마감 결과</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {STOCK_IDS.map((id) => {
          const c = r.changes[id];
          const d = stockDef(id);
          return (
            <div key={id} className="rounded-lg bg-slate-950/60 px-2 py-1.5 text-xs">
              <p className="font-bold">
                {d.emoji} {d.name}
              </p>
              {c.hidden || c.to === null || c.from === null ? (
                <p className="font-mono text-slate-400">🤫 ??? (시크릿)</p>
              ) : (
                <p className={`font-mono ${upDown(c.to - c.from)}`}>
                  {won(c.from)} → {won(c.to)} ({pctText(c.from, c.to)})
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 space-y-1 text-sm">
        {STOCK_IDS.filter((id) => r.changes[id].news).map((id) => {
          const n = r.changes[id].news!;
          return (
            <p key={id} className={n.good ? "text-red-300" : "text-sky-300"}>
              {n.good ? "📈" : "📉"} {n.text}
              {n.reversed && <b className="ml-1 text-amber-300">🔄 조류 역전! 효과가 뒤집혔다</b>}
            </p>
          );
        })}
        {r.log.map((l, i) => (
          <p key={i} className="text-amber-200">
            {l}
          </p>
        ))}
        {r.mine.map((l, i) => (
          <p key={i} className="font-bold text-cyan-300">
            {l}
          </p>
        ))}
      </div>
      {r.ranking.length > 0 && view.phase === "trading" && (
        <div className="mt-3 border-t border-slate-800 pt-3">
          <p className="mb-2 text-sm font-bold">🏅 R{r.round} 마감 순위 <span className="text-xs font-normal text-slate-500">(금액은 비공개)</span></p>
          <div className="flex flex-wrap gap-2">
            {r.ranking.map((x) => {
              const diff = x.prevRank === null ? 0 : x.prevRank - x.rank;
              const isMe = x.id === view.me?.id;
              return (
                <span
                  key={x.id}
                  className={`rounded-lg px-2.5 py-1 text-sm ${isMe ? "bg-cyan-500/20 font-bold text-cyan-200" : "bg-slate-950/70"}`}
                >
                  {["🥇", "🥈", "🥉"][x.rank - 1] ?? `${x.rank}위`} {x.name}
                  {diff > 0 && <span className="ml-1 text-xs text-red-400">▲{diff}</span>}
                  {diff < 0 && <span className="ml-1 text-xs text-sky-400">▼{-diff}</span>}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

function HostPanel({ view, act, busy }: { view: GameView; act: Act; busy: boolean }) {
  return (
    <Card className="border-amber-700/50">
      <p className="text-sm font-bold text-amber-300">👑 방장 메뉴</p>
      <p className="mt-1 text-xs text-slate-400">
        {view.roundSeconds ? "타이머가 끝나면 자동 마감돼요. 모두 준비되면 바로 마감해도 됩니다." : "모두 거래를 마치면 마감하세요."}
      </p>
      <button
        disabled={busy}
        onClick={() => {
          if (confirm(`R${view.round} 장을 마감할까요?`)) act("endRound");
        }}
        className="mt-3 w-full rounded-lg bg-amber-500 py-2 font-bold text-slate-950 disabled:opacity-50"
      >
        {view.round >= view.totalRounds ? "마지막 장 마감 → 최종 결과" : `R${view.round} 장 마감 →`}
      </button>
    </Card>
  );
}

function SecretPanel({
  view,
  act,
  busy,
  toast,
}: {
  view: GameView;
  act: Act;
  busy: boolean;
  toast: (t: string, e?: boolean) => void;
}) {
  const me = view.me!;
  const [stock, setStock] = useState<StockId>("A");
  const last = view.round >= view.totalRounds;
  return (
    <Card className="border-fuchsia-900/60">
      <p className="font-bold">🤫 시크릿 {me.secretUsed ? <span className="text-xs text-slate-500">(사용 완료)</span> : <span className="text-xs text-fuchsia-300">(1회 남음)</span>}</p>
      <p className="mt-1 text-xs text-slate-400">
        종목에 걸면 이번 장 마감 결과(상승/하락)를 다음 라운드 동안 나만 볼 수 있어요.
      </p>
      {!me.secretUsed && !last && (
        <div className="mt-3 flex gap-2">
          <select
            value={stock}
            onChange={(e) => setStock(e.target.value as StockId)}
            className="min-w-0 flex-1 rounded bg-slate-800 px-2 py-2 text-sm"
          >
            {STOCK_IDS.map((id) => (
              <option key={id} value={id}>
                {stockDef(id).emoji} {stockDef(id).name}
              </option>
            ))}
          </select>
          <button
            disabled={busy}
            onClick={async () => {
              if (!confirm(`${stockDef(stock).name}에 시크릿을 걸까요? (1회 한정)`)) return;
              if (await act("secret", { stock })) toast("시크릿을 걸었습니다 🤫");
            }}
            className="rounded-lg bg-fuchsia-500 px-4 text-sm font-bold text-white disabled:opacity-50"
          >
            걸기
          </button>
        </div>
      )}
      {!me.secretUsed && last && <p className="mt-2 text-xs text-slate-500">마지막 라운드에는 쓸 수 없어요.</p>}
    </Card>
  );
}

function ItemShop({
  view,
  act,
  busy,
  toast,
}: {
  view: GameView;
  act: Act;
  busy: boolean;
  toast: (t: string, e?: boolean) => void;
}) {
  const me = view.me!;
  const [open, setOpen] = useState<ItemId | null>(null);
  const [stock, setStock] = useState<StockId>("A");
  const others = view.players.filter((p) => p.id !== me.id);
  const [target, setTarget] = useState(others[0]?.id ?? "");

  return (
    <Card>
      <p className="font-bold">🎒 반전 아이템</p>
      <p className="mb-3 text-xs text-slate-400">종류별로 한 번씩만 쓸 수 있어요. 가격은 현금에서 빠집니다.</p>
      <div className="space-y-2">
        {ITEMS.map((it) => {
          const used = me.itemsUsed.includes(it.id);
          const isOpen = open === it.id;
          return (
            <div key={it.id} className={`rounded-xl bg-slate-950/60 p-3 ${used ? "opacity-40" : ""}`}>
              <button
                disabled={used}
                onClick={() => setOpen(isOpen ? null : it.id)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="font-bold">
                  {it.emoji} {it.name}
                </span>
                <span className="font-mono text-sm text-amber-300">{used ? "사용 완료" : won(it.price)}</span>
              </button>
              {isOpen && !used && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-slate-400">{it.desc}</p>
                  <div className="flex gap-2">
                    {it.target === "stock" && (
                      <select
                        value={stock}
                        onChange={(e) => setStock(e.target.value as StockId)}
                        className="min-w-0 flex-1 rounded bg-slate-800 px-2 py-2 text-sm"
                      >
                        {STOCK_IDS.map((id) => (
                          <option key={id} value={id}>
                            {stockDef(id).emoji} {stockDef(id).name}
                          </option>
                        ))}
                      </select>
                    )}
                    {it.target === "player" && (
                      <select
                        value={target}
                        onChange={(e) => setTarget(e.target.value)}
                        className="min-w-0 flex-1 rounded bg-slate-800 px-2 py-2 text-sm"
                      >
                        {others.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      disabled={busy || me.cash < it.price}
                      onClick={async () => {
                        const tName =
                          it.target === "stock"
                            ? stockDef(stock).name
                            : it.target === "player"
                              ? others.find((p) => p.id === target)?.name
                              : "나";
                        if (!confirm(`${it.name}을(를) ${tName}에게 사용할까요? (${won(it.price)})`)) return;
                        if (await act("item", { item: it.id, stock, target })) {
                          toast(`${it.emoji} ${it.name} 사용!`);
                          setOpen(null);
                        }
                      }}
                      className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-40"
                    >
                      사용
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function IntelPanel({ view }: { view: GameView }) {
  return (
    <Card className="border-amber-800/60">
      <p className="mb-2 font-bold">🗂 내가 얻은 비밀 정보</p>
      <ul className="space-y-1 text-xs text-slate-300">
        {view.me!.intel.map((x, i) => (
          <li key={i}>
            <span className="text-slate-500">R{x.round}</span> {x.text}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function NewsFeed({ view }: { view: GameView }) {
  if (view.newsFeed.length === 0) return null;
  return (
    <Card>
      <p className="mb-2 font-bold">🗞 지난 뉴스</p>
      <ul className="max-h-64 space-y-1 overflow-y-auto text-xs">
        {view.newsFeed.map((n, i) => (
          <li key={i} className={n.good ? "text-red-300" : "text-sky-300"}>
            <span className="text-slate-500">R{n.round}</span> {n.good ? "📈" : "📉"} {n.text}
            {n.reversed && " 🔄"}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Players({ view }: { view: GameView }) {
  return (
    <Card>
      <p className="mb-2 font-bold">참가자 {view.players.length}명</p>
      <ul className="space-y-1 text-sm">
        {view.players.map((p) => (
          <li key={p.id}>
            {p.isHost && "👑 "}
            {p.name}
            {p.id === view.me?.id && <span className="ml-1 text-xs text-cyan-400">(나)</span>}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Ranking({ view }: { view: GameView }) {
  const ranked = [...view.players].sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <Card className="border-amber-600/60">
      <p className="mb-3 text-xl font-black">🏆 최종 순위</p>
      <div className="space-y-2">
        {ranked.map((p, i) => {
          const profit = (p.total ?? 0) - 100000;
          return (
            <div key={p.id} className={`rounded-xl px-3 py-2 ${i === 0 ? "bg-amber-500/15" : "bg-slate-950/60"}`}>
              <div className="flex items-center justify-between">
                <span className="font-bold">
                  {medals[i] ?? `${i + 1}.`} {p.name}
                  {p.id === view.me?.id && <span className="ml-1 text-xs text-cyan-400">(나)</span>}
                </span>
                <span className="text-right">
                  <span className="block font-mono font-bold">{won(p.total ?? 0)}</span>
                  <span className={`block font-mono text-xs ${upDown(profit)}`}>
                    {profit >= 0 ? "+" : ""}
                    {won(profit)}
                  </span>
                </span>
              </div>
              {p.shares && (
                <p className="mt-1 text-xs text-slate-400">
                  현금 {won(p.cash ?? 0)} ·{" "}
                  {STOCK_IDS.filter((id) => p.shares![id] > 0)
                    .map((id) => `${stockDef(id).name} ${p.shares![id]}주`)
                    .join(", ") || "주식 없음"}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function RulesBox({ open = false }: { open?: boolean }) {
  return (
    <details open={open} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
      <summary className="cursor-pointer font-bold">게임 방법</summary>
      <div className="mt-3">
        <Rules />
      </div>
    </details>
  );
}
