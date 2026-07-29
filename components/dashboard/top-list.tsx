"use client";

import { memo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TopItem = { id: string; label: string; sublabel?: string; votos: number; href: string };

function TopListItem({ item, index }: { item: TopItem; index: number }) {
  return (
    <li className="flex items-center justify-between gap-2 text-sm">
      <span className="flex items-center gap-2 truncate">
        <span className="w-5 shrink-0 text-muted-foreground">{index + 1}.</span>
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
  );
}

const MemoizedTopListItem = memo(TopListItem);

function TopListComponent({
  title,
  items,
  isLoading,
}: {
  title: string;
  items: TopItem[];
  isLoading?: boolean;
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
            <MemoizedTopListItem key={item.id} item={item} index={i} />
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

export const TopList = memo(TopListComponent);
