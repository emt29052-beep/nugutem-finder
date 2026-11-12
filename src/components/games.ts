// 게임 목록 (탭과 게임 모음 페이지에서 함께 사용)
export const GAMES = [
  { href: "/stock", emoji: "🌊", name: "딥씨 거래소", desc: "숨겨진 뉴스와 반전 아이템의 다이빙 주식 게임", players: "2~12명" },
  { href: "/mafia", emoji: "🔪", name: "마피아", desc: "밤에는 몰래 제거, 낮에는 토론과 투표로 마피아를 찾아라", players: "4~12명" },
] as const;
