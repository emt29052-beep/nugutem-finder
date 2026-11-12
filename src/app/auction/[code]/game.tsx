"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Chat } from "@/components/chat";
import { COUNTDOWN_MS, type GameView } from "@/lib/auction/game";
import { AuctionRules } from "../rules";

const noSubscribe = () => () => {};
type Act = (action: string, extra?: Record<string, unknown>) => Promise<boolean>;

/** ms → "m:ss.d" */
function fmt(ms: number) {
  const t = Math.max(0, Math.floor(ms / 100));
  const m = Math.floor(t / 600);
  const s = Math.floor((t % 600) / 10);
  return `${m}:${String(s).padStart(2, "0")}.${t % 10}`;
}
const sec = (ms: number) => (Math.max(0, ms) / 1000).toFixed(1);

export function AuctionGame({ code }: { code: string }) {
  const tokenKey = `auction:token:${code}`;
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

  // 서버 시계 맞추기: 왕복 시간이 가장 짧았던 측정을 신뢰
  const clockRef = useRef({ offset: 0, rtt: Infinity });
  const syncClock = useCallback((serverNow: number, sent: number, recv: number) => {
    const rtt = recv - sent;
    const c = clockRef.current;
    if (rtt <= c.rtt * 1.5 || rtt < 150) {
      clockRef.current = { offset: serverNow - (sent + recv) / 2, rtt: Math.min(rtt, c.rtt) };
    }
  }, []);
  const serverNow = useCallback(() => Date.now() + clockRef.current.offset, []);

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
      const sent = Date.now();
      const res = await fetch(`/api/auction?code=${code}&token=${encodeURIComponent(token)}&v=${versionRef.current}`, {
        cache: "no-store",
      });
      const recv = Date.now();
      if (res.status === 404) return setNotFound(true);
      const data = await res.json();
      if (sentToken !== tokenRef.current) return;
      syncClock(data.view?.serverNow ?? data.serverNow, sent, recv);
      if (data.view) applyView(data.view);
    } catch {
      /* 다음 폴링에서 재시도 */
    }
  }, [code, token, applyView, syncClock]);

  useEffect(() => {
    const first = setTimeout(poll, 0);
    const id = setInterval(poll, 1000);
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
        const res = await fetch("/api/auction", {
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
          <Link href="/auction" className="mt-4 inline-block text-amber-400 underline">
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
      {view.phase === "round" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <LastResult view={view} />
            {me ? (
              <HoldButton key={view.round} view={view} act={act} serverNow={serverNow} />
            ) : (
              <Card>
                <p className="text-sm text-slate-400">관전 중이에요.</p>
              </Card>
            )}
          </div>
          <div className="space-y-4">
            <Scoreboard view={view} />
            {me?.isHost && <HostPanel view={view} act={act} busy={busy} serverNow={serverNow} />}
            <RulesBox />
          </div>
        </div>
      )}
      {view.phase === "end" && <EndScreen view={view} />}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-950/60 via-slate-950 to-slate-950 px-3 py-4 pb-24 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-4">{children}</div>
    </main>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-800 bg-slate-900/80 p-4 ${className}`}>{children}</section>;
}

function TopBar({ view }: { view: GameView }) {
  return (
    <header className="sticky top-0 z-40 -mx-3 flex flex-wrap items-center justify-between gap-2 bg-slate-950/80 px-3 py-2 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="flex items-center gap-2">
        <Link href="/auction" className="text-xl font-black">
          ⏱ 시간 경매
        </Link>
        <span className="rounded-md bg-slate-800 px-2 py-0.5 font-mono text-sm tracking-widest">{view.code}</span>
      </div>
      <span className="rounded-full bg-amber-500/20 px-3 py-1 text-sm font-bold text-amber-200">
        {view.phase === "lobby" ? "대기실" : view.phase === "end" ? "🏁 게임 종료" : `R${view.round} / ${view.totalRounds}`}
      </span>
    </header>
  );
}

function Lobby({ view, act, busy }: { view: GameView; act: Act; busy: boolean }) {
  const me = view.me;
  const [name, setName] = useState("");
  const url = useSyncExternalStore(noSubscribe, () => window.location.href, () => "");
  const [copied, setCopied] = useState(false);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
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
                className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-amber-500"
              />
              <button
                disabled={busy || !name.trim()}
                onClick={() => act("join", { name })}
                className="rounded-lg bg-amber-500 px-4 font-bold text-slate-950 disabled:opacity-50"
              >
                참가
              </button>
            </div>
          </Card>
        )}
        <Card>
          <p className="text-lg font-bold">친구들을 초대하세요</p>
          <p className="mt-1 text-sm text-slate-400">
            방 코드 <b className="font-mono text-white">{view.code}</b> · {view.totalRounds}라운드 · 시간 통장{" "}
            {view.startBank / 60000}분{view.hideBank ? " · 남은 시간 숨김" : ""}
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
                className="rounded-lg bg-amber-500 px-5 py-2 font-bold text-slate-950 disabled:opacity-50"
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
      <Card>
        <p className="mb-2 font-bold">참가자 {view.players.length}명</p>
        <ul className="space-y-1 text-sm">
          {view.players.map((p) => (
            <li key={p.id}>
              {p.isHost && "👑 "}
              {p.name}
              {p.id === me?.id && <span className="ml-1 text-xs text-amber-300">(나)</span>}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function LastResult({ view }: { view: GameView }) {
  const r = view.results[view.results.length - 1];
  if (!r) return null;
  const mine = r.winner === view.me?.id;
  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-center ${
        r.outcome === "win" ? (mine ? "border-emerald-500 bg-emerald-500/15" : "border-amber-600/60 bg-amber-500/10") : "border-slate-700 bg-slate-900/80"
      }`}
    >
      <p className="text-xs text-slate-400">R{r.round} 결과</p>
      <p className="text-xl font-black">
        {r.outcome === "win" ? (mine ? "🎉 내가 토큰 획득!" : `🏆 ${r.winnerName} 승리!`) : r.outcome === "tie" ? "🤝 동점! 아무도 토큰을 못 받았어요" : "🙅 아무도 입찰하지 않았어요"}
      </p>
    </div>
  );
}

