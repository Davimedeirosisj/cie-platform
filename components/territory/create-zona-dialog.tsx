"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createZona, type FormActionState } from "@/lib/actions/territorio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

// A zona is a statewide jurisdiction (0024): its number is unique per estado
// and it can serve several municípios, so there is no parent to pick here --
// the estado is resolved server-side.
export function CreateZonaDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(createZona, initialState);
  const prevPending = useRef(isPending);

  useEffect(() => {
    if (prevPending.current && !isPending && !state.error) setOpen(false);
    prevPending.current = isPending;
  }, [isPending, state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Nova Zona</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Zona Eleitoral</DialogTitle>
          <DialogDescription>
            O número da zona é único no estado. Uma zona pode atender vários municípios.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="numero_zona">Número da Zona</Label>
            <Input id="numero_zona" name="numero_zona" type="number" min={1} required />
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
