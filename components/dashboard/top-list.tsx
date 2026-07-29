import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TopList({
  title,
  items,
}: {
  title: string;
  items: { id: string; label: string; sublabel?: string; votos: number; href: string }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">Sem dados para esta campanha ainda.</p>
        )}
        <ol className="flex flex-col gap-2">
          {items.map((item, i) => (
            <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 truncate">
                <span className="w-5 shrink-0 text-muted-foreground">{i + 1}.</span>
                <Link href={item.href} className="truncate underline-offset-4 hover:underline">
                  {item.label}
                </Link>
                {item.sublabel && (
                  <span className="shrink-0 text-xs text-muted-foreground">{item.sublabel}</span>
                )}
              </span>
              <span className="shrink-0 font-medium tabular-nums">
                {item.votos.toLocaleString("pt-BR")}
              </span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
