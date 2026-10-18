import { createAuthClient } from "better-auth/react";
import { anonymousClient, inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
    anonymousClient(),
    inferAdditionalFields({
      user: { isAdmin: { type: "boolean", required: false } },
    }),
  ],
});
