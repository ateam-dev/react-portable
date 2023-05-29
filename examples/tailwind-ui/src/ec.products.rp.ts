import Products from "~/components/ec/Products";
import { Strategy } from "@react-portable/core";
import "~/global.css";

export default Products;

export const strategy: Strategy = {
  revalidate: 0,
  hydrate: "onUse",
};
