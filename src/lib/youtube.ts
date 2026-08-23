const API_BASE = "https://www.googleapis.com/youtube/v3";

function parseDuration(duration: string) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

  if (!match) return 0;

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);

  return hours * 3600 + minutes * 60 + seconds;
}

export async function searchYouTubeVideos(
  query: string,
  days = 7,
  maxResults = 25
) {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY가 설정되지 않았습니다.");
  }

  const publishedAfter = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000
  ).toISOString();

  const searchParams = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    maxResults: String(maxResults),
    order: "viewCount",
    publishedAfter,
    regionCode: "KR",
    relevanceLanguage: "ko",
    videoDuration: "short",
    key: apiKey,
  });

  const searchRes = await fetch(
    `${API_BASE}/search?${searchParams.toString()}`,
    { cache: "no-store" }
  );

  if (!searchRes.ok) {
    const error = await searchRes.text();
    throw new Error(error);
  }

  const searchData = await searchRes.json();

  const videoIds = searchData.items
    .map((item: any) => item.id?.videoId)
    .filter(Boolean);

  if (!videoIds.length) return [];

  const videoParams = new URLSearchParams({
    part: "snippet,statistics,contentDetails",
    id: videoIds.join(","),
    key: apiKey,
  });

  const videoRes = await fetch(
    `${API_BASE}/videos?${videoParams.toString()}`,
    { cache: "no-store" }
  );

  if (!videoRes.ok) {
    throw new Error(await videoRes.text());
  }

  const videoData = await videoRes.json();

  const channelIds = [
    ...new Set(
      videoData.items.map((video: any) => video.snippet.channelId)
    ),
  ];

  const channelParams = new URLSearchParams({
    part: "snippet,statistics",
    id: channelIds.join(","),
    key: apiKey,
  });

  const channelRes = await fetch(
    `${API_BASE}/channels?${channelParams.toString()}`,
    { cache: "no-store" }
  );

  if (!channelRes.ok) {
    throw new Error(await channelRes.text());
  }

  const channelData = await channelRes.json();

  const channels = new Map(
    channelData.items.map((channel: any) => [
      channel.id,
      channel,
    ])
  );

  return videoData.items.map((video: any) => {
    const channel: any = channels.get(video.snippet.channelId);

    const views = Number(video.statistics.viewCount || 0);
    const likes = Number(video.statistics.likeCount || 0);
    const comments = Number(video.statistics.commentCount || 0);

    const subscribers = Number(
      channel?.statistics?.subscriberCount || 0
    );

    const publishedAt = new Date(video.snippet.publishedAt);

    const ageHours = Math.max(
      1,
      (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60)
    );

    const durationSeconds = parseDuration(
      video.contentDetails.duration
    );

    return {
      id: video.id,
      title: video.snippet.title,
      channelTitle: video.snippet.channelTitle,
      channelId: video.snippet.channelId,

      thumbnail:
        video.snippet.thumbnails?.high?.url ||
        video.snippet.thumbnails?.medium?.url ||
        video.snippet.thumbnails?.default?.url,

      publishedAt: video.snippet.publishedAt,

      views,
      likes,
      comments,
      subscribers,

      ageHours,
      durationSeconds,

      viewsPerHour: Math.round(views / ageHours),

      viewSubscriberRatio:
        subscribers > 0
          ? Number((views / subscribers).toFixed(2))
          : null,
    };
  });
}