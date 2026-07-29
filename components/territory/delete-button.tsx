"use client";

import { Button } from "@/components/ui/button";

export function DeleteButton({
  action,
  label = "Excluir",
}: {
  action: () => Promise<void>;
  label?: string;
}) {
  return (
    <form action={action}>
      <Button type="submit" variant="destructive" size="sm">
        {label}
      </Button>
    </form>
  );
}
