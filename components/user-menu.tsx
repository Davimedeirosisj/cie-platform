import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Administrador",
  admin: "Administrador",
  coordenador_regional: "Coordenador Regional",
  consultor: "Consultor",
};

export function UserMenu({ nome, role }: { nome: string; role: string }) {
  const iniciais = nome
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" className="gap-2 px-2" />}>
        <Avatar className="size-7">
          <AvatarFallback>{iniciais}</AvatarFallback>
        </Avatar>
        <span className="hidden text-sm sm:inline">{nome}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {/* Base UI requires GroupLabel (DropdownMenuLabel) to live inside a
            Menu.Group, otherwise it throws "MenuGroupContext is missing". */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span>{nome}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {ROLE_LABELS[role] ?? role}
              </span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <form action={signOut}>
          <DropdownMenuItem render={<button type="submit" className="w-full text-left" />}>
            Sair
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
