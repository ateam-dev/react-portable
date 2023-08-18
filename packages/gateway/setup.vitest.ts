import { vi } from "vitest";

vi.mock("@react-portable/client/dist/browser.umd?raw", () => ({
  default: `activate script`,
}));

vi.mock("./src/statics/preview-button?raw", () => ({
  default: `preview button`,
}));
