import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, legalHead } from "@/components/LegalPage";
import { PRIVACY } from "@/copy/legal";

export const Route = createFileRoute("/privacy")({
  head: () => legalHead(PRIVACY.title, PRIVACY.intro.slice(0, 155)),
  component: () => <LegalPage doc={PRIVACY} />,
});
