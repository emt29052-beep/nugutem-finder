import { MafiaGame } from "./game";

export default async function Page(props: PageProps<"/mafia/[code]">) {
  const { code } = await props.params;
  return <MafiaGame code={code.toUpperCase()} />;
}
