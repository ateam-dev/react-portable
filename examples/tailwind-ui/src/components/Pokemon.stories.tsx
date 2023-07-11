import { Meta, StoryObj } from "@storybook/react";
import { Pokemon } from "./Pokemon";
import { reactPortableStory } from "@react-portable/storybook";

const meta: Meta = {
  title: "Pokemon",
  component: Pokemon,
};

export default meta;

export const Default: StoryObj<typeof Pokemon> = {
  args: {
    name: "bulbasaur",
    imgSrc:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png",
    types: ["grass", "poison"],
  },
};

export const Portable = {
  ...reactPortableStory(Pokemon, {
    paramKeys: ["id"],
  }),
  argTypes: {
    id: {
      control: { type: "number" },
    },
  },
};
