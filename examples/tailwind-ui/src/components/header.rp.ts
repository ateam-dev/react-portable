import Header from "~/components/Header";
import "~/global.css";
import { Strategy } from "@react-portable/core";

export default Header;

export const strategy: Strategy = {
  revalidate: 3600,
  hydrate: "onUse",
};
