# Sprint 3: Authorization + Rate Limiting ✅

## O que foi implementado

### 1. Rate Limiting (`lib/auth/rate-limiter.ts`)

**Proteção contra brute force:**
- LOGIN: 5 tentativas em 15 minutos
- SIGNUP: 3 tentativas em 1 hora
- IMPORT: 10 imports em 1 hora

**Features:**
- Rate limit por IP (x-forwarded-for ou x-real-ip)
- Cleanup automático de entradas expiradas
- `RateLimitError` customizado com retry-after

**Uso:**
```typescript
await checkRateLimit("LOGIN");
// Se exceder limite, lança RateLimitError

// Após sucesso:
await resetRateLimit("LOGIN");
```

**Integração em auth.ts:**
```typescript
export async function signIn(_prev, formData) {
  await checkRateLimit("LOGIN");  // ← Verifica limite
  // ... autenticação ...
  await resetRateLimit("LOGIN");  // ← Reseta após sucesso
}
```

### 2. Authorization (`lib/auth/authorization.ts`)

**Role-Based Access Control (RBAC):**
```typescript
type UserRole = "admin" | "gerente" | "consultor" | "leitor";

const RoleHierarchy = {
  admin: 4,
  gerente: 3,
  consultor: 2,
  leitor: 1,
};
```

**Funções de verificação:**

#### `requireRole(user, roles)`
```typescript
await requireRole(user, "admin");        // Requer admin
await requireRole(user, ["admin", "gerente"]);  // Aceita múltiplos
```

#### `requireAdminOrOwner(user, ownerId)`
```typescript
// Só admin ou dono pode acessar
await requireAdminOrOwner(user, resource.user_id);
```

#### `requireCampanhaAccess(user, campanhaId)`
```typescript
// Verifica se user tem acesso à campanha
await requireCampanhaAccess(user, "campanha-uuid");
```

#### `hasHigherOrEqualRole(userRole, required)`
```typescript
if (hasHigherOrEqualRole("gerente", "consultor")) {
  // true - gerente tem nível >= consultor
}
```

### 3. Row-Level Security (RLS) - SQL

**Arquivo:** `supabase/migrations/0009_rls_row_level_security.sql`

**Tabelas protegidas:**
- `profiles` - Usuários veem apenas seu perfil (admins veem todos)
- `campanhas` - Acesso baseado em `campanha_access` table
- `municipios` - Apenas gerentes/admins podem criar/editar
- `bairros` - Apenas gerentes/admins podem modificar
- `zonas` - Apenas gerentes/admins podem modificar
- `secoes` - Consultores/gerentes/admins podem modificar

**RLS Policies:**
```sql
-- Exemplo: Usuários veem campanhas que têm acesso
CREATE POLICY "Users can view campanhas they have access to"
  ON campanhas FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM campanha_access ca
      WHERE ca.campanha_id = campanhas.id
      AND ca.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin')
  );

-- Exemplo: Apenas admins podem criar
CREATE POLICY "Only admins can create campanhas"
  ON campanhas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin')
  );
```

### 4. Audit Logging

**Nova tabela:** `audit_log`

Campos:
- `user_id` - Quem fez a ação
- `action` - CREATE, UPDATE, DELETE, LOGIN, etc
- `table_name` - Qual tabela foi alterada
- `record_id` - Qual registro foi alterado
- `old_values` - Valores anteriores (JSON)
- `new_values` - Novos valores (JSON)
- `ip_address` - IP de origem
- `user_agent` - Navegador/client info
- `created_at` - Quando aconteceu

**Função helper:**
```typescript
await audit_action(
  userId,
  "UPDATE",
  "municipios",
  municipioId,
  { nome: "Antigo Nome" },  // old_values
  { nome: "Novo Nome" },    // new_values
  "192.168.1.1"             // ip_address
);
```

---

## Como usar nos Server Actions

### Exemplo Completo: Criar Município com Autorização

```typescript
import { 
  protectedAction, 
  requireRole, 
  validateInput 
} from "@/lib/auth";

export async function createMunicipio(_prev, formData) {
  try {
    return await protectedAction(async (user) => {
      // 1. Verificar role
      await requireRole(user, ["admin", "gerente"]);

      // 2. Validar input
      const validated = validateInput(CreateMunicipioSchema, formDataObj);

      // 3. Executar ação
      const supabase = await createClient();
      const { error } = await supabase
        .from("municipios")
        .insert({ ...validated });

      if (error) throw error;

      // 4. (Opcional) Registrar no audit log
      // await audit_action(user.id, "CREATE", "municipios", ...);

      return { error: null };
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { error: error.message };  // "Seu role não tem permissão..."
    }
    // ... tratamento de outros erros
  }
}
```

---

## Estrutura de Autorização

### Níveis de Acesso (hierarquia)

```
┌─────────────────────────────────────┐
│           ADMIN (4)                 │
│  • Gerencia usuários                │
│  • Criar/editar campanhas           │
│  • Acessar tudo                     │
│  • Ver audit logs de todos          │
└─────────────────────────────────────┘
            ↓ herda todos
┌─────────────────────────────────────┐
│         GERENTE (3)                 │
│  • Criar/editar territórios         │
│  • Ver/editar metas                 │
│  • Importar dados                   │
└─────────────────────────────────────┘
            ↓ herda todos
┌─────────────────────────────────────┐
│        CONSULTOR (2)                │
│  • Criar/editar seções              │
│  • Ver rankings/relatórios          │
│  • Adicionar observações            │
└─────────────────────────────────────┘
            ↓ herda todos
┌─────────────────────────────────────┐
│         LEITOR (1)                  │
│  • Ver dados (read-only)            │
└─────────────────────────────────────┘
```

---

## Checklist - Sprint 3 Implementado

- [x] Rate limiting implementado (login, signup, import)
- [x] Rate limiter por IP com cleanup automático
- [x] RBAC (Role-Based Access Control) criado
- [x] Funções de autorização (requireRole, etc)
- [x] RLS policies criadas em SQL
- [x] Audit logging table criada
- [x] Integração em auth.ts (signIn/signUp)
- [x] Exports centralizados em lib/auth/index.ts

---

## Próximas Ações

1. **Aplicar requireRole() em servidor Actions críticas:**
   - territorio.ts: criar/editar/deletar (require: admin, gerente)
   - campanhas.ts: criar/editar (require: admin)
   - importacao.ts: (require: admin, gerente)

2. **Aplicar RLS policies no Supabase:**
   - Rodar migration 0009
   - Testar políticas

3. **Sprint 4: Security Headers**
   - CORS headers
   - CSP policy
   - HSTS
   - Testes de segurança

---

## Status

✅ **Sprint 3 - 50% Completo**

Implementado:
- Rate limiting
- Authorization framework
- RLS policies (SQL)
- Audit logging

Faltando:
- Aplicar requireRole() em todas actions
- Testar RLS no Supabase
- Integrar audit logging nas actions

---

**Total de código adicionado:** ~400 linhas
**Segurança melhorada:** Crítica → Média
