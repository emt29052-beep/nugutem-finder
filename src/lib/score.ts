type ScoreInput = {
  views: number;
  likes: number;
  subscribers: number;
  ageHours: number;
};

export function calculateViralScore({
  views,
  likes,
  subscribers,
  ageHours,
}: ScoreInput) {
  const viewsPerHour = views / Math.max(ageHours, 1);

  const viewSubRatio =
    subscribers > 0 ? views / subscribers : 0;

  const likeRate =
    views > 0 ? likes / views : 0;

  // 조회 성장 속도: 최대 40점
  const velocityScore = Math.min(
    40,
    (Math.log10(viewsPerHour + 1) / Math.log10(50000)) * 40
  );

  // 구독자 대비 조회수: 최대 30점
  const ratioScore = Math.min(
    30,
    (Math.log10(viewSubRatio + 1) / Math.log10(100)) * 30
  );

  // 좋아요 반응: 최대 20점
  const engagementScore = Math.min(
    20,
    (likeRate / 0.08) * 20
  );

  // 최신성: 최대 10점
  const freshnessScore = Math.max(
    0,
    10 - (ageHours / (24 * 7)) * 10
  );

  return Math.round(
    Math.max(
      0,
      Math.min(
        100,
        velocityScore +
          ratioScore +
          engagementScore +
          freshnessScore
      )
    )
  );
}