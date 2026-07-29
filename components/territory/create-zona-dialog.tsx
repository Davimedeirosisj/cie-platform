"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createZona, type FormActionState } from "@/lib/actions/territorio";
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

type CreateZonaDialogProps =
  | { bairroId: string; bairros?: never }
  | { bairroId?: never; bairros: { id: string; nome: string; municipioNome: string }[] };

export function CreateZonaDialog(props: CreateZonaDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedBairro, setSelectedBairro] = useState<string | undefined>(props.bairroId);
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
          <DialogDescription>Cadastre uma zona eleitoral.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="bairro_id" value={selectedBairro ?? ""} />
          {props.bairros && (
            <div className="flex flex-col gap-2">
              <Label>Bairro</Label>
              <Select
                value={selectedBairro}
                onValueChange={(value) => value && setSelectedBairro(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o bairro" />
                </SelectTrigger>
                <SelectContent>
                  {props.bairros.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.nome} ({b.municipioNome})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="numero_zona">Número da Zona</Label>
            <Input id="numero_zona" name="numero_zona" type="number" min={1} required />
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isPending || !selectedBairro}>
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
