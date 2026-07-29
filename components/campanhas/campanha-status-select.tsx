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

export function CampanhaStatusSelect({ id, status }: { id: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
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
        <SelectItem value="planejamento">Planejamento</SelectItem>
        <SelectItem value="ativa">Ativa</SelectItem>
        <SelectItem value="encerrada">Encerrada</SelectItem>
      </SelectContent>
    </Select>
  );
}
