import { vi } from "vitest";

vi.mock("@react-portable/client/browser?raw", () => ({
  default: `activate script`,
}));

vi.mock("./src/statics/previewify.html?raw", () => ({
  default: `<script type="module">preview button</script>`,
}));
