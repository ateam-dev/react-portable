import React, { useReducer } from "react";
import useSWR from "swr";
import { Pokemon } from "examples-tailwind-ui";

type PokemonData = { imgSrc: string; name: string; types: string[] };

const getPokemonData = async (id: number): Promise<PokemonData> => {
  const url = `https://pokeapi.co/api/v2/pokemon/${id}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return {
      imgSrc: data.sprites.front_default,
      name: data.name,
      types: data.types.map(
        ({ type }: { type: { name: string } }) => type.name,
      ),
    };
  } catch (e) {
    return { imgSrc: "", name: "", types: [] };
  }
};

export default function Home() {
  const [id, increment] = useReducer((s: number) => s + 1, 1);

  const { data: pokemon } = useSWR(id.toString(), getPokemonData, {
    fallbackData: { imgSrc: "", name: "", types: [] },
    keepPreviousData: true,
  });

  if (!pokemon) return null;

  return (
    <Pokemon
      {...pokemon}
      onClick={() => {
        console.log("clicked parent");
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          console.log("inclement!");
          increment();
        }}
      >
        Next {">"}
      </button>
    </Pokemon>
  );
}
