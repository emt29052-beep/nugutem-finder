"use client";

import { useState } from "react";

type Video = {
  id: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  publishedAt: string;
  views: number;
  subscribers: number;
  viewsPerHour: number;
  viewSubscriberRatio: number | null;
  viralScore: number;
};

function numberFormat(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [days, setDays] = useState("7");

  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function search() {
    if (!query.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `/api/youtube/search?q=${encodeURIComponent(
          query
        )}&days=${days}`
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      setVideos(data.results);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="mx-auto max-w-7xl px-5 py-10">
        <div className="mb-10">
          <div className="mb-2 text-sm font-bold text-yellow-300">
            누구템?
          </div>

          <h1 className="text-4xl font-black">
            🔥 터진 쇼츠 찾기
          </h1>

          <p className="mt-3 text-neutral-400">
            조회수가 아니라 성장 속도로 터지는 영상을 찾습니다.
          </p>
        </div>

        <div className="mb-8 flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 md:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") search();
            }}
            placeholder="예: 장원영, 향수, 추천템, 가방"
            className="flex-1 rounded-xl border border-neutral-700 bg-black px-5 py-4 outline-none focus:border-yellow-300"
          />

          <select
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="rounded-xl border border-neutral-700 bg-black px-5 py-4"
          >
            <option value="1">최근 24시간</option>
            <option value="3">최근 3일</option>
            <option value="7">최근 7일</option>
            <option value="30">최근 30일</option>
          </select>

          <button
            onClick={search}
            disabled={loading}
            className="rounded-xl bg-yellow-300 px-8 py-4 font-black text-black hover:bg-yellow-200 disabled:opacity-50"
          >
            {loading ? "검색 중..." : "찾기"}
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-xl bg-red-950 p-4 text-red-300">
            {error}
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {videos.map((video) => (
            <article
              key={video.id}
              className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900"
            >
              <a
                href={`https://youtube.com/watch?v=${video.id}`}
                target="_blank"
              >
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="aspect-video w-full object-cover"
                />
              </a>

              <div className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="rounded-full bg-yellow-300 px-3 py-1 text-sm font-black text-black">
                    🔥 {video.viralScore}
                  </span>

                  <span className="text-xs text-neutral-500">
                    {new Date(
                      video.publishedAt
                    ).toLocaleDateString("ko-KR")}
                  </span>
                </div>

                <h2 className="line-clamp-2 font-bold">
                  {video.title}
                </h2>

                <p className="mt-2 text-sm text-neutral-400">
                  {video.channelTitle}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <Stat
                    label="조회수"
                    value={numberFormat(video.views)}
                  />

                  <Stat
                    label="구독자"
                    value={numberFormat(video.subscribers)}
                  />

                  <Stat
                    label="시간당 조회"
                    value={numberFormat(video.viewsPerHour)}
                  />

                  <Stat
                    label="구독자 대비"
                    value={
                      video.viewSubscriberRatio
                        ? `${video.viewSubscriberRatio}배`
                        : "-"
                    }
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-black p-3">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1 font-bold">{value}</div>
    </div>
  );
}