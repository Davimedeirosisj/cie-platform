"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { parseWorkbook, type ParsedSheet } from "@/lib/import/parse-xlsx";
import { runImport, saveColumnMapping } from "@/lib/actions/importacao";
import { SYSTEM_FIELDS, type ColumnMapping, type MappedRow, type SystemField } from "@/lib/types/import";
import type { Campanha } from "@/lib/types/campanha";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NONE = "__none__";

type MappingTemplate = { id: string; nome: string; mapeamento: ColumnMapping };

function buildMappedRows(sheet: ParsedSheet, mapping: ColumnMapping): MappedRow[] {
  return sheet.rows.map((row) => {
    const mapped: MappedRow = {};
    for (const { field } of SYSTEM_FIELDS) {
      const header = mapping[field];
      if (header) mapped[field] = row[header] ?? "";
    }
    return mapped;
  });
}

function countInvalidRows(rows: MappedRow[]): number {
  const requiredFields = SYSTEM_FIELDS.filter((f) => f.required).map((f) => f.field);
  return rows.filter((row) => requiredFields.some((f) => !row[f]?.trim())).length;
}

/** The finest level the mapping provides -- that's where the votes get stored. */
function describeGranularity(mapping: ColumnMapping): string {
  if (mapping.secao) return "Seção";
  if (mapping.zona) return "Zona";
  if (mapping.bairro) return "Bairro";
  return "Município";
}

