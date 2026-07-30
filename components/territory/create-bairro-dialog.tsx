"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createBairro, type FormActionState } from "@/lib/actions/territorio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CoordinateFields } from "@/components/territory/coordinate-fields";
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

type CreateBairroDialogProps =
  | { municipioId: string; municipios?: never }
  | { municipioId?: never; municipios: { id: string; nome: string }[] };

export function CreateBairroDialog(props: CreateBairroDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedMunicipio, setSelectedMunicipio] = useState<string | undefined>(
    props.municipioId,
  );
  const [state, formAction, isPending] = useActionState(createBairro, initialState);
  const prevPending = useRef(isPending);

  useEffect(() => {
    if (prevPending.current && !isPending && !state.error) setOpen(false);
    prevPending.current = isPending;
  }, [isPending, state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Novo Bairro</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Bairro</DialogTitle>
          <DialogDescription>Cadastre um bairro.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="municipio_id" value={selectedMunicipio ?? ""} />
          {props.municipios && (
            <div className="flex flex-col gap-2">
              <Label>Município</Label>
              <Select
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
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" name="nome" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea id="observacoes" name="observacoes" rows={3} />
          </div>
          <CoordinateFields />
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
