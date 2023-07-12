import { vi } from "vitest";

vi.mock("@react-portable/client/dist/browser.umd?raw", () => ({
  default: `activate script`,
}));
