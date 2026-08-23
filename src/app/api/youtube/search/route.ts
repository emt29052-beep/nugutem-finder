import { NextRequest, NextResponse } from "next/server";
import { searchYouTubeVideos } from "@/lib/youtube";
import { calculateViralScore } from "@/lib/score";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const q = searchParams.get("q");
    const days = Number(searchParams.get("days") || 7);

    if (!q) {
      return NextResponse.json(
        { error: "검색어를 입력해주세요." },
        { status: 400 }
      );
    }

    const videos = await searchYouTubeVideos(q, days);

    const results = videos
      .map((video: any) => ({
        ...video,
        viralScore: calculateViralScore({
          views: video.views,
          likes: video.likes,
          subscribers: video.subscribers,
          ageHours: video.ageHours,
        }),
      }))
      .sort(
        (a: any, b: any) =>
          b.viralScore - a.viralScore
      );

    return NextResponse.json({
      query: q,
      count: results.length,
      results,
    });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error.message ||
          "YouTube 데이터를 가져오지 못했습니다.",
      },
      { status: 500 }
    );
  }
}