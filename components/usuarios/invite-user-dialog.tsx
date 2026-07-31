"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { inviteUser } from "@/lib/actions/usuarios";
import { ROLE_LABELS } from "@/components/usuarios/role-select";
import type { FormActionState } from "@/lib/actions/territorio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const initialState: FormActionState = { error: null };

export function InviteUserDialog() {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState("consultor");
  const [state, formAction, isPending] = useActionState(inviteUser, initialState);
  const prevPending = useRef(isPending);

  useEffect(() => {
    if (prevPending.current && !isPending && !state.error) setOpen(false);
    prevPending.current = isPending;
  }, [isPending, state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Convidar Usuário</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar Usuário</DialogTitle>
          <DialogDescription>
            Um email de convite será enviado pelo Supabase para que a pessoa defina sua senha.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" name="nome" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Perfil de acesso</Label>
            <input type="hidden" name="role" value={role} />
            <Select items={ROLE_LABELS} value={role} onValueChange={(v) => v && setRole(v)}>
              <SelectTrigger>
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
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Enviando..." : "Enviar convite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
