import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, legalHead } from "@/components/LegalPage";
import { TERMS } from "@/copy/legal";

export const Route = createFileRoute("/terms")({
  head: () => legalHead(TERMS.title, TERMS.intro.slice(0, 155)),
  component: () => <LegalPage doc={TERMS} />,
});
