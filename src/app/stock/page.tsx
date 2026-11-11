"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Rules } from "./rules";

export default function StockHome() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [rounds, setRounds] = useState(5);
  const [cards, setCards] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(body: Record<string, unknown>) {
    if (!name.trim()) return setError("닉네임을 입력해주세요.");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem(`stock:token:${data.code}`, data.token);
      router.push(`/stock/${data.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-xl space-y-6">
        <header className="text-center">
          <p className="text-sm tracking-[0.3em] text-emerald-400">FRIENDS ONLY · PARTY GAME</p>
          <h1 className="mt-2 text-4xl font-black">📈 블러프 마켓</h1>
          <p className="mt-2 text-slate-400">비밀 정보 · 협상 · 배신의 주식 게임 (2~10명)</p>
        </header>

        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <label className="block">
            <span className="text-sm text-slate-400">닉네임</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={12}
              placeholder="예) 주식왕"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3 rounded-xl bg-slate-950/60 p-4">
              <h2 className="font-bold">방 만들기</h2>
              <label className="flex items-center justify-between text-sm">
                라운드 수
                <select
                  value={rounds}
                  onChange={(e) => setRounds(Number(e.target.value))}
                  className="rounded bg-slate-800 px-2 py-1"
                >
                  {[3, 4, 5, 6, 7, 8, 10].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center justify-between text-sm">
                1인당 정보 카드
                <select
                  value={cards}
                  onChange={(e) => setCards(Number(e.target.value))}
                  className="rounded bg-slate-800 px-2 py-1"
                >
                  {[1, 2, 3].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <button
                disabled={busy}
                onClick={() => send({ action: "create", rounds, cards })}
                className="w-full rounded-lg bg-emerald-500 py-2 font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
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
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-center font-mono text-lg tracking-widest outline-none focus:border-emerald-500"
              />
              <button
                disabled={busy || code.length < 4}
                onClick={() => send({ action: "join", code })}
                className="w-full rounded-lg bg-sky-500 py-2 font-bold text-slate-950 hover:bg-sky-400 disabled:opacity-50"
              >
                참가하기
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-rose-400">{error}</p>}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-3 text-lg font-bold">게임 방법</h2>
          <Rules />
        </section>
      </div>
    </main>
  );
}
