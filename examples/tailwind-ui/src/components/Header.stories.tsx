import { Meta } from "@storybook/react";
import Header from "./Header";
import * as ReactPotable from "./header.rp";
import { reactPortableStory } from "@react-portable/storybook";

const meta: Meta = {
  title: "Header",
  component: Header,
};

export default meta;

export const Default = reactPortableStory("/header", ReactPotable);
