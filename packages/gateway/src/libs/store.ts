let kv: KVNamespace;
export const prepareStore = (_kv: KVNamespace) => {
  kv = _kv;
};

export class FragmentIdListStore {
  private currentFragmentIds: Set<string> = new Set();
  private originalFragmentIds: Set<string> = new Set();
  constructor(private readonly key: string) {}

  get fragmentIds() {
    return Array.from(this.currentFragmentIds);
  }

  public async load() {
    if (this.originalFragmentIds.size > 0) return this;

    this.originalFragmentIds = this.currentFragmentIds = new Set(
      await kv.get<Array<string>>(this.key, {
        type: "json",
      })
    );

    return this;
  }

  public async save() {
    if (
      isSetEqual(this.originalFragmentIds ?? new Set(), this.currentFragmentIds)
    )
      return;

    await kv.put(this.key, JSON.stringify(this.fragmentIds));
  }

  public update(ids: Set<string> | Array<string>) {
    this.currentFragmentIds = new Set(ids);
    return this;
  }
}

const isSetEqual = (set1: Set<string>, set2: Set<string>) => {
  if (set1.size !== set2.size) return false;
  for (let item of set1) {
    if (!set2.has(item)) return false;
  }
  return true;
};
