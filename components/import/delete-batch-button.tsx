"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteImportBatch } from "@/lib/actions/importacao";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DeleteBatchButton({
  batchId,
  nomeArquivo,
  campanhaNome,
  linhasSucesso,
}: {
  batchId: string;
  nomeArquivo: string;
  campanhaNome: string;
  linhasSucesso: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteImportBatch(batchId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.push("/importacao");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive">Desfazer importação</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Desfazer importação</DialogTitle>
          <DialogDescription>
            Os {linhasSucesso.toLocaleString("pt-BR")} votos que <strong>{nomeArquivo}</strong>{" "}
            gravou em <strong>{campanhaNome}</strong> serão removidos. Os municípios, bairros,
            zonas e seções criados permanecem, pois outras importações e metas podem usá-los.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? "Removendo..." : "Remover votos deste lote"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
