import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * React Query's retry rule. A server function that answered 4xx ("not yours", "not found",
 * "sign in") gives the same answer on a retry, so only other failures are tried again (3 times).
 * HttpError keeps its status on the way to the browser.
 */
export function retryQuery(failures: number, error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status;
  if (typeof status === "number" && status >= 400 && status < 500) return false;
  return failures < 3;
}
