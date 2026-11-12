import type { Metadata } from "next";
import { Game } from "./game";

export const metadata: Metadata = { title: "딥씨 거래소" };

export default async function Page(props: PageProps<"/stock/[code]">) {
  const { code } = await props.params;
  return <Game code={code.toUpperCase()} />;
}
