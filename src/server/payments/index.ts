import { paymongo } from "./paymongo";
import type { PaymentProvider } from "./types";

/** Add a sibling provider (e.g. paypal) here when it exists. */
const providers: Record<string, PaymentProvider> = { paymongo };

export const DEFAULT_PROVIDER = "paymongo";

export function getProvider(name: string = DEFAULT_PROVIDER): PaymentProvider {
  const provider = providers[name];
  if (!provider) throw new Error(`Unknown payment provider: ${name}`);
  return provider;
}

export type { PaymentProvider } from "./types";
