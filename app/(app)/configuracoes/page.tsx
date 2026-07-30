import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const ITEMS = [
  { href: "/configuracoes/campanhas", title: "Campanhas", description: "Cadastrar e gerenciar eleições/campanhas." },
  { href: "/configuracoes/usuarios", title: "Usuários", description: "Gestão de perfis de acesso." },
  { href: "/configuracoes/auditoria", title: "Auditoria", description: "Registro de alterações no sistema." },
];

export default function ConfiguracoesPage() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {ITEMS.map((item) => (
        <Link key={item.href} href={item.href}>
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
}
