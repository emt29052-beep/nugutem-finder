import { RemoveOneGame } from "./game";

export default async function Page(props: PageProps<"/remove-one/[code]">) {
  const { code } = await props.params;
  return <RemoveOneGame code={code.toUpperCase()} />;
}
