"use client";

import { useTransition } from "react";
import { updateUserRole } from "@/lib/actions/usuarios";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Administrador",
  admin: "Administrador",
  coordenador_regional: "Coordenador Regional",
  consultor: "Consultor",
};

export function RoleSelect({
  id,
  role,
  disabled,
}: {
  id: string;
  role: string;
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      items={ROLE_LABELS}
      value={role}
      onValueChange={(value) => {
        if (!value) return;
        startTransition(() => updateUserRole(id, value));
      }}
    >
      <SelectTrigger className="w-56" disabled={disabled || isPending}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(ROLE_LABELS).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
