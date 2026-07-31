"use client";

import { usePathname } from "next/navigation";
import { CampaignSelector } from "@/components/campaign-selector";

// The toolbar selector is a *view* filter: it decides which campaign's numbers
// the page shows. On pages that write data or aren't campaign-scoped it does
// nothing, and leaving it visible implied it was the import destination --
// which is how an "eleição 2024" file ended up in Campanha 2026. Import now
// has its own explicit picker, so the toolbar hides here.
const HIDDEN_PREFIXES = ["/importacao", "/configuracoes"];

export function CampaignSelectorSlot() {
  const pathname = usePathname();
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;
  return <CampaignSelector />;
}
