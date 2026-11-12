import { AuctionGame } from "./game";

export default async function Page(props: PageProps<"/auction/[code]">) {
  const { code } = await props.params;
  return <AuctionGame code={code.toUpperCase()} />;
}
