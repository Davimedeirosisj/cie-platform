"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createCampanha } from "@/lib/actions/campanhas";
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

export function CreateCampanhaDialog() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("planejamento");
  const [state, formAction, isPending] = useActionState(createCampanha, initialState);
  const prevPending = useRef(isPending);

  useEffect(() => {
    if (prevPending.current && !isPending && !state.error) setOpen(false);
    prevPending.current = isPending;
  }, [isPending, state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Nova Campanha</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Campanha</DialogTitle>
          <DialogDescription>Cadastre uma nova eleição/campanha.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" name="nome" placeholder="Campanha 2028" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cargo">Cargo</Label>
            <Input id="cargo" name="cargo" placeholder="Deputada Federal" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ano">Ano</Label>
            <Input id="ano" name="ano" type="number" min={2000} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Status</Label>
            <input type="hidden" name="status" value={status} />
            <Select value={status} onValueChange={(v) => v && setStatus(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planejamento">Planejamento</SelectItem>
                <SelectItem value="ativa">Ativa</SelectItem>
                <SelectItem value="encerrada">Encerrada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_campanha_meta" className="size-4" />
            Esta campanha define metas (ex.: próxima eleição)
          </label>
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
