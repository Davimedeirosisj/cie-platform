"use client";

import { useActionState } from "react";
import { updateSecao, type FormActionState } from "@/lib/actions/territorio";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const initialState: FormActionState = { error: null };

export function EditSecaoLocalForm({
  id,
  localVotacaoAtual,
  enderecoAtual,
}: {
  id: string;
  localVotacaoAtual: string | null;
  enderecoAtual: string | null;
}) {
  const [state, formAction, isPending] = useActionState(updateSecao, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="local_votacao">Local de Votação</Label>
        <Input id="local_votacao" name="local_votacao" defaultValue={localVotacaoAtual ?? ""} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="endereco_local">Endereço do Local</Label>
        <Input id="endereco_local" name="endereco_local" defaultValue={enderecoAtual ?? ""} />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" variant="outline" disabled={isPending} className="w-fit">
        {isPending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
