import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "시간 경매",
  description: "친구들과 휴대폰으로 하는 시간 경매 게임",
};

export default function AuctionLayout({ children }: LayoutProps<"/auction">) {
  return children;
}
