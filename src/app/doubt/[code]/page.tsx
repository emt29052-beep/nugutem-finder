import { DoubtGame } from "./game";

export default async function Page(props: PageProps<"/doubt/[code]">) {
  const { code } = await props.params;
  return <DoubtGame code={code.toUpperCase()} />;
}
