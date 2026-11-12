"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GAMES } from "./games";


/** 게임 첫 화면 위쪽의 게임 전환 탭 */
export function GameTabs() {
  const path = usePathname();
  return (
    <nav className="mx-auto flex max-w-xl gap-1 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/80 p-1">
      {GAMES.map((g) => {
        const active = path.startsWith(g.href);
        return (
          <Link
            key={g.href}
            href={g.href}
            className={`flex-1 shrink-0 whitespace-nowrap rounded-xl px-2.5 py-2 text-center text-xs font-bold transition sm:px-3 sm:text-sm ${
              active ? "bg-slate-100 text-slate-950" : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            }`}
          >
            {g.emoji} {g.name}
          </Link>
        );
      })}
    </nav>
  );
}
