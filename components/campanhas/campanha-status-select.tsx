"use client";

import { useTransition } from "react";
import { updateCampanhaStatus } from "@/lib/actions/campanhas";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const STATUS_LABELS: Record<string, string> = {
  planejamento: "Planejamento",
  ativa: "Ativa",
  encerrada: "Encerrada",
};

export function CampanhaStatusSelect({ id, status }: { id: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      items={STATUS_LABELS}
      value={status}
      onValueChange={(value) => {
        if (!value) return;
        startTransition(() => updateCampanhaStatus(id, value));
      }}
    >
      <SelectTrigger className="w-36" disabled={isPending}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
