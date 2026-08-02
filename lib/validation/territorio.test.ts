import { describe, expect, it } from "vitest";
import { CreateZonaSchema, CreateSecaoSchema } from "./territorio";

// Regression: these schemas declared z.number() while the dialogs submit via
// FormData, which is always strings. Every "Nova Zona" / "Nova Seção"
// submission was silently rejected, and nobody noticed because all data had
// arrived through CSV import rather than the dialogs.
describe("CreateZonaSchema", () => {
  it("aceita número vindo como texto do formulário", () => {
    const r = CreateZonaSchema.safeParse({ numero_zona: "113" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.numero_zona).toBe(113);
  });

  it("recusa zero e negativos", () => {
    expect(CreateZonaSchema.safeParse({ numero_zona: "0" }).success).toBe(false);
    expect(CreateZonaSchema.safeParse({ numero_zona: "-5" }).success).toBe(false);
  });

  it("recusa texto que não é número", () => {
    expect(CreateZonaSchema.safeParse({ numero_zona: "abc" }).success).toBe(false);
  });

  // A zona belongs to the estado (0024); the action resolves it server-side
  // rather than trusting the form, so no parent id is expected here.
  it("não exige id de município", () => {
    expect(CreateZonaSchema.safeParse({ numero_zona: "1" }).success).toBe(true);
  });
});

describe("CreateSecaoSchema", () => {
  // Zod 4 checks the UUID version bits, so a made-up "1111..." string is
  // rejected as malformed. This is a real v4 UUID.
  const zona = "0f65799e-d692-4c46-9f60-49f0b64980d9";

  it("aceita número vindo como texto do formulário", () => {
    const r = CreateSecaoSchema.safeParse({ numero_secao: "42", zona_id: zona });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.numero_secao).toBe(42);
  });

  it("exige zona válida", () => {
    expect(CreateSecaoSchema.safeParse({ numero_secao: "1", zona_id: "nao-uuid" }).success).toBe(
      false,
    );
  });

  it("aceita local de votação ausente", () => {
    expect(CreateSecaoSchema.safeParse({ numero_secao: "1", zona_id: zona }).success).toBe(true);
  });
});
