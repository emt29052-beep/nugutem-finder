import Link from "next/link";
import type { Metadata } from "next";
import { GAMES } from "@/components/games";

export const metadata: Metadata = { title: "친구들이랑 게임", description: "친구들과 휴대폰으로 같이 하는 파티 게임 모음" };

export default function GamesHub() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-950 via-slate-950 to-slate-950 px-4 py-12 text-slate-100">
      <div className="mx-auto max-w-xl space-y-6">
        <header className="text-center">
          <h1 className="text-4xl font-black">🎲 친구들이랑 게임</h1>
          <p className="mt-2 text-slate-400">방을 만들고 코드를 공유하면 각자 휴대폰으로 같이 할 수 있어요</p>
        </header>
        <div className="space-y-3">
          {GAMES.map((g) => (
            <Link
              key={g.href}
              href={g.href}
              className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 transition hover:border-slate-600 hover:bg-slate-900"
            >
              <span className="text-5xl">{g.emoji}</span>
              <span className="flex-1">
                <span className="block text-xl font-black">{g.name}</span>
                <span className="block text-sm text-slate-400">{g.desc}</span>
                <span className="mt-1 inline-block rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{g.players}</span>
              </span>
              <span className="text-2xl text-slate-500">→</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
