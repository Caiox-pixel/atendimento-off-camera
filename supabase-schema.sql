CREATE TABLE IF NOT EXISTS public.tarefas (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id uuid NOT NULL,
  titulo text,
  descricao text,
  categoria text,
  raridade text,
  favorito boolean DEFAULT false,
  fotos jsonb DEFAULT '[]'::jsonb,
  criado_em timestamptz DEFAULT now(),
  sincronizado boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS tarefas_usuario_id_idx ON public.tarefas (usuario_id);
CREATE INDEX IF NOT EXISTS tarefas_criado_em_idx ON public.tarefas (criado_em);

ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "selecionar_para_proprietario" ON public.tarefas
  FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "inserir_para_autenticados" ON public.tarefas
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "atualizar_para_proprietario" ON public.tarefas
  FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "deletar_para_proprietario" ON public.tarefas
  FOR DELETE
  USING (auth.uid() = usuario_id);


-- =====================================
-- Tabela de perfis de usuário
-- Guarda informações de perfil associadas ao Supabase Auth
-- =====================================
CREATE TABLE IF NOT EXISTS public.usuarios (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  nome text,
  criado_em timestamptz DEFAULT now()
);

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "selecionar_para_proprietario" ON public.usuarios
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "inserir_para_autenticados" ON public.usuarios
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "atualizar_para_proprietario" ON public.usuarios
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "deletar_para_proprietario" ON public.usuarios
  FOR DELETE
  USING (auth.uid() = id);
