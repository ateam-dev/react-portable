import { Pokemon } from "./Pokemon";
import { Strategy, Loader } from "@react-portable/core";
import { ComponentProps } from "react";

export default Pokemon;

export const loader: Loader<ComponentProps<typeof Pokemon>> = async (
  req: Request,
  ctx
) => {
  const search = new URL(req.url).searchParams;
  const code = search.get("code") ?? "";
  if (!code) return ctx.error(404, "invalid code");
  const url = `https://pokeapi.co/api/v2/pokemon/${search.get("code")}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return {
      imgSrc: data.sprites.front_default,
      name: code,
      types: data.types.map(
        ({ type }: { type: { name: string } }) => type.name
      ),
    };
  } catch (e) {
    throw ctx.error(500, e instanceof Error ? e.message : "unknown error");
  }
};

export const strategy: Strategy = { revalidate: 60, hydrate: "disable" };
