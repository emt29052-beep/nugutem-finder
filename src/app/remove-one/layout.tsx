import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "하나 빼기",
  description: "친구들과 휴대폰으로 하는 숫자 심리전 게임",
};

export default function RemoveOneLayout({ children }: LayoutProps<"/remove-one">) {
  return children;
}
