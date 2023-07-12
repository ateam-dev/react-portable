import { Meta } from "@storybook/react";
import Products from "./Products";
import { reactPortableStory } from "@react-portable/storybook";

const meta: Meta = {
  title: "ec/Products",
  component: Products,
};

export default meta;

export const Default = reactPortableStory(Products);
