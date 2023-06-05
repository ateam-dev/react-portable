import { Meta, StoryObj } from "@storybook/react";
import { Pokemon } from "./Pokemon";
import * as ReactPortable from "./pokemon.rp";
import { reactPortableStory } from "@react-portable/storybook";

const meta: Meta = {
  title: "Pokemon",
  component: Pokemon,
};

export default meta;

export const reactPortable: StoryObj = {
  ...reactPortableStory("/pokemon", ReactPortable, {
    paramKeys: ["code"],
  }),
  argTypes: {
    code: {
      control: { type: "select" },
      options: ["bulbasaur", "ivysaur", "venusaur", "charmander"],
    },
  },
  args: {
    code: "bulbasaur",
  },
};
