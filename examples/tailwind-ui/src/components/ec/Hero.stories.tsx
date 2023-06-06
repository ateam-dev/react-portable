import { Meta } from "@storybook/react";
import Hero from "./Hero";
import * as ReactPotable from "./ec.hero.rp";
import { reactPortableStory } from "@react-portable/storybook";

const meta: Meta = {
  title: "ec/Hero",
  component: Hero,
};

export default meta;

export const Default = reactPortableStory("/ec/hero", ReactPotable);
