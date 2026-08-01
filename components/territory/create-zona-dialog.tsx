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

// A zona belongs to the município (it spans many bairros), so the parent
// picked here is the município -- not a bairro, as in the original model.
type CreateZonaDialogProps =
  | { municipioId: string; municipios?: never }
  | { municipioId?: never; municipios: { id: string; nome: string }[] };

export function CreateZonaDialog(props: CreateZonaDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedMunicipio, setSelectedMunicipio] = useState<string | undefined>(
    props.municipioId,
  );
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
            Uma zona pertence ao município e pode abranger vários bairros.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="municipio_id" value={selectedMunicipio ?? ""} />
          {props.municipios && (
            <div className="flex flex-col gap-2">
              <Label>Município</Label>
              <Select
                items={Object.fromEntries(props.municipios.map((m) => [m.id, m.nome]))}
                value={selectedMunicipio}
                onValueChange={(value) => value && setSelectedMunicipio(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o município" />
                </SelectTrigger>
                <SelectContent>
                  {props.municipios.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nome}
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
            <Button type="submit" disabled={isPending || !selectedMunicipio}>
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
