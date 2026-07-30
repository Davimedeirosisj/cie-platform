"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { updateBairro, type FormActionState } from "@/lib/actions/territorio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CoordinateFields } from "@/components/territory/coordinate-fields";
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

export function EditBairroDialog({
  id,
  nome,
  observacoes,
  latitude,
  longitude,
}: {
  id: string;
  nome: string;
  observacoes: string | null;
  latitude: number | null;
  longitude: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(updateBairro, initialState);
  const prevPending = useRef(isPending);

  useEffect(() => {
    if (prevPending.current && !isPending && !state.error) setOpen(false);
    prevPending.current = isPending;
  }, [isPending, state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline">Editar</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Bairro</DialogTitle>
          <DialogDescription>Atualize os dados do bairro.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={id} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" name="nome" required defaultValue={nome} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea id="observacoes" name="observacoes" rows={3} defaultValue={observacoes ?? ""} />
          </div>
          <CoordinateFields latitudeDefault={latitude} longitudeDefault={longitude} />
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