export function ImportWizard() {
  const router = useRouter();

  // Deliberately NOT the global toolbar campaign: that selector is a *view*
  // filter, and silently reusing it here sent an "eleição 2024" file into
  // Campanha 2026. The destination is chosen explicitly below.
  const [destinoId, setDestinoId] = useState<string>("");
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);

  const [file, setFile] = useState<File | null>(null);
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [templates, setTemplates] = useState<MappingTemplate[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("import_column_mappings")
      .select("id, nome, mapeamento")
      .order("created_at", { ascending: false })
      .then(({ data }) => setTemplates((data ?? []) as MappingTemplate[]));

    supabase
      .from("campanhas")
      .select("id, nome, cargo, ano, status, is_campanha_meta")
      .order("ano", { ascending: false })
      .then(({ data }) => setCampanhas((data ?? []) as Campanha[]));
  }, []);

  const destino = campanhas.find((c) => c.id === destinoId);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setError(null);
    setParsing(true);
    try {
      const parsed = await parseWorkbook(selected);
      setFile(selected);
      setSheet(parsed);
    } catch {
      setError("Não foi possível ler o arquivo. Verifique se é um .xlsx válido.");
    } finally {
      setParsing(false);
    }
  }

  function applyTemplate(templateId: string) {
    const template = templates.find((t) => t.id === templateId);
    if (template) setMapping(template.mapeamento);
  }

  async function handleSaveTemplate() {
    if (!templateName.trim()) return;
    await saveColumnMapping(templateName.trim(), mapping);
    const supabase = createClient();
    const { data } = await supabase
      .from("import_column_mappings")
      .select("id, nome, mapeamento")
      .order("created_at", { ascending: false });
    setTemplates((data ?? []) as MappingTemplate[]);
    setTemplateName("");
  }

  async function handleCommit() {
    if (!destinoId || !sheet || !file) return;
    setCommitting(true);
    setError(null);

    const supabase = createClient();
    const storagePath = `${destinoId}/${crypto.randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("import-uploads")
      .upload(storagePath, file);

    if (uploadError) {
      setError("Falha ao enviar o arquivo. " + uploadError.message);
      setCommitting(false);
      return;
    }

    const mappedRows = buildMappedRows(sheet, mapping);
    const result = await runImport(destinoId, file.name, storagePath, mapping, mappedRows);
    setCommitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`/importacao/${result.batchId}`);
  }

  const mappedRows = sheet ? buildMappedRows(sheet, mapping) : [];
  const invalidCount = sheet ? countInvalidRows(mappedRows) : 0;
  const missingFields = SYSTEM_FIELDS.filter((f) => f.required && !mapping[f.field]).map(
    (f) => f.label,
  );
  const requiredFilled = missingFields.length === 0;

  // Spreadsheet headers are their own labels; only the NONE sentinel needs
  // mapping so the trigger doesn't render "__none__".
  const headerItems: Record<string, string> = {
    [NONE]: "— nenhuma —",
    ...Object.fromEntries((sheet?.headers ?? []).map((h) => [h, h])),
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>1. Campanha de destino</CardTitle>
          <CardDescription>
            Escolha em qual campanha estes votos serão gravados. Confira o ano: um arquivo de
            2024 gravado em 2026 mistura os dados das eleições.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            items={Object.fromEntries(
              campanhas.map((c) => [c.id, `${c.nome} — ${c.cargo} (${c.ano})`]),
            )}
            value={destinoId}
            onValueChange={(v) => v && setDestinoId(v)}
          >
            <SelectTrigger className="w-96">
              <SelectValue placeholder="Selecione a campanha de destino" />
            </SelectTrigger>
            <SelectContent>
              {campanhas.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome} — {c.cargo} ({c.ano})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {destino?.is_campanha_meta && (
            <p className="mt-2 text-sm text-destructive">
              Atenção: {destino.nome} é a campanha de metas (eleição futura). Só importe votos
              aqui se for realmente essa a intenção.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Selecionar planilha</CardTitle>
          <CardDescription>
            Arquivo .xlsx, .xls ou .csv com os votos desta campanha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            disabled={parsing}
          />
          {parsing && <p className="mt-2 text-sm text-muted-foreground">Lendo planilha...</p>}
          {sheet && (
            <p className="mt-2 text-sm text-muted-foreground">
              {sheet.rows.length} linhas detectadas, {sheet.headers.length} colunas.
            </p>
          )}
        </CardContent>
      </Card>

      {sheet && (
        <Card>
          <CardHeader>
            <CardTitle>3. Mapear colunas</CardTitle>
            <CardDescription>
              Relacione as colunas da planilha aos campos do sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {templates.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label>Usar modelo salvo</Label>
                <Select
                  items={Object.fromEntries(templates.map((t) => [t.id, t.nome]))}
                  onValueChange={(v: string | null) => v && applyTemplate(v)}
                >
                  <SelectTrigger className="w-72">
                    <SelectValue placeholder="Selecione um modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {SYSTEM_FIELDS.map(({ field, label, required }) => (
                <div key={field} className="flex flex-col gap-2">
                  <Label>
                    {label} {required && <span className="text-destructive">*</span>}
                  </Label>
                  <Select
                    items={headerItems}
                    value={mapping[field] ?? NONE}
                    onValueChange={(value) =>
                      setMapping((prev) => ({
                        ...prev,
                        [field]: value === NONE ? undefined : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a coluna" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>— nenhuma —</SelectItem>
                      {sheet.headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="flex items-end gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="template-name">Salvar como modelo</Label>
                <Input
                  id="template-name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Nome do modelo"
                  className="w-56"
                />
              </div>
              <Button variant="outline" onClick={handleSaveTemplate} disabled={!templateName.trim()}>
                Salvar modelo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Always rendered once a file is loaded: hiding this card until the
          mapping was complete meant the import button silently didn't exist,
          with nothing on screen explaining what was missing. */}
      {sheet && (
        <Card>
          <CardHeader>
            <CardTitle>4. Pré-visualização e importação</CardTitle>
            <CardDescription>
              {requiredFilled ? (
                <>
                  {mappedRows.length} linhas prontas, gravadas no nível{" "}
                  <span className="font-medium">{describeGranularity(mapping)}</span>
                  {invalidCount > 0 && (
                    <span className="text-destructive">
                      {" "}
                      — {invalidCount} com campos obrigatórios vazios (serão listadas como erro)
                    </span>
                  )}
                  .
                </>
              ) : (
                <span className="text-destructive">
                  Faltam mapear no passo 2: {missingFields.join(", ")}.
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {requiredFilled && (
              <Table>
                <TableHeader>
                  <TableRow>
                    {SYSTEM_FIELDS.map(({ field, label }) => (
                      <TableHead key={field}>{label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappedRows.slice(0, 10).map((row, i) => (
                    <TableRow key={i}>
                      {SYSTEM_FIELDS.map(({ field }: { field: SystemField }) => (
                        <TableCell key={field}>{row[field] || "—"}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

            {/* The destination is restated here so it is confirmed at the
                moment of writing, not just chosen four steps earlier. */}
            <Button
              className="mt-4"
              onClick={handleCommit}
              disabled={committing || !requiredFilled || !destinoId}
            >
              {committing
                ? "Importando..."
                : !destinoId
                  ? "Escolha a campanha de destino no passo 1"
                  : requiredFilled
                    ? `Importar ${mappedRows.length} linhas em ${destino?.nome ?? ""}`
                    : "Mapeie os campos obrigatórios para importar"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
