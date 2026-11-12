import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "딥씨 거래소",
  description: "친구들과 하는 다이빙 테마 주식 파티 게임",
};

export default function StockLayout({ children }: LayoutProps<"/stock">) {
  return children;
}
