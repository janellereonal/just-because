import { describe, expect, test } from "bun:test";
import { retryQuery } from "./utils";

const httpError = (status: number) => Object.assign(new Error("nope"), { status });

describe("retryQuery", () => {
  test("never retries a 4xx answer from a server function", () => {
    for (const s of [400, 401, 403, 404, 409, 422, 429]) expect(retryQuery(0, httpError(s))).toBe(false);
  });
  test("retries other failures up to three times", () => {
    expect(retryQuery(0, new Error("Failed to fetch"))).toBe(true);
    expect(retryQuery(2, httpError(500))).toBe(true);
    expect(retryQuery(3, httpError(500))).toBe(false);
    expect(retryQuery(0, null)).toBe(true);
  });
});

describe("httpErrorAdapter", () => {
  test("carries the status of a server error to the browser", async () => {
    const { httpErrorAdapter: a } = await import("./httpErrorAdapter");
    const sent = Object.assign(new Error("That gift isn't yours."), { status: 403 });
    expect(a.test(sent)).toBe(true);
    const back = a.fromSerializable(a.toSerializable(sent) as { message: string; status: number });
    expect(back).toBeInstanceOf(Error);
    expect(back.message).toBe("That gift isn't yours.");
    expect(retryQuery(0, back)).toBe(false);
    // Plain errors (500s, validation) are left to the default serializer.
    expect(a.test(new Error("Something went wrong"))).toBe(false);
    expect(a.test({ status: 403 })).toBe(false);
  });
});
