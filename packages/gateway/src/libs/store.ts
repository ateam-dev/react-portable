let kv: KVNamespace;
export const prepareStore = (_kv: KVNamespace) => {
  kv = _kv;
};

type IdListStore = {
  ids: string[];
  load: () => Promise<IdListStore>;
  save: () => Promise<void>;
  update: (ids: string[] | Set<string>) => IdListStore;
};

export const createIdListStore = (url: string): IdListStore => {
  let currentIds: Set<string> = new Set();
  let originalIds: Set<string> = new Set();

  const key = `ID_LIST:${url}`;

  const idListStore: IdListStore = {
    get ids() {
      return Array.from(currentIds);
    },

    load: async () => {
      originalIds = currentIds = new Set(
        await kv.get<Array<string>>(key, {
          type: "json",
        })
      );

      return idListStore;
    },

    save: async () => {
      if (isSetEqual(originalIds, currentIds)) return;

      await kv.put(key, JSON.stringify(Array.from(currentIds)));
      originalIds = currentIds;
    },

    update: (ids: string[] | Set<string>) => {
      currentIds = new Set(ids);
      return idListStore;
    },
  };

  return idListStore;
};

const isSetEqual = (set1: Set<string>, set2: Set<string>) => {
  if (set1.size !== set2.size) return false;
  for (let item of set1) {
    if (!set2.has(item)) return false;
  }
  return true;
};
