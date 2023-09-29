import { vi } from "vitest";

vi.mock("@react-portable/client/browser", () => ({
  default: `activate script`,
}));

vi.mock("./src/statics/previewify.html", () => ({
  default: `<script type="module">preview button</script>`,
}));
