import { corsHeader } from "./cors";
import { describe, expect, test } from "vitest";

describe("cors", () => {
  describe("corsHeader", () => {
    test("allowOrigins is wiled card", () => {
      const responseHeader = corsHeader("https://example.com", "*");
      expect(responseHeader.get("Access-Control-Allow-Origin")).toBe("*");
      expect(responseHeader.get("Access-Control-Allow-Methods")).toBe(
        "GET, HEAD, OPTIONS"
      );
      expect(responseHeader.get("Access-Control-Allow-Headers")).toBe(
        "Content-Type, Accept, X-React-Portable-Gateway"
      );
    });
    test("allowOrigins is list but not included origin", () => {
      const responseHeader = corsHeader(
        "https://example.com",
        "https://foo.com, https://bar.com"
      );
      expect(responseHeader.get("Access-Control-Allow-Origin")).toBe(null);
      expect(responseHeader.get("Access-Control-Allow-Methods")).toBe(
        "GET, HEAD, OPTIONS"
      );
      expect(responseHeader.get("Access-Control-Allow-Headers")).toBe(
        "Content-Type, Accept, X-React-Portable-Gateway"
      );
    });
    test("allowOrigins is list and included origin", () => {
      const responseHeader = corsHeader(
        "https://example.com",
        "https://example.com, https://foo.com, https://bar.com"
      );
      expect(responseHeader.get("Access-Control-Allow-Origin")).toBe(
        "https://example.com"
      );
      expect(responseHeader.get("Access-Control-Allow-Methods")).toBe(
        "GET, HEAD, OPTIONS"
      );
      expect(responseHeader.get("Access-Control-Allow-Headers")).toBe(
        "Content-Type, Accept, X-React-Portable-Gateway"
      );
    });
    test("passed baseHeader", () => {
      const baseHeader = new Headers({
        "Content-Type": "application/javascript",
      });
      const responseHeader = corsHeader("https://example.com", "*", baseHeader);
      expect(responseHeader.get("Content-Type")).toBe("application/javascript");
      expect(responseHeader.get("Access-Control-Allow-Origin")).toBe("*");
      expect(responseHeader.get("Access-Control-Allow-Methods")).toBe(
        "GET, HEAD, OPTIONS"
      );
      expect(responseHeader.get("Access-Control-Allow-Headers")).toBe(
        "Content-Type, Accept, X-React-Portable-Gateway"
      );
    });
  });
});
