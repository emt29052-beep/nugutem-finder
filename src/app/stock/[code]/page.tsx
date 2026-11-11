import type { Metadata } from "next";
import { Game } from "./game";

export const metadata: Metadata = { title: "블러프 마켓" };

export default async function Page(props: PageProps<"/stock/[code]">) {
  const { code } = await props.params;
  return <Game code={code.toUpperCase()} />;
}
