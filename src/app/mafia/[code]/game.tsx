"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Chat } from "@/components/chat";
import { ROLES, type GameView, type Role } from "@/lib/mafia/game";
import { MafiaRules } from "../rules";

const noSubscribe = () => () => {};
type Act = (action: string, extra?: Record<string, unknown>) => Promise<boolean>;

export function MafiaGame({ code }: { code: string }) {
  const tokenKey = `mafia:token:${code}`;
  const storedToken = useSyncExternalStore(noSubscribe, () => localStorage.getItem(tokenKey) ?? "", () => null);
  const [joinedToken, setToken] = useState<string | null>(null);
  const token = joinedToken ?? storedToken;
  const [view, setView] = useState<GameView | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [toast, setToast] = useState<{ text: string; error: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const versionRef = useRef(-1);

  const applyView = useCallback((v: GameView) => {
    versionRef.current = v.version;
    setView(v);
  }, []);

  const showToast = useCallback((text: string, error = false) => {
    setToast({ text, error });
    setTimeout(() => setToast((t) => (t?.text === text ? null : t)), 2500);
  }, []);

  const poll = useCallback(async () => {
    if (token === null) return;
    try {
      const res = await fetch(`/api/mafia?code=${code}&token=${encodeURIComponent(token)}&v=${versionRef.current}`, {
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
    // 휴대폰 화면을 다시 켜거나 앱으로 돌아오면 바로 최신 상태로
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
        const res = await fetch("/api/mafia", {
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
        return false;
      } finally {
        setBusy(false);
      }
    },
    [code, token, tokenKey, applyView, showToast]
  );

  if (notFound)
    return (
      <Shell night={false}>
        <div className="py-20 text-center">
          <p className="text-xl font-bold">방 {code}을(를) 찾을 수 없습니다.</p>
          <Link href="/mafia" className="mt-4 inline-block text-rose-400 underline">
            처음으로
          </Link>
        </div>
      </Shell>
    );
  if (!view)
    return (
      <Shell night={false}>
        <p className="py-20 text-center text-slate-400">불러오는 중…</p>
      </Shell>
    );

  const me = view.me;
  const night = view.phase === "night";
  const chatDisabled =
    view.chatChannel === null ? (me ? "🌙 밤에는 조용히… 마피아만 대화할 수 있어요" : "참가자만 채팅할 수 있어요") : null;
  const chatTitle =
    view.chatChannel === "mafia" ? "🔪 마피아 채팅" : view.chatChannel === "dead" ? "👻 유령 채팅" : "💬 채팅";

  return (
    <Shell night={night}>
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
      {me && (
        <Chat
          messages={view.chat}
          meId={me.id}
          onSend={(text) => act("chat", { text })}
          title={chatTitle}
          subtitle={view.chatChannel === "mafia" ? "동료끼리만 보여요" : view.chatChannel === "dead" ? "죽은 사람끼리만" : "다 같이"}
          disabledReason={chatDisabled}
        />
      )}

      {view.phase === "lobby" ? (
        <Lobby view={view} act={act} busy={busy} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            {view.phase === "end" && <EndBanner view={view} />}
            {me?.role && <RoleCard view={view} />}
            <PhasePanel view={view} act={act} busy={busy} toast={showToast} />
            <PlayerGrid view={view} act={act} busy={busy} />
          </div>
          <div className="space-y-4">
            {me?.role === "police" && me.investigations.length > 0 && <Investigations view={view} />}
            <Log view={view} />
            <details className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <summary className="cursor-pointer font-bold">게임 방법</summary>
              <div className="mt-3">
                <MafiaRules />
              </div>
            </details>
          </div>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children, night }: { children: React.ReactNode; night: boolean }) {
  return (
    <main
      className={`min-h-screen px-3 py-4 pb-24 text-slate-100 transition-colors duration-700 sm:px-6 ${
        night ? "bg-gradient-to-b from-indigo-950 via-slate-950 to-black" : "bg-gradient-to-b from-amber-900/40 via-slate-950 to-slate-950"
      }`}
    >
      <div className="mx-auto max-w-5xl space-y-4">{children}</div>
    </main>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-800 bg-slate-900/80 p-4 ${className}`}>{children}</section>;
}

function TopBar({ view }: { view: GameView }) {
  const badge =
    view.phase === "night"
      ? `🌙 ${view.day}일차 밤`
      : view.phase === "day"
        ? `☀️ ${view.day}일차 낮`
        : view.phase === "vote"
          ? `🗳 ${view.day}일차 투표`
          : view.phase === "end"
            ? "🏁 게임 종료"
            : "대기실";
  const aliveCount = view.players.filter((p) => p.alive).length;
  return (
    <header className="sticky top-0 z-40 -mx-3 flex flex-wrap items-center justify-between gap-2 bg-slate-950/80 px-3 py-2 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="flex items-center gap-2">
        <Link href="/mafia" className="text-xl font-black">
          🔪 마피아
        </Link>
        <span className="rounded-md bg-slate-800 px-2 py-0.5 font-mono text-sm tracking-widest">{view.code}</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        {view.phase !== "lobby" && <span className="rounded-full bg-slate-800 px-3 py-1">생존 {aliveCount}명</span>}
        <span className="rounded-full bg-rose-500/20 px-3 py-1 font-bold text-rose-200">{badge}</span>
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
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
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
                className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-rose-500"
              />
              <button
                disabled={busy || !name.trim()}
                onClick={() => act("join", { name })}
                className="rounded-lg bg-rose-500 px-4 font-bold text-white disabled:opacity-50"
              >
                참가
              </button>
            </div>
          </Card>
        )}
        <Card>
          <p className="text-lg font-bold">친구들을 초대하세요</p>
          <p className="mt-1 text-sm text-slate-400">
            방 코드 <b className="font-mono text-white">{view.code}</b> · 최소 4명
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
          {n >= 4 && (
            <p className="mt-3 text-sm text-slate-300">
              이번 구성:{" "}
              {(Object.keys(view.roleCounts) as Role[])
                .filter((r) => view.roleCounts[r] > 0)
                .map((r) => `${ROLES[r].emoji} ${ROLES[r].name} ${view.roleCounts[r]}`)
                .join(" · ")}
            </p>
          )}
          <div className="mt-4">
            {me?.isHost ? (
              <button
                disabled={busy || n < 4}
                onClick={() => act("start")}
                className="rounded-lg bg-rose-500 px-5 py-2 font-bold text-white disabled:opacity-50"
              >
                {n < 4 ? `${4 - n}명 더 필요해요` : `게임 시작 (${n}명)`}
              </button>
            ) : (
              <p className="text-sm text-slate-400">방장이 게임을 시작하길 기다리는 중…</p>
            )}
          </div>
        </Card>
      </div>
      <Card>
        <p className="mb-2 font-bold">참가자 {n}명</p>
        <ul className="space-y-1 text-sm">
          {view.players.map((p) => (
            <li key={p.id}>
              {p.isHost && "👑 "}
              {p.name}
              {p.id === me?.id && <span className="ml-1 text-xs text-rose-300">(나)</span>}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function RoleCard({ view }: { view: GameView }) {
  const me = view.me!;
  const role = ROLES[me.role!];
  const [shown, setShown] = useState(false);
  const mates = view.players.filter((p) => p.isMafiaMate);
  return (
    <button
      onClick={() => setShown((s) => !s)}
      className="block w-full rounded-2xl border-2 bg-slate-900/90 p-4 text-left"
      style={{ borderColor: shown ? role.color : "#334155" }}
    >
      {shown ? (
        <div className="flex items-center gap-4">
          <span className="text-5xl">{role.emoji}</span>
          <div>
            <p className="text-xs text-slate-400">나의 역할 (탭해서 숨기기)</p>
            <p className="text-2xl font-black" style={{ color: role.color }}>
              {role.name}
              {!me.alive && <span className="ml-2 text-base text-slate-400">👻 사망</span>}
            </p>
            <p className="text-sm text-slate-300">{role.desc}</p>
            {mates.length > 0 && <p className="mt-1 text-sm text-rose-300">동료 마피아: {mates.map((m) => m.name).join(", ")}</p>}
          </div>
        </div>
      ) : (
        <p className="py-3 text-center font-bold text-slate-300">🃏 탭해서 내 역할 보기 (옆 사람 조심!)</p>
      )}
    </button>
  );
}

function PhasePanel({
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
  const me = view.me;
  const isHost = !!me?.isHost;
  const lastNight = [...view.log].reverse().find((l) => l.phase === "night" && l.day === view.day);
  const lastVoteLog = [...view.log].reverse().find((l) => l.phase === "vote");

  if (view.phase === "night") {
    const role = me?.alive ? me.role : null;
    let msg = "밤이 되었습니다. 모두 눈을 감으세요… 😴";
    if (role === "mafia") msg = view.mafiaTarget ? `🎯 오늘 밤 목표: ${name(view, view.mafiaTarget)} (동료와 상의해서 바꿀 수 있어요)` : "🔪 아래에서 제거할 사람을 고르세요";
    if (role === "doctor") msg = me?.nightPick ? `💉 ${name(view, me.nightPick)}님을 지키기로 했어요` : "💉 아래에서 지킬 사람을 고르세요";
    if (role === "police") {
      const inv = me?.investigations.find((x) => x.day === view.day);
      msg = inv ? `🚓 조사 결과: ${inv.name}님은 ${inv.isMafia ? "🔪 마피아입니다!" : "마피아가 아닙니다."}` : "🚓 아래에서 조사할 사람을 고르세요";
    }
    if (me && !me.alive) msg = "👻 당신은 죽었어요. 조용히 지켜보세요.";
    return (
      <Card className="border-indigo-800/70 bg-indigo-950/40">
        {lastVoteLog && lastVoteLog.day === view.day - 1 && <p className="mb-2 text-sm text-amber-200">🗳 {lastVoteLog.text}</p>}
        <p className="text-lg font-bold">🌙 {view.day}일차 밤</p>
        <p className="mt-1 text-slate-200">{msg}</p>
        {view.nightProgress && (
          <p className="mt-2 text-xs text-slate-400">
            밤 행동 {view.nightProgress.done}/{view.nightProgress.total} 완료 — 모두 끝나면 자동으로 아침이 와요
          </p>
        )}
        {isHost && (
          <button
            disabled={busy}
            onClick={() => {
              if (confirm("아직 행동하지 않은 사람이 있어도 아침으로 넘길까요?")) act("endNight");
            }}
            className="mt-3 rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-bold disabled:opacity-50"
          >
            👑 밤 강제 종료
          </button>
        )}
      </Card>
    );
  }

  if (view.phase === "day") {
    return (
      <Card className="border-amber-700/60">
        <p className="text-lg font-bold">☀️ {view.day}일차 아침</p>
        {lastNight && (
          <p className={`mt-1 text-lg font-bold ${lastNight.kind === "death" ? "text-rose-300" : "text-emerald-300"}`}>
            {lastNight.kind === "death" ? "💀 " : "🕊 "}
            {lastNight.text}
          </p>
        )}
        {(() => {
          const inv = me?.role === "police" ? me.investigations.find((x) => x.day === view.day) : null;
          return inv ? (
            <p className="mt-2 rounded-lg bg-sky-950/60 px-3 py-2 text-sm">
              🚓 어젯밤 조사 결과: {inv.name}님은 {inv.isMafia ? <b className="text-rose-400">🔪 마피아입니다!</b> : "마피아가 아닙니다."}
            </p>
          ) : null;
        })()}
        <p className="mt-2 text-sm text-slate-400">자유롭게 토론하세요. 누가 마피아일까요?</p>
        {isHost ? (
          <button
            disabled={busy}
            onClick={() => act("startVote")}
            className="mt-3 rounded-lg bg-amber-500 px-4 py-2 font-bold text-slate-950 disabled:opacity-50"
          >
            👑 투표 시작
          </button>
        ) : (
          <p className="mt-3 text-xs text-slate-500">토론이 끝나면 방장이 투표를 시작해요.</p>
        )}
      </Card>
    );
  }

  if (view.phase === "vote") {
    const living = view.players.filter((p) => p.alive);
    const voted = living.filter((p) => p.voted).length;
    return (
      <Card className="border-amber-600/70">
        <div className="flex items-center justify-between">
          <p className="text-lg font-bold">🗳 처형 투표</p>
          <span className="text-sm text-slate-400">
            {voted}/{living.length} 투표 완료
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-300">
          {!me?.alive
            ? "👻 죽은 사람은 투표할 수 없어요."
            : me.vote
              ? `✅ ${me.vote === "skip" ? "기권" : `${name(view, me.vote)}님`}에게 투표했어요 (다시 눌러서 바꿀 수 있어요)`
              : "아래에서 처형할 사람을 누르세요."}
        </p>
        {me?.alive && (
          <button
            disabled={busy}
            onClick={async () => {
              if (await act("vote", { target: "skip" })) toast("기권했어요");
            }}
            className={`mt-3 rounded-lg px-4 py-2 text-sm font-bold ${me.vote === "skip" ? "bg-slate-200 text-slate-950" : "bg-slate-700"}`}
          >
            🤷 기권
          </button>
        )}
        {isHost && (
          <button
            disabled={busy}
            onClick={() => {
              if (confirm("아직 투표하지 않은 사람은 기권으로 처리하고 마감할까요?")) act("endVote");
            }}
            className="ml-2 mt-3 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"
          >
            👑 투표 마감
          </button>
        )}
      </Card>
    );
  }

  return null;
}

function name(view: GameView, id: string | null) {
  return view.players.find((p) => p.id === id)?.name ?? "?";
}

function PlayerGrid({ view, act, busy }: { view: GameView; act: Act; busy: boolean }) {
  const me = view.me;
  const nightRole = view.phase === "night" && me?.alive ? me.role : null;
  const canNight = nightRole === "mafia" || nightRole === "doctor" || (nightRole === "police" && !me?.nightPick);
  const canVote = view.phase === "vote" && !!me?.alive;
  const votesFor = new Map<string, string[]>();
  if (view.lastVote && view.phase !== "vote") {
    for (const v of view.lastVote.votes) votesFor.set(v.target, [...(votesFor.get(v.target) ?? []), name(view, v.voter)]);
  }

  return (
    <Card>
      <p className="mb-3 font-bold">
        {canNight
          ? nightRole === "mafia"
            ? "🔪 제거할 사람 선택"
            : nightRole === "doctor"
              ? "💉 지킬 사람 선택"
              : "🚓 조사할 사람 선택"
          : canVote
            ? "🗳 처형할 사람 선택"
            : "플레이어"}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {view.players.map((p) => {
          const isMe = p.id === me?.id;
          const selectable =
            p.alive &&
            ((canNight &&
              !(nightRole === "mafia" && (p.role === "mafia" || p.isMafiaMate)) &&
              !(nightRole === "police" && isMe)) ||
              canVote);
          const picked =
            (view.phase === "night" && (nightRole === "mafia" ? view.mafiaTarget === p.id : me?.nightPick === p.id)) ||
            (view.phase === "vote" && me?.vote === p.id);
          const role = p.role ? ROLES[p.role] : null;
          return (
            <button
              key={p.id}
              disabled={!selectable || busy}
              onClick={() => act(canVote ? "vote" : "night", { target: p.id })}
              className={`relative rounded-xl border-2 p-3 text-left transition ${
                picked
                  ? "border-rose-400 bg-rose-500/20"
                  : selectable
                    ? "border-slate-700 bg-slate-950/60 hover:border-slate-400"
                    : "border-transparent bg-slate-950/40"
              } ${p.alive ? "" : "opacity-50"}`}
            >
              <p className="font-bold">
                {p.alive ? "🙂" : "💀"} {p.name}
                {isMe && <span className="ml-1 text-xs text-rose-300">(나)</span>}
              </p>
              <p className="text-xs text-slate-400">
                {p.isHost && "👑 방장 "}
                {role && (
                  <span style={{ color: role.color }}>
                    {role.emoji} {role.name}
                  </span>
                )}
                {p.isMafiaMate && " · 동료"}
              </p>
              {view.phase === "vote" && p.alive && (
                <span className={`absolute right-2 top-2 text-xs ${p.voted ? "text-emerald-400" : "text-slate-600"}`}>
                  {p.voted ? "✓" : "…"}
                </span>
              )}
              {votesFor.get(p.id) && (
                <p className="mt-1 text-[11px] text-amber-300">
                  지난 투표 {votesFor.get(p.id)!.length}표: {votesFor.get(p.id)!.join(", ")}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function Investigations({ view }: { view: GameView }) {
  return (
    <Card className="border-sky-800/70">
      <p className="mb-2 font-bold">🚓 내 조사 기록</p>
      <ul className="space-y-1 text-sm">
        {view.me!.investigations.map((x, i) => (
          <li key={i}>
            <span className="text-slate-500">{x.day}일차</span> {x.name} —{" "}
            {x.isMafia ? <b className="text-rose-400">🔪 마피아</b> : <span className="text-emerald-300">시민 팀</span>}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Log({ view }: { view: GameView }) {
  return (
    <Card>
      <p className="mb-2 font-bold">📜 기록</p>
      <ul className="max-h-72 space-y-1 overflow-y-auto text-sm">
        {[...view.log].reverse().map((l, i) => (
          <li
            key={i}
            className={l.kind === "death" ? "text-rose-300" : l.kind === "vote" ? "text-amber-200" : l.kind === "safe" ? "text-emerald-300" : "text-slate-400"}
          >
            {l.day > 0 && <span className="text-slate-500">{l.day}일차 {l.phase === "night" ? "밤" : "투표"} · </span>}
            {l.text}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function EndBanner({ view }: { view: GameView }) {
  const mafiaWin = view.winner === "mafia";
  const myTeam = view.me?.role ? ROLES[view.me.role].team : null;
  const iWon = myTeam && myTeam === view.winner;
  return (
    <Card className={mafiaWin ? "border-rose-600 bg-rose-950/50" : "border-emerald-600 bg-emerald-950/40"}>
      <p className="text-center text-3xl font-black">{mafiaWin ? "🔪 마피아 승리!" : "🎉 시민 승리!"}</p>
      {myTeam && <p className="mt-1 text-center text-lg">{iWon ? "🏆 당신의 팀이 이겼어요!" : "😢 아쉽게 졌어요"}</p>}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {view.players.map((p) => {
          const r = p.role ? ROLES[p.role] : null;
          return (
            <span key={p.id} className="rounded-lg bg-slate-950/70 px-3 py-1 text-sm">
              {p.alive ? "" : "💀 "}
              {p.name} <b style={{ color: r?.color }}>{r ? `${r.emoji} ${r.name}` : ""}</b>
            </span>
          );
        })}
      </div>
      <div className="mt-4 text-center">
        <Link href="/mafia" className="font-bold text-rose-300 underline">
          새 게임 만들기
        </Link>
      </div>
    </Card>
  );
}
