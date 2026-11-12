"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GameTabs } from "@/components/game-tabs";
import { MafiaRules } from "./rules";

export default function MafiaHome() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(body: Record<string, unknown>) {
    if (!name.trim()) return setError("닉네임을 입력해주세요.");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/mafia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem(`mafia:token:${data.code}`, data.token);
      router.push(`/mafia/${data.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-950/70 via-slate-950 to-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-xl space-y-6">
        <GameTabs />
        <header className="text-center">
          <p className="text-sm tracking-[0.3em] text-rose-400">WHO IS THE MAFIA?</p>
          <h1 className="mt-2 text-4xl font-black">🔪 마피아</h1>
          <p className="mt-2 text-slate-400">밤에는 몰래 제거, 낮에는 토론과 투표 (4~12명)</p>
        </header>

        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <label className="block">
            <span className="text-sm text-slate-400">닉네임</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={12}
              placeholder="예) 셜록"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-rose-500"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3 rounded-xl bg-slate-950/60 p-4">
              <h2 className="font-bold">방 만들기</h2>
              <p className="text-xs text-slate-400">방장이 낮 토론이 끝나면 투표를 시작해요.</p>
              <button
                disabled={busy}
                onClick={() => send({ action: "create" })}
                className="w-full rounded-lg bg-rose-500 py-2 font-bold text-white hover:bg-rose-400 disabled:opacity-50"
              >
                방 만들기
              </button>
            </div>
            <div className="space-y-3 rounded-xl bg-slate-950/60 p-4">
              <h2 className="font-bold">방 참가하기</h2>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={4}
                placeholder="방 코드 4자리"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-center font-mono text-lg tracking-widest outline-none focus:border-rose-500"
              />
              <button
                disabled={busy || code.length < 4}
                onClick={() => send({ action: "join", code })}
                className="w-full rounded-lg bg-emerald-500 py-2 font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                참가하기
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-rose-400">{error}</p>}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <h2 className="mb-3 text-lg font-bold">게임 방법</h2>
          <MafiaRules />
        </section>
      </div>
    </main>
  );
}
