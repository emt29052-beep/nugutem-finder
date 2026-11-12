import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "마피아",
  description: "친구들과 휴대폰으로 하는 마피아 게임",
};

export default function MafiaLayout({ children }: LayoutProps<"/mafia">) {
  return children;
}
