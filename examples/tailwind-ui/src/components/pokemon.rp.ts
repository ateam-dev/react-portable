import { Pokemon } from "./Pokemon";
import { Strategy, Loader } from "@react-portable/core";
import { ComponentProps } from "react";

export default Pokemon;

export const loader: Loader<ComponentProps<typeof Pokemon>> = async (
  req: Request
) => {
  const search = new URL(req.url).searchParams;
  const code = search.get("code") ?? "";
  const url = `https://pokeapi.co/api/v2/pokemon/${search.get("code")}`;
  const res = await fetch(url);
  const data = await res.json();
  return {
    imgSrc: data.sprites.front_default,
    name: code,
    types: data.types.map(({ type }: { type: { name: string } }) => type.name),
  };
};

export const strategy: Strategy = { revalidate: 60, hydrate: "disable" };
