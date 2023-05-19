import { beforeEach, expect, test, vi } from "vitest";
import { createIdListStore, prepareStore } from "./store";

const describe = setupMiniflareIsolatedStorage();
const { TEST_KV } = getMiniflareBindings();

describe("store", function () {
  beforeEach(() => {
    prepareStore(TEST_KV);
  });
  describe("fragmentIdListStore", () => {
    beforeEach(async () => {
      await TEST_KV.put("key1", JSON.stringify(["id1", "id2"]));
    });
    test("load; not exist key in KV", async () => {
      const store = createIdListStore("not_exist_key");
      await store.load();

      expect(store.ids).toEqual([]);
    });
    test("load; exists key in KV", async () => {
      const store = createIdListStore("key1");
      await store.load();

      expect(store.ids).toEqual(["id1", "id2"]);
    });
    test("update", async () => {
      const store = createIdListStore("key1");
      await store.load();

      store.update(["id1", "id2", "id3"]);

      expect(store.ids).toEqual(["id1", "id2", "id3"]);
    });
    test("save", async () => {
      const mocked = vi.spyOn(TEST_KV, "put");
      const store = createIdListStore("key1");
      await store.load();

      // Skip when same data
      await store.update(["id1", "id2"]).save();
      expect(mocked).not.toBeCalled();

      // Skipping even if the order is changed.
      await store.update(["id2", "id1"]).save();
      expect(mocked).not.toBeCalled();

      await store.update(["id1", "id2", "id3"]).save();
      expect(mocked).toHaveBeenLastCalledWith(
        "key1",
        JSON.stringify(["id1", "id2", "id3"])
      );
      expect(store.ids).toEqual(["id1", "id2", "id3"]);

      await store.update(["id1"]).save();
      expect(mocked).toHaveBeenLastCalledWith("key1", JSON.stringify(["id1"]));
      expect(store.ids).toEqual(["id1"]);

      await store.update(["id2"]).save();
      expect(mocked).toHaveBeenLastCalledWith("key1", JSON.stringify(["id2"]));
      expect(store.ids).toEqual(["id2"]);
    });
  });
});
