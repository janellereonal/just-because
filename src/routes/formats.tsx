import { createFileRoute, redirect } from "@tanstack/react-router";

// "Formats" are called layouts now. Old links keep working.
export const Route = createFileRoute("/formats")({
  beforeLoad: () => {
    throw redirect({ to: "/layouts", statusCode: 301 });
  },
});
