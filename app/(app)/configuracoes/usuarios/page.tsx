import { createClient } from "@/lib/supabase/server";
import { hasServiceRoleKey } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { InviteUserDialog } from "@/components/usuarios/invite-user-dialog";
import { RoleSelect } from "@/components/usuarios/role-select";
import { ActiveToggle } from "@/components/usuarios/active-toggle";

export default async function UsuariosPage() {
  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nome, email, role, ativo, created_at")
    .order("created_at");

  const canInvite = hasServiceRoleKey();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Usuários</CardTitle>
          {!canInvite && (
            <CardDescription>
              Para convidar novos usuários, configure a variável de ambiente
              SUPABASE_SERVICE_ROLE_KEY (Supabase → Project Settings → API → service_role key).
            </CardDescription>
          )}
        </div>
        {canInvite && <InviteUserDialog />}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Perfil de Acesso</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(profiles ?? []).map((p) => {
              const isSelf = p.id === currentUser?.id;
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.nome} {isSelf && <span className="text-xs text-muted-foreground">(você)</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.email}</TableCell>
                  <TableCell>
                    <RoleSelect id={p.id} role={p.role} disabled={isSelf} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.ativo ? "default" : "secondary"}>
                      {p.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ActiveToggle id={p.id} ativo={p.ativo} disabled={isSelf} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
