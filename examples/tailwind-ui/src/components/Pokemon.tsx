import { FC, MouseEventHandler, ReactNode } from "react";
import { portable } from "@react-portable/core";

type Props = {
  imgSrc?: string;
  name?: string;
  types?: string[];
  onClick?: MouseEventHandler<HTMLDivElement>;
  children?: ReactNode;
};

const Component: FC<Props> = ({ imgSrc, name, types, onClick, children }) => {
  return (
    <div
      className="max-w-md py-4 px-8 bg-white shadow-lg rounded-lg my-20"
      onClick={onClick}
    >
      <div className="flex justify-center -mt-16">
        <img
          className="w-20 h-20 object-cover rounded-full border border-gray-200 bg-white"
          alt={name}
          src={imgSrc}
        />
      </div>
      <div>
        <h2 className="text-gray-800 text-3xl font-semibold">{name}</h2>
        <p className="mt-2 text-gray-600">{types?.join(", ")}</p>
        {children}
      </div>
    </div>
  );
};

export const Pokemon = portable(Component, "pokemon", {
  loader: async (req, ctx) => {
    const search = new URL(req.url).searchParams;
    const id = search.get("id") ?? "1";
    const url = `https://pokeapi.co/api/v2/pokemon/${id}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      return {
        imgSrc: data.sprites.front_default,
        name: data.name,
        types: data.types.map(
          ({ type }: { type: { name: string } }) => type.name
        ),
      };
    } catch (e) {
      throw ctx.error(500, e instanceof Error ? e.message : "unknown error");
    }
  },
  // strategy: { revalidate: 60, hydrate: "onIdle" },
});
