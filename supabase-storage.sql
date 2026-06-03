-- Arquivo: supabase-storage.sql
-- Cria tabela de metadados para imagens armazenadas no bucket de Storage
-- Ajuste o nome do bucket no frontend para corresponder (ex: tarefas-photos)

CREATE TABLE IF NOT EXISTS public.fotos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id uuid NOT NULL,
  tarefa_id bigint,
  storage_path text NOT NULL,
  public_url text,
  tamanho bigint,
  content_type text,
  criado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fotos_usuario_id_idx ON public.fotos (usuario_id);
CREATE INDEX IF NOT EXISTS fotos_tarefa_id_idx ON public.fotos (tarefa_id);

ALTER TABLE public.fotos ENABLE ROW LEVEL SECURITY;

-- Somente o proprietário (auth.uid()) pode selecionar suas fotos
CREATE POLICY "selecionar_para_proprietario" ON public.fotos
  FOR SELECT
  USING (auth.uid() = usuario_id);

-- Inserção permitida para usuários autenticados; garante que o usuario_id seja o do auth
CREATE POLICY "inserir_para_autenticados" ON public.fotos
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

-- Atualização somente pelo proprietário
CREATE POLICY "atualizar_para_proprietario" ON public.fotos
  FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

-- Remoção somente pelo proprietário
CREATE POLICY "deletar_para_proprietario" ON public.fotos
  FOR DELETE
  USING (auth.uid() = usuario_id);

-- (Opcional) Se desejar vincular com a tabela tarefas, habilite FK abaixo
-- ALTER TABLE public.fotos
--   ADD CONSTRAINT fotos_tarefas_fkey FOREIGN KEY (tarefa_id) REFERENCES public.tarefas(id) ON DELETE CASCADE;

-- Observações:
-- - Depois de criar o bucket (ex: `tarefas-photos`) no painel Supabase Storage,
--   o frontend deve enviar os blobs para esse bucket e armazenar o `storage_path` e `public_url` nesta tabela
-- - Você pode optar por gerar URLs assinadas no backend ou frontend usando os métodos da API de Storage
