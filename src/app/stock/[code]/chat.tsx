"use client";

import { useEffect, useRef, useState } from "react";
import type { GameView } from "@/lib/stock/game";

type Act = (action: string, extra?: Record<string, unknown>) => Promise<boolean>;

export function Chat({ view, act }: { view: GameView; act: Act }) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(0);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const lastId = view.chat[view.chat.length - 1]?.id ?? 0;
  const unread = open ? 0 : view.chat.filter((m) => m.id > seen && m.playerId !== view.me?.id).length;

  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [open, lastId]);

  function toggle() {
    setSeen(lastId);
    setOpen((o) => !o);
  }

  async function send() {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    if (await act("chat", { text: t })) setText("");
    setSending(false);
  }

  return (
    <>
      <button
        onClick={toggle}
        aria-label="채팅"
        className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500 text-2xl shadow-2xl shadow-cyan-900/50"
      >
        {open ? "✕" : "💬"}
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 min-w-6 rounded-full bg-rose-500 px-1.5 text-center text-xs font-bold leading-6 text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 bottom-20 z-50 flex h-[60vh] max-h-[520px] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl sm:left-auto sm:right-4 sm:w-96">
          <div className="border-b border-slate-800 px-4 py-2 text-sm font-bold">💬 채팅 <span className="font-normal text-slate-500">· 거짓말도 자유!</span></div>
          <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {view.chat.length === 0 && <p className="py-8 text-center text-sm text-slate-500">아직 메시지가 없어요</p>}
            {view.chat.map((m) => {
              const mine = m.playerId === view.me?.id;
              return (
                <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                  {!mine && <span className="mb-0.5 text-[11px] text-slate-400">{m.name}</span>}
                  <span
                    className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3 py-1.5 text-sm ${
                      mine ? "rounded-br-sm bg-cyan-500 text-slate-950" : "rounded-bl-sm bg-slate-800 text-slate-100"
                    }`}
                  >
                    {m.text}
                  </span>
                </div>
              );
            })}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex gap-2 border-t border-slate-800 p-2"
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={200}
              placeholder="메시지 입력"
              className="min-w-0 flex-1 rounded-full bg-slate-800 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <button
              disabled={sending || !text.trim()}
              className="rounded-full bg-cyan-500 px-4 text-sm font-bold text-slate-950 disabled:opacity-40"
            >
              전송
            </button>
          </form>
        </div>
      )}
    </>
  );
}
