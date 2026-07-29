"use client";

import { useActionState } from "react";
import { updateObservacoes, type FormActionState } from "@/lib/actions/territorio";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const initialState: FormActionState = { error: null };

export function ObservacoesEditor({
  tabela,
  id,
  observacoesAtuais,
}: {
  tabela: "municipios" | "bairros";
  id: string;
  observacoesAtuais: string | null;
}) {
  const [state, formAction, isPending] = useActionState(updateObservacoes, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="tabela" value={tabela} />
      <input type="hidden" name="id" value={id} />
      <Label htmlFor="observacoes">Observações</Label>
      <Textarea
        id="observacoes"
        name="observacoes"
        defaultValue={observacoesAtuais ?? ""}
        rows={3}
      />
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" variant="outline" disabled={isPending} className="w-fit">
        {isPending ? "Salvando..." : "Salvar observações"}
      </Button>
    </form>
  );
}
