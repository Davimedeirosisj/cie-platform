-- ============================================================
-- Row-Level Security (RLS) Policies para Sprint 3
-- Essas policies garantem que usuários só vejam dados que têm permissão
-- ============================================================

-- Desabilitar anon access globalmente
ALTER ROLE anon SET statement_timeout = '5s';

-- ============================================================
-- Profiles Table - RLS
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can view all profiles (for team collaboration)"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can only update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- Campanhas Table - RLS
-- ============================================================
ALTER TABLE campanhas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view campanhas they have access to"
  ON campanhas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campanha_access ca
      WHERE ca.campanha_id = campanhas.id
      AND ca.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can create campanhas"
  ON campanhas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can update campanhas"
  ON campanhas FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================================
-- Municipios Table - RLS
-- ============================================================
ALTER TABLE municipios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view municipios of their campanhas"
  ON municipios FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campanhas
      WHERE id IN (
        SELECT campanha_id FROM campanha_access
        WHERE user_id = auth.uid()
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can create municipios"
  ON municipios FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'gerente')
    )
  );

CREATE POLICY "Only admins/gerentes can update municipios"
  ON municipios FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'gerente')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'gerente')
    )
  );

-- ============================================================
-- Bairros Table - RLS (similar pattern)
-- ============================================================
ALTER TABLE bairros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view bairros from their campanhas"
  ON bairros FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only gerentes/admins can modify bairros"
  ON bairros FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'gerente')
    )
  );

-- ============================================================
-- Zonas Table - RLS
-- ============================================================
ALTER TABLE zonas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view zonas from their campanhas"
  ON zonas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only gerentes/admins can modify zonas"
  ON zonas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'gerente')
    )
  );

-- ============================================================
-- Secoes Table - RLS
-- ============================================================
ALTER TABLE secoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view secoes from their campanhas"
  ON secoes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only consultores/gerentes/admins can modify secoes"
  ON secoes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'gerente', 'consultor')
    )
  );

-- ============================================================
-- Audit Logging Table
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, LOGIN, etc
  table_name VARCHAR(100),
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX idx_audit_log_action ON audit_log(action);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only view their own audit logs"
  ON audit_log FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================================
-- Função para registrar ações (para trigger de audit)
-- ============================================================
CREATE OR REPLACE FUNCTION audit_action(
  p_user_id UUID,
  p_action VARCHAR,
  p_table_name VARCHAR,
  p_record_id UUID,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values, ip_address)
  VALUES (p_user_id, p_action, p_table_name, p_record_id, p_old_values, p_new_values, p_ip_address);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION audit_action TO authenticated;

-- ============================================================
-- Grants apropriados
-- ============================================================
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON campanhas TO authenticated;
GRANT ALL ON municipios TO authenticated;
GRANT ALL ON bairros TO authenticated;
GRANT ALL ON zonas TO authenticated;
GRANT ALL ON secoes TO authenticated;
GRANT ALL ON audit_log TO authenticated;
