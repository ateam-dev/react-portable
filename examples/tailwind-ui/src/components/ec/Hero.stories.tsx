import { Meta } from "@storybook/react";
import Hero from "./Hero";
import { reactPortableStory } from "@react-portable/storybook";

const meta: Meta = {
  title: "ec/Hero",
  component: Hero,
};

export default meta;

export const Default = reactPortableStory(Hero);
