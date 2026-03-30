-- ═══════════════════════════════════════════════════
--  FACILITE — SUPABASE SCHEMA
--  Execute este SQL no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════

-- Tabela principal: armazena dados do usuário como key-value
CREATE TABLE IF NOT EXISTS user_data (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key        TEXT NOT NULL,
  value      JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, key)
);

-- Segurança: cada usuário só acessa seus próprios dados
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own data"
  ON user_data FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Índice para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_user_data_user_key ON user_data(user_id, key);
