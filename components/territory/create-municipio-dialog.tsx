"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createMunicipio, type FormActionState } from "@/lib/actions/territorio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export function CreateMunicipioDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(createMunicipio, initialState);
  const prevPending = useRef(isPending);

  useEffect(() => {
    if (prevPending.current && !isPending && !state.error) setOpen(false);
    prevPending.current = isPending;
  }, [isPending, state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Novo Município</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Município</DialogTitle>
          <DialogDescription>Cadastre um município da Bahia.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" name="nome" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea id="observacoes" name="observacoes" rows={3} />
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
