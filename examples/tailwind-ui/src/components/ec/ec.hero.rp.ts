import Hero from "~/components/ec/Hero";
import { Strategy } from "@react-portable/core";
import "~/global.css";

export default Hero;

export const strategy: Strategy = {
  revalidate: 0,
  hydrate: "disable",
};
