import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ConfiguracoesPage() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Link href="/configuracoes/campanhas">
        <Card className="transition-colors hover:bg-muted/50">
          <CardHeader>
            <CardTitle>Campanhas</CardTitle>
            <CardDescription>Cadastrar e gerenciar eleições/campanhas.</CardDescription>
          </CardHeader>
        </Card>
      </Link>
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle>Usuários</CardTitle>
          <CardDescription>Gestão de perfis de acesso — chega na Fase 5.</CardDescription>
        </CardHeader>
      </Card>
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle>Auditoria</CardTitle>
          <CardDescription>Registro de alterações — chega na Fase 5.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
