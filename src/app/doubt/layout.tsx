import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "다우트 앤 벳",
  description: "친구들과 휴대폰으로 하는 블러핑 카드 게임",
};

export default function DoubtLayout({ children }: LayoutProps<"/doubt">) {
  return children;
}
