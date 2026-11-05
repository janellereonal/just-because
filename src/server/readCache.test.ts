import { afterEach, describe, expect, test } from "bun:test";
import { cacheKey, cachedRead, clearReadCache, forgetGift } from "./readCache";

afterEach(() => clearReadCache());

describe("read cache", () => {
  test("visitors arriving together share one database read", async () => {
    let reads = 0;
    const load = async () => {
      reads++;
      await new Promise((r) => setTimeout(r, 5));
      return { id: "a" };
    };
    const all = await Promise.all(Array.from({ length: 1000 }, () => cachedRead(cacheKey.site("a"), load, 10_000)));
    expect(reads).toBe(1);
    expect(all.every((x) => x.id === "a")).toBe(true);
  });

  test("an owner change clears the gift, including its link", async () => {
    let n = 0;
    const load = async () => ++n;
    await cachedRead(cacheKey.approved("g1"), load, 10_000);
    await cachedRead(cacheKey.slug("abc"), load, 10_000);
    forgetGift("g1", "abc");
    expect(await cachedRead(cacheKey.approved("g1"), load, 10_000)).toBe(3);
    expect(await cachedRead(cacheKey.slug("abc"), load, 10_000)).toBe(4);
  });

  test("a lazy query (a thenable, like Drizzle's) runs once", async () => {
    let runs = 0;
    const lazy = () => ({ then: (ok: (v: number) => void) => ok(++runs) }) as unknown as Promise<number>;
    await cachedRead("lazy", lazy, 10_000);
    await cachedRead("lazy", lazy, 10_000);
    await cachedRead("lazy", lazy, 10_000);
    expect(runs).toBe(1);
  });

  test("failed reads aren't kept", async () => {
    let n = 0;
    const flaky = async () => {
      n++;
      if (n === 1) throw new Error("db down");
      return "ok";
    };
    await expect(cachedRead("k", flaky, 10_000)).rejects.toThrow("db down");
    expect(await cachedRead("k", flaky, 10_000)).toBe("ok");
  });

  test("a TTL of 0 turns it off", async () => {
    let n = 0;
    const load = async () => ++n;
    await cachedRead("z", load, 0);
    expect(await cachedRead("z", load, 0)).toBe(2);
  });
});
