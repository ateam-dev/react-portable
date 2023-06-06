import { Meta } from "@storybook/react";
import Products from "./Products";
import * as ReactPotable from "./ec.products.rp";
import { reactPortableStory } from "@react-portable/storybook";

const meta: Meta = {
  title: "ec/Products",
  component: Products,
};

export default meta;

export const Default = reactPortableStory("/ec/products", ReactPotable);
