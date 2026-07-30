import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function MapboxTokenNotice() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mapa não configurado</CardTitle>
        <CardDescription>
          Defina <code className="rounded bg-muted px-1 py-0.5">NEXT_PUBLIC_MAPBOX_TOKEN</code> no
          arquivo <code className="rounded bg-muted px-1 py-0.5">.env.local</code> com um token do{" "}
          <span className="font-medium">Mapbox</span> (crie uma conta gratuita em mapbox.com,
          copie o Default public token) e reinicie o servidor.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Depois de configurado, municípios e bairros com latitude/longitude cadastradas (editáveis
        no dialog &quot;Editar&quot; de cada território) aparecerão no mapa.
      </CardContent>
    </Card>
  );
}
