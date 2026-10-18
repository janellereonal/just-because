/** Run: bun test src/config/analytics.test.ts */
import { describe, expect, test } from "bun:test";
import { isNoRecordingPath, redactProps, redactUrl } from "./analytics";

describe("redactUrl", () => {
  test("gift, friend, editor and checkout links lose their id", () => {
    expect(redactUrl("https://justbecause.site/g/ana-30th")).toBe("https://justbecause.site/g/:id");
    expect(redactUrl("/contribute/ana-30th")).toBe("/contribute/:id");
    expect(redactUrl("/sites/12e108b5-f0bf-44d0-911c-fd684fcedb23/edit")).toBe("/sites/:id/edit");
    expect(redactUrl("/checkout/abc?cancelled=1")).toBe("/checkout/:id");
  });
  test("query strings go, except campaign tags", () => {
    expect(redactUrl("https://justbecause.site/?open=1&utm_source=ig&ref=x")).toBe("https://justbecause.site/?utm_source=ig");
    expect(redactUrl("/g/ana?open=1")).toBe("/g/:id");
  });
  test("public pages and plain strings are left alone", () => {
    expect(redactUrl("https://justbecause.site/example/ana")).toBe("https://justbecause.site/example/ana");
    expect(redactUrl("/styles")).toBe("/styles");
  });
  test("links inside the clicked element's HTML are cut too", () => {
    const chain = 'a.btn:attr__href="/g/ana-30th?open=1"nth-child="1"';
    expect(redactUrl(chain)).toBe('a.btn:attr__href="/g/:id"nth-child="1"');
  });
});

describe("redactProps", () => {
  test("only URL-like properties change, including $set_once", () => {
    const out = redactProps({ $current_url: "https://x.site/g/ana", $pathname: "/g/ana", plan: "sweet", $set_once: { $initial_current_url: "https://x.site/contribute/ana" } });
    expect(out.$current_url).toBe("https://x.site/g/:id");
    expect(out.$pathname).toBe("/g/:id");
    expect(out.plan).toBe("sweet");
    expect((out.$set_once as Record<string, string>).$initial_current_url).toBe("https://x.site/contribute/:id");
  });
});

describe("isNoRecordingPath", () => {
  test("the gift, the friends' page and checkout are never recorded", () => {
    expect(isNoRecordingPath("/g/ana")).toBe(true);
    expect(isNoRecordingPath("/contribute/ana")).toBe(true);
    expect(isNoRecordingPath("/checkout/1")).toBe(true);
    expect(isNoRecordingPath("/create")).toBe(false);
    expect(isNoRecordingPath("/")).toBe(false);
  });
});