type Stage = "idle" | "holding" | "auction" | "passed" | "submitting" | "submitted";

/**
 * 누르고 있는 동안 시간이 흐르는 경매 버튼.
 * 경매 시작 시각(roundStart + 5초)은 서버 시계 기준, 입찰 시간은 performance.now()로 정밀하게 잰다.
 */
function HoldButton({ view, act, serverNow }: { view: GameView; act: Act; serverNow: () => number }) {
  const me = view.me!;
  const roundStart = view.roundStart ?? 0;
  const auctionAt = roundStart + COUNTDOWN_MS;
  const [stage, setStage] = useState<Stage>(me.submitted ? "submitted" : "idle");
  const [now, setNow] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [myBid, setMyBid] = useState<number | null>(null);
  const stageRef = useRef<Stage>(stage);
  const auctionStartPerf = useRef(0);
  const btnRef = useRef<HTMLButtonElement>(null);

  const go = useCallback((s: Stage) => {
    stageRef.current = s;
    setStage(s);
  }, []);

  const submit = useCallback(
    async (ms: number) => {
      go("submitting");
      setMyBid(ms);
      const ok = await act("bid", { round: view.round, ms });
      go(ok ? (ms > 0 ? "submitted" : "passed") : "submitted");
    },
    [act, go, view.round]
  );

  const release = useCallback(() => {
    const s = stageRef.current;
    if (s === "holding") {
      // 카운트다운 전(준비 시간)에 떼면 다시 대기, 카운트다운 중에 떼면 포기
      if (serverNow() >= roundStart) submit(0);
      else go("idle");
    } else if (s === "auction") {
      const ms = Math.min(performance.now() - auctionStartPerf.current, me.bank);
      submit(ms);
    }
  }, [go, me.bank, roundStart, serverNow, submit]);

  // 프레임마다 시간 체크
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const t = serverNow();
      setNow(t);
      const s = stageRef.current;
      if (s === "holding" && t >= auctionAt) {
        auctionStartPerf.current = performance.now() - (t - auctionAt);
        go("auction");
        navigator.vibrate?.(60);
      } else if (s === "idle" && t >= auctionAt) {
        submit(0); // 안 누르고 있었으면 자동 포기
      } else if (s === "auction") {
        const e = performance.now() - auctionStartPerf.current;
        setElapsed(e);
        if (e >= me.bank) submit(me.bank); // 시간 다 씀
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [auctionAt, go, me.bank, serverNow, submit]);

  // 화면을 벗어나면 손 뗀 것으로 처리
  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && release();
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [release]);

  const inPrep = now < roundStart;
  const countdown = Math.ceil((auctionAt - now) / 1000);
  const showBank = !view.hideBank || stage === "auction";
  const bankNow = stage === "auction" ? me.bank - elapsed : me.bank;

  let title = "";
  let sub = "";
  if (stage === "idle") {
    title = inPrep ? "버튼을 꾹 누르고 기다리세요" : `${Math.max(countdown, 0)}`;
    sub = inPrep ? `${Math.ceil((roundStart - now) / 1000)}초 뒤 카운트다운 시작` : "지금 누르지 않으면 이번 라운드는 포기";
  } else if (stage === "holding") {
    title = inPrep ? "준비!" : `${Math.max(countdown, 0)}`;
    sub = inPrep ? "카운트다운이 끝날 때까지 누르고 있으면 경매 참가" : "포기하려면 지금 손을 떼세요";
  } else if (stage === "auction") {
    title = `${sec(elapsed)}초`;
    sub = "누르는 동안 시간이 줄어요. 손을 떼면 입찰!";
  } else if (stage === "passed") {
    title = "이번 라운드 포기";
    sub = "다른 사람들을 기다리는 중…";
  } else {
    title = myBid !== null && myBid > 0 ? `${sec(myBid)}초 입찰` : me.bids[view.round - 1] ? `${sec(me.bids[view.round - 1])}초 입찰` : "제출 완료";
    sub = "다른 사람들이 손을 뗄 때까지 기다리는 중…";
  }

  const active = stage === "holding" || stage === "auction";
  const canPress = (stage === "idle" || stage === "holding") && now < auctionAt;

  return (
    <Card className="select-none">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span>
          🪙 내 토큰 <b className="text-amber-300">{me.tokens}</b>
        </span>
        <span className="font-mono">
          ⏳ 내 시간 <b className={showBank ? "" : "text-slate-500"}>{showBank ? fmt(bankNow) : "?:??.?"}</b>
        </span>
      </div>
      <div className="flex flex-col items-center gap-4 py-2">
        <p className={`text-center font-black ${stage === "auction" ? "font-mono text-5xl text-amber-300" : "text-3xl"}`}>{title}</p>
        <p className="text-center text-sm text-slate-400">{sub}</p>
        <button
          ref={btnRef}
          disabled={!canPress && !active}
          onPointerDown={(e) => {
            if (!canPress || stageRef.current !== "idle") return;
            btnRef.current?.setPointerCapture(e.pointerId);
            go("holding");
          }}
          onPointerUp={release}
          onPointerCancel={release}
          onContextMenu={(e) => e.preventDefault()}
          style={{ touchAction: "none", WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
          className={`h-52 w-52 rounded-full border-8 text-2xl font-black shadow-2xl transition-transform ${
            stage === "auction"
              ? "scale-95 animate-pulse border-amber-200 bg-amber-500 text-slate-950 shadow-amber-500/40"
              : stage === "holding"
                ? "scale-95 border-sky-200 bg-sky-500 text-white"
                : canPress
                  ? "border-slate-600 bg-slate-800 text-slate-100 active:scale-95"
                  : "border-slate-800 bg-slate-900 text-slate-600"
          }`}
        >
          {stage === "auction" ? "입찰 중" : stage === "holding" ? "누르는 중" : canPress ? "꾹 누르기" : "대기"}
        </button>
      </div>
    </Card>
  );
}

function Scoreboard({ view }: { view: GameView }) {
  const sorted = [...view.players].sort((a, b) => b.tokens - a.tokens);
  return (
    <Card>
      <p className="mb-2 font-bold">🪙 토큰 현황</p>
      <ul className="space-y-1 text-sm">
        {sorted.map((p) => (
          <li key={p.id} className="flex items-center justify-between">
            <span>
              {p.isHost && "👑 "}
              {p.name}
              {p.id === view.me?.id && <span className="ml-1 text-xs text-amber-300">(나)</span>}
            </span>
            <span className="font-mono font-bold text-amber-300">{"🪙".repeat(Math.min(p.tokens, 8))}{p.tokens > 8 ? ` ${p.tokens}` : p.tokens === 0 ? "0" : ""}</span>
          </li>
        ))}
      </ul>
      {view.results.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1 border-t border-slate-800 pt-3 text-[11px]">
          {view.results.map((r) => (
            <span key={r.round} className="rounded bg-slate-950/70 px-1.5 py-0.5 text-slate-300">
              R{r.round} {r.outcome === "win" ? r.winnerName : r.outcome === "tie" ? "동점" : "–"}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

function HostPanel({ view, act, busy, serverNow }: { view: GameView; act: Act; busy: boolean; serverNow: () => number }) {
  return (
    <Card className="border-amber-700/50">
      <p className="text-sm font-bold text-amber-300">👑 방장 메뉴</p>
      <p className="mt-1 text-xs text-slate-400">
        누군가 연결이 끊겨 라운드가 안 끝날 때만 쓰세요. 아직 안 뗀 사람은 포기로 처리돼요.
      </p>
      <button
        disabled={busy}
        onClick={() => {
          const started = view.roundStart !== null && serverNow() > view.roundStart + COUNTDOWN_MS;
          if (!started) return alert("경매가 시작된 뒤에 쓸 수 있어요.");
          if (confirm("이번 라운드를 강제로 마감할까요?")) act("forceClose");
        }}
        className="mt-3 w-full rounded-lg bg-slate-700 py-2 text-sm font-bold disabled:opacity-50"
      >
        라운드 강제 마감
      </button>
    </Card>
  );
}

function EndScreen({ view }: { view: GameView }) {
  const ranked = [...view.players].sort((a, b) => b.tokens - a.tokens || (b.bank ?? 0) - (a.bank ?? 0));
  return (
    <div className="space-y-4">
      <Card className="border-amber-500/70">
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
                {p.id === view.me?.id && <span className="ml-1 text-xs text-amber-300">(나)</span>}
              </span>
              <span className="text-right text-sm">
                <b className="text-amber-300">🪙 {p.tokens}</b>
                <span className="ml-2 font-mono text-slate-400">남은 {fmt(p.bank ?? 0)}</span>
              </span>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <p className="mb-2 font-bold">🔍 전체 입찰 기록 공개 (초)</p>
        <div className="overflow-x-auto">
          <table className="w-full text-center font-mono text-xs">
            <thead>
              <tr className="text-slate-400">
                <th className="px-1 py-1 text-left">R</th>
                {view.players.map((p) => (
                  <th key={p.id} className="whitespace-nowrap px-1 py-1">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view.results.map((r) => (
                <tr key={r.round} className="border-t border-slate-800">
                  <td className="px-1 py-1 text-left text-slate-500">{r.round}</td>
                  {view.players.map((p) => {
                    const b = p.bids?.[r.round - 1] ?? 0;
                    return (
                      <td key={p.id} className={`px-1 py-1 ${r.winner === p.id ? "font-bold text-amber-300" : b ? "" : "text-slate-600"}`}>
                        {b ? sec(b) : "–"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">노란색 = 그 라운드 승리, – = 포기</p>
      </Card>
      <Card>
        <Link href="/auction" className="font-bold text-amber-300 underline">
          새 게임 만들기
        </Link>
      </Card>
    </div>
  );
}

function RulesBox({ open = false }: { open?: boolean }) {
  return (
    <details open={open} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
      <summary className="cursor-pointer font-bold">게임 방법</summary>
      <div className="mt-3">
        <AuctionRules />
      </div>
    </details>
  );
}
