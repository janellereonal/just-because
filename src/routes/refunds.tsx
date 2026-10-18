import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, legalHead } from "@/components/LegalPage";
import { REFUNDS } from "@/copy/legal";

export const Route = createFileRoute("/refunds")({
  head: () => legalHead(REFUNDS.title, REFUNDS.intro.slice(0, 155)),
  component: () => <LegalPage doc={REFUNDS} />,
});
