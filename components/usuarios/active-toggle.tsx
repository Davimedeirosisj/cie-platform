"use client";

import { useTransition } from "react";
import { toggleUserActive } from "@/lib/actions/usuarios";
import { Button } from "@/components/ui/button";

export function ActiveToggle({
  id,
  ativo,
  disabled,
}: {
  id: string;
  ativo: boolean;
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant={ativo ? "outline" : "secondary"}
      size="sm"
      disabled={disabled || isPending}
      onClick={() => startTransition(() => toggleUserActive(id, !ativo))}
    >
      {ativo ? "Desativar" : "Ativar"}
    </Button>
  );
}
