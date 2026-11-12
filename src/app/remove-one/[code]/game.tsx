"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Chat } from "@/components/chat";
import { CARDS, CYCLE, type GameView } from "@/lib/removeone/game";
import { RemoveOneRules } from "../rules";

const noSubscribe = () => () => {};
type Act = (action: string, extra?: Record<string, unknown>) => Promise<boolean>;

export function RemoveOneGame({ code }: { code: string }) {
  const tokenKey = `removeone:token:${code}`;
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
      const res = await fetch(`/api/removeone?code=${code}&token=${encodeURIComponent(token)}&v=${versionRef.current}`, {
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
        const res = await fetch("/api/removeone", {
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
          <Link href="/remove-one" className="mt-4 inline-block text-emerald-400 underline">
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
      {(view.phase === "pick" || view.phase === "choose") && (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {view.lastResult && <ResultCard view={view} result={view.lastResult} />}
            {me?.active ? (
              view.phase === "pick" ? (
                <PickPanel key={view.round} view={view} act={act} busy={busy} />
              ) : (
                <ChoosePanel view={view} act={act} busy={busy} />
              )
            ) : (
              <Card>
                <p className="text-sm text-slate-300">{me ? "🎉 생존 확정! 남은 사람들의 승부를 구경하세요." : "관전 중이에요."}</p>
              </Card>
            )}
            {view.phase === "choose" && <PairsBoard view={view} />}
          </div>
          <div className="space-y-4">
            <Scoreboard view={view} />
            {me?.isHost && <HostPanel view={view} act={act} busy={busy} />}
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
    <main className="min-h-screen bg-gradient-to-b from-emerald-950/60 via-slate-950 to-slate-950 px-3 py-4 pb-24 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-4">{children}</div>
    </main>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-800 bg-slate-900/80 p-4 ${className}`}>{children}</section>;
}

const nameOf = (view: GameView, id: string | null) => view.players.find((p) => p.id === id)?.name ?? "?";

function TopBar({ view }: { view: GameView }) {
  const deck = Math.floor((view.round - 1) / CYCLE) + 1;
  const badge =
    view.phase === "lobby"
      ? "대기실"
      : view.phase === "end"
        ? "🏁 게임 종료"
        : `R${view.round}/${view.totalRounds} · ${view.phase === "pick" ? "카드 내기" : "하나 빼기"}`;
  return (
    <header className="sticky top-0 z-40 -mx-3 flex flex-wrap items-center justify-between gap-2 bg-slate-950/80 px-3 py-2 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="flex items-center gap-2">
        <Link href="/remove-one" className="text-xl font-black">
          ✌️ 하나 빼기
        </Link>
        <span className="rounded-md bg-slate-800 px-2 py-0.5 font-mono text-sm tracking-widest">{view.code}</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        {view.phase !== "lobby" && view.phase !== "end" && (
          <span className="rounded-full bg-slate-800 px-3 py-1">
            덱 {deck}/{Math.ceil(view.totalRounds / CYCLE)}
          </span>
        )}
        <span className="rounded-full bg-emerald-500/20 px-3 py-1 font-bold text-emerald-200">{badge}</span>
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
                className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-emerald-500"
              />
              <button
                disabled={busy || !name.trim()}
                onClick={() => act("join", { name })}
                className="rounded-lg bg-emerald-500 px-4 font-bold text-slate-950 disabled:opacity-50"
              >
                참가
              </button>
            </div>
          </Card>
        )}
        <Card>
          <p className="text-lg font-bold">친구들을 초대하세요</p>
          <p className="mt-1 text-sm text-slate-400">
            방 코드 <b className="font-mono text-white">{view.code}</b> · {view.totalRounds}라운드
            {view.survival ? " · 생존 모드" : ""} · 최소 3명
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
                className="rounded-lg bg-emerald-500 px-5 py-2 font-bold text-slate-950 disabled:opacity-50"
              >
                {n < 3 ? `${3 - n}명 더 필요해요` : `게임 시작 (${n}명)`}
              </button>
            ) : (
              <p className="text-sm text-slate-400">방장이 게임을 시작하길 기다리는 중…</p>
            )}
          </div>
        </Card>
        <RulesBox open />
      </div>
      <Card>
        <p className="mb-2 font-bold">참가자 {n}명</p>
        <ul className="space-y-1 text-sm">
          {view.players.map((p) => (
            <li key={p.id}>
              {p.isHost && "👑 "}
              {p.name}
              {p.id === me?.id && <span className="ml-1 text-xs text-emerald-300">(나)</span>}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function NumCard({
  n,
  state = "normal",
  onClick,
  size = "md",
}: {
  n: number;
  state?: "normal" | "selected" | "used" | "resting" | "void" | "win" | "dim";
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
}) {
  const sz = size === "lg" ? "h-28 w-20 text-5xl" : size === "sm" ? "h-10 w-8 text-lg" : "h-20 w-14 text-3xl";
  const st = {
    normal: "border-slate-500 bg-slate-100 text-slate-900",
    selected: "border-emerald-400 bg-emerald-300 text-slate-950 -translate-y-2 shadow-lg shadow-emerald-500/40",
    used: "border-slate-800 bg-slate-900 text-slate-700 line-through",
    resting: "border-slate-700 bg-slate-800 text-slate-500",
    void: "border-rose-800 bg-rose-950 text-rose-400 line-through",
    win: "border-amber-300 bg-amber-300 text-slate-950 shadow-lg shadow-amber-500/40",
    dim: "border-slate-700 bg-slate-700 text-slate-300",
  }[state];
  return (
    <button
      type="button"
      disabled={!onClick}
      onClick={onClick}
      className={`relative flex shrink-0 items-center justify-center rounded-xl border-2 font-black transition ${sz} ${st}`}
    >
      {n}
      {state === "resting" && <span className="absolute bottom-1 text-[9px] font-bold no-underline">휴식</span>}
    </button>
  );
}

function PickPanel({ view, act, busy }: { view: GameView; act: Act; busy: boolean }) {
  const me = view.me!;
  const [sel, setSel] = useState<number[]>([]);
  const waiting = view.players.filter((p) => p.survivedAt === null && !p.ready).length;

  if (me.pair) {
    return (
      <Card>
        <p className="font-bold">✅ 제출 완료</p>
        <div className="mt-3 flex gap-3">
          <NumCard n={me.pair[0]} state="dim" />
          <NumCard n={me.pair[1]} state="dim" />
        </div>
        <p className="mt-3 text-sm text-slate-400">다른 사람들이 고르는 중… ({waiting}명 남음)</p>
      </Card>
    );
  }

  const toggle = (c: number) =>
    setSel((s) => (s.includes(c) ? s.filter((x) => x !== c) : s.length < 2 ? [...s, c] : [s[1], c]));

  return (
    <Card>
      <p className="font-bold">🃏 낼 카드 2장을 고르세요</p>
      <p className="mt-1 text-xs text-slate-400">고른 2장은 모두에게 공개돼요. 그다음 둘 중 하나를 빼요.</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {CARDS.map((c) => {
          const inHand = me.hand.includes(c);
          const resting = me.resting === c;
          const usable = inHand && !resting;
          return (
            <NumCard
              key={c}
              n={c}
              state={!inHand ? "used" : resting ? "resting" : sel.includes(c) ? "selected" : "normal"}
              onClick={usable ? () => toggle(c) : undefined}
            />
          );
        })}
      </div>
      <button
        disabled={busy || sel.length !== 2}
        onClick={() => act("pick", { cards: sel })}
        className="mt-5 w-full rounded-xl bg-emerald-500 py-3 text-lg font-black text-slate-950 disabled:opacity-40"
      >
        {sel.length === 2 ? `${Math.min(...sel)}, ${Math.max(...sel)} 내기` : `${2 - sel.length}장 더 고르세요`}
      </button>
    </Card>
  );
}

function ChoosePanel({ view, act, busy }: { view: GameView; act: Act; busy: boolean }) {
  const me = view.me!;
  const pair = me.pair!;
  const waiting = view.players.filter((p) => p.survivedAt === null && !p.ready).length;
  return (
    <Card className="border-emerald-700/60">
      <p className="font-bold">✌️ 하나를 빼세요 — 남길 카드를 누르세요</p>
      <p className="mt-1 text-xs text-slate-400">아래에서 다른 사람들의 카드를 보고 결정하세요. 선택은 비밀이에요.</p>
      <div className="mt-4 flex justify-center gap-6">
        {[0, 1].map((side) => (
          <div key={side} className="flex flex-col items-center gap-2">
            <NumCard
              n={pair[side]}
              size="lg"
              state={me.keep === null ? "normal" : me.keep === side ? "win" : "used"}
              onClick={me.keep === null && !busy ? () => act("keep", { side }) : undefined}
            />
            <span className="text-xs text-slate-400">{me.keep === side ? "남김" : me.keep === null ? "남기기" : "뺌"}</span>
          </div>
        ))}
      </div>
      {me.keep !== null && <p className="mt-3 text-center text-sm text-slate-400">다른 사람들이 고르는 중… ({waiting}명 남음)</p>}
    </Card>
  );
}

function PairsBoard({ view }: { view: GameView }) {
  const players = view.players.filter((p) => p.survivedAt === null && p.pair);
  return (
    <Card>
      <p className="mb-3 font-bold">👀 모두의 후보 카드</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {players.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-xl bg-slate-950/60 px-3 py-2">
            <span className="truncate text-sm font-bold">
              {p.name}
              {p.id === view.me?.id && <span className="ml-1 text-xs text-emerald-300">(나)</span>}
            </span>
            <span className="flex items-center gap-1">
              <NumCard n={p.pair![0]} size="sm" />
              <NumCard n={p.pair![1]} size="sm" />
              <span className={`ml-1 text-xs ${p.ready ? "text-emerald-400" : "text-slate-600"}`}>{p.ready ? "✓" : "…"}</span>
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ResultCard({ view, result }: { view: GameView; result: NonNullable<GameView["lastResult"]> }) {
  const mine = result.winner === view.me?.id;
  const sorted = [...result.plays].sort((a, b) => a.kept - b.kept);
  return (
    <Card className={result.winner ? (mine ? "border-emerald-500" : "border-amber-600/60") : ""}>
      <p className="text-xs text-slate-400">R{result.round} 결과</p>
      <p className="text-xl font-black">
        {result.winner
          ? mine
            ? `🎉 내가 ${result.points}로 승리! (+${result.points}점, 토큰 +1)`
            : `🏆 ${nameOf(view, result.winner)} 승리 — ${result.points}`
          : "💥 전부 겹쳐서 승자 없음!"}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {sorted.map((x) => {
          const st = result.winner === x.playerId ? "win" : result.voided.includes(x.kept) ? "void" : "dim";
          return (
            <div key={x.playerId} className="flex flex-col items-center gap-1">
              <NumCard n={x.kept} size="sm" state={st} />
              <span className="max-w-14 truncate text-[10px] text-slate-400">{nameOf(view, x.playerId)}</span>
            </div>
          );
        })}
      </div>
      {result.voided.length > 0 && <p className="mt-2 text-xs text-rose-300">겹쳐서 무효: {result.voided.join(", ")}</p>}
      {result.checkpoint && (
        <div className="mt-3 rounded-lg bg-slate-950/60 px-3 py-2 text-sm">
          {result.checkpoint.final ? (
            <p className="font-bold">🏁 최종 생존 판정!</p>
          ) : (
            <p className="font-bold text-emerald-300">🛟 생존 판정: {nameOf(view, result.checkpoint.survivor)} 생존 확정!</p>
          )}
          <p className="mt-1 text-xs text-slate-400">
            {result.checkpoint.scores.map((s) => `${nameOf(view, s.playerId)} ${s.total}`).join(" · ")} (점수+토큰)
          </p>
          {!result.checkpoint.final && <p className="text-xs text-slate-500">나머지는 점수 0으로 초기화 (토큰은 유지)</p>}
        </div>
      )}
    </Card>
  );
}

function Scoreboard({ view }: { view: GameView }) {
  const sorted = [...view.players].sort(
    (a, b) => (a.survivedAt ?? 999) - (b.survivedAt ?? 999) || b.score + b.tokens - (a.score + a.tokens)
  );
  return (
    <Card>
      <p className="mb-2 font-bold">📊 점수</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-500">
            <th className="text-left font-normal">이름</th>
            <th className="font-normal">점수</th>
            <th className="font-normal">토큰</th>
            <th className="font-normal">휴식</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr key={p.id} className={p.survivedAt ? "text-slate-500" : ""}>
              <td className="py-0.5">
                {p.survivedAt ? "🛟 " : p.isHost ? "👑 " : ""}
                {p.name}
                {p.id === view.me?.id && <span className="ml-1 text-xs text-emerald-300">(나)</span>}
              </td>
              <td className="text-center font-mono">{p.score}</td>
              <td className="text-center font-mono text-amber-300">{p.tokens}</td>
              <td className="text-center font-mono text-slate-500">{p.resting ?? "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-slate-500">휴식 = 지난 라운드에 뺀 카드 (이번 라운드엔 못 냄)</p>
    </Card>
  );
}

function HostPanel({ view, act, busy }: { view: GameView; act: Act; busy: boolean }) {
  return (
    <Card className="border-amber-700/50">
      <p className="text-sm font-bold text-amber-300">👑 방장 메뉴</p>
      <p className="mt-1 text-xs text-slate-400">
        누가 자리를 비웠을 때만 쓰세요. 아직 안 한 사람은 {view.phase === "pick" ? "카드 2장이" : "카드가"} 무작위로 정해져요.
      </p>
      <button
        disabled={busy}
        onClick={() => {
          if (confirm("안 고른 사람은 무작위로 정하고 진행할까요?")) act("force");
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
      <Card className="border-emerald-500/70">
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
                {p.id === view.me?.id && <span className="ml-1 text-xs text-emerald-300">(나)</span>}
              </span>
              <span className="text-right text-sm">
                {view.survival ? (
                  p.survivedAt ? (
                    <span className="text-emerald-300">R{p.survivedAt} 생존</span>
                  ) : (
                    <span className="text-rose-300">탈락</span>
                  )
                ) : (
                  <b>{p.score + p.tokens}점</b>
                )}
                <span className="ml-2 text-xs text-slate-400">
                  (점수 {p.score} · 토큰 {p.tokens})
                </span>
              </span>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <p className="mb-2 font-bold">📜 라운드 기록</p>
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
                    const x = r.plays.find((y) => y.playerId === p.id);
                    if (!x) return <td key={p.id} className="text-slate-700">·</td>;
                    const cls = r.winner === p.id ? "font-bold text-amber-300" : r.voided.includes(x.kept) ? "text-rose-400 line-through" : "";
                    return (
                      <td key={p.id} className="whitespace-nowrap px-1 py-1">
                        <span className={cls}>{x.kept}</span>
                        <span className="text-slate-600"> ({x.pair.join("/")})</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">노란색 = 승리, 빨간 줄 = 겹쳐서 무효, 괄호 = 냈던 2장</p>
      </Card>
      <Card>
        <Link href="/remove-one" className="font-bold text-emerald-300 underline">
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
        <RemoveOneRules />
      </div>
    </details>
  );
}
