import { z } from "zod";

// Empty-string coercion: optional lat/long form fields arrive as "" when
// left blank, which z.coerce.number() would turn into 0 -- treat blank as
// unset instead.
const optionalCoordinate = (bound: number, label: string) =>
  z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? Number(v) : undefined))
    .pipe(z.number().min(-bound, `${label} inválida`).max(bound, `${label} inválida`).optional());

export const CreateMunicipioSchema = z.object({
  nome: z
    .string()
    .min(1, "Nome é obrigatório")
    .max(255, "Nome não pode exceder 255 caracteres")
    .trim(),
  observacoes: z
    .string()
    .max(1000, "Observações não podem exceder 1000 caracteres")
    .optional()
    .default(""),
  latitude: optionalCoordinate(90, "Latitude"),
  longitude: optionalCoordinate(180, "Longitude"),
});

export const EditMunicipioSchema = CreateMunicipioSchema.extend({
  id: z.string().uuid("ID inválido"),
});

export const CreateBairroSchema = z.object({
  nome: z
    .string()
    .min(1, "Nome é obrigatório")
    .max(255, "Nome não pode exceder 255 caracteres")
    .trim(),
  municipio_id: z.string().uuid("Município inválido"),
  observacoes: z
    .string()
    .max(1000, "Observações não podem exceder 1000 caracteres")
    .optional()
    .default(""),
  latitude: optionalCoordinate(90, "Latitude"),
  longitude: optionalCoordinate(180, "Longitude"),
});

export const EditBairroSchema = CreateBairroSchema.extend({
  id: z.string().uuid("ID inválido"),
});

// z.coerce: these come from FormData, which is always strings -- a plain
// z.number() rejected every submission from the create dialogs.
// Zona hangs off the município: it spans many bairros (migration 0017).
export const CreateZonaSchema = z.object({
  numero_zona: z.coerce
    .number()
    .int("Número da zona deve ser um inteiro")
    .min(1, "Número da zona deve ser maior que 0")
    .max(9999, "Número da zona não pode exceder 9999"),
  // No parent id: a zona is scoped to the estado (0024), which the action
  // resolves server-side rather than trusting the form.
});

export const EditZonaSchema = CreateZonaSchema.extend({
  id: z.string().uuid("ID inválido"),
});

export const CreateSecaoSchema = z.object({
  numero_secao: z.coerce
    .number()
    .int("Número da seção deve ser um inteiro")
    .min(1, "Número da seção deve ser maior que 0")
    .max(9999, "Número da seção não pode exceder 9999"),
  local_votacao: z
    .string()
    .max(255, "Local de votação não pode exceder 255 caracteres")
    .optional()
    .default(""),
  endereco_local: z
    .string()
    .max(500, "Endereço não pode exceder 500 caracteres")
    .optional()
    .default(""),
  zona_id: z.string().uuid("Zona inválida"),
});

// Not CreateSecaoSchema.extend(...): the edit form (EditSecaoLocalForm) only
// ever submits id/local_votacao/endereco_local, never numero_secao/zona_id.
export const EditSecaoSchema = z.object({
  id: z.string().uuid("ID inválido"),
  local_votacao: z
    .string()
    .max(255, "Local de votação não pode exceder 255 caracteres")
    .optional()
    .default(""),
  endereco_local: z
    .string()
    .max(500, "Endereço não pode exceder 500 caracteres")
    .optional()
    .default(""),
});

export const CreateMetaSchema = z.object({
  nivel: z.enum(["municipio", "bairro", "zona", "secao"]),
  valor_meta: z
    .number()
    .int("Meta deve ser um inteiro")
    .min(0, "Meta não pode ser negativa"),
  municipio_id: z.string().uuid().optional().nullable(),
  bairro_id: z.string().uuid().optional().nullable(),
  zona_id: z.string().uuid().optional().nullable(),
  secao_id: z.string().uuid().optional().nullable(),
  observacoes: z
    .string()
    .max(1000, "Observações não podem exceder 1000 caracteres")
    .optional()
    .default(""),
});

export const EditMetaSchema = CreateMetaSchema.extend({
  id: z.string().uuid("ID inválido"),
});

// Shared by ObservacoesEditor for both municipios and bairros; the form
// always submits the record id under the generic field name "id".
export const ObservacoesEditorSchema = z.object({
  id: z.string().uuid("ID inválido"),
  observacoes: z
    .string()
    .max(1000, "Observações não podem exceder 1000 caracteres")
    .optional()
    .default(""),
});

export type CreateMunicipioInput = z.infer<typeof CreateMunicipioSchema>;
export type EditMunicipioInput = z.infer<typeof EditMunicipioSchema>;
export type CreateBairroInput = z.infer<typeof CreateBairroSchema>;
export type EditBairroInput = z.infer<typeof EditBairroSchema>;
export type CreateZonaInput = z.infer<typeof CreateZonaSchema>;
export type EditZonaInput = z.infer<typeof EditZonaSchema>;
export type CreateSecaoInput = z.infer<typeof CreateSecaoSchema>;
export type EditSecaoInput = z.infer<typeof EditSecaoSchema>;
export type CreateMetaInput = z.infer<typeof CreateMetaSchema>;
export type EditMetaInput = z.infer<typeof EditMetaSchema>;
export type ObservacoesEditorInput = z.infer<typeof ObservacoesEditorSchema>;
