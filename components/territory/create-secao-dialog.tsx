"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createSecao, type FormActionState } from "@/lib/actions/territorio";
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

type CreateSecaoDialogProps =
  | { zonaId: string; zonas?: never }
  | { zonaId?: never; zonas: { id: string; label: string }[] };

export function CreateSecaoDialog(props: CreateSecaoDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedZona, setSelectedZona] = useState<string | undefined>(props.zonaId);
  const [state, formAction, isPending] = useActionState(createSecao, initialState);
  const prevPending = useRef(isPending);

  useEffect(() => {
    if (prevPending.current && !isPending && !state.error) setOpen(false);
    prevPending.current = isPending;
  }, [isPending, state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Nova Seção</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Seção Eleitoral</DialogTitle>
          <DialogDescription>Cadastre uma seção eleitoral.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="zona_id" value={selectedZona ?? ""} />
          {props.zonas && (
            <div className="flex flex-col gap-2">
              <Label>Zona</Label>
              <Select
                value={selectedZona}
                onValueChange={(value) => value && setSelectedZona(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a zona" />
                </SelectTrigger>
                <SelectContent>
                  {props.zonas.map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      {z.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="numero_secao">Número da Seção</Label>
            <Input id="numero_secao" name="numero_secao" type="number" min={1} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="local_votacao">Local de Votação</Label>
            <Input id="local_votacao" name="local_votacao" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="endereco_local">Endereço do Local</Label>
            <Input id="endereco_local" name="endereco_local" />
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isPending || !selectedZona}>
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
