"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GameTabs } from "@/components/game-tabs";
import { DoubtRules } from "./rules";

export default function DoubtHome() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [hands, setHands] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(body: Record<string, unknown>) {
    if (!name.trim()) return setError("닉네임을 입력해주세요.");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/doubt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem(`doubt:token:${data.code}`, data.token);
      router.push(`/doubt/${data.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-fuchsia-950/70 via-slate-950 to-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-xl space-y-6">
        <GameTabs />
        <header className="text-center">
          <p className="text-sm tracking-[0.3em] text-fuchsia-400">DOUBT & BET</p>
          <h1 className="mt-2 text-4xl font-black">🃏 다우트 앤 벳</h1>
          <p className="mt-2 text-slate-400">전체 카드에 ○색이 몇 장? 예측하고, 의심하고, 베팅하라 (3~10명)</p>
        </header>
        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <label className="block">
            <span className="text-sm text-slate-400">닉네임</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={12}
              placeholder="예) 포커페이스"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-fuchsia-500"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3 rounded-xl bg-slate-950/60 p-4">
              <h2 className="font-bold">방 만들기</h2>
              <label className="flex items-center justify-between text-sm">
                대결 횟수
                <select value={hands} onChange={(e) => setHands(Number(e.target.value))} className="rounded bg-slate-800 px-2 py-1">
                  {[5, 10, 15, 20].map((n) => (
                    <option key={n} value={n}>
                      {n}판
                    </option>
                  ))}
                </select>
              </label>
              <button
                disabled={busy}
                onClick={() => send({ action: "create", hands })}
                className="w-full rounded-lg bg-fuchsia-500 py-2 font-bold text-white hover:bg-fuchsia-400 disabled:opacity-50"
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
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-center font-mono text-lg tracking-widest outline-none focus:border-fuchsia-500"
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
          <DoubtRules />
        </section>
      </div>
    </main>
  );
}
