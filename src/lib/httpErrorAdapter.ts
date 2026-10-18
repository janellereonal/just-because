/**
 * Server function errors keep their HTTP status on the way to the browser.
 *
 * TanStack Start sends errors as their message only, so a 403 "That gift isn't yours" arrived as a
 * plain Error and React Query retried it 3 times. This adapter carries `status` too (HttpError in
 * src/server/guards.ts has one), so `retryQuery` in src/lib/utils.ts can skip 4xx answers.
 * Only errors with a numeric `status` match; everything else is sent the usual way.
 */
import { createSerializationAdapter } from "@tanstack/react-router";

type StatusError = Error & { status: number };

export const httpErrorAdapter = createSerializationAdapter({
  key: "jb-http-error",
  test: (value: unknown): value is StatusError =>
    value instanceof Error && typeof (value as { status?: unknown }).status === "number",
  toSerializable: (error: StatusError) => ({ message: error.message, status: error.status }),
  fromSerializable: (value: { message: string; status: number }) => Object.assign(new Error(value.message), { status: value.status }),
});
