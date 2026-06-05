# Diário de Bordo de Exploradores

## Visão geral
Aplicação PWA para cadastro de descobertas de campo com suporte offline, registro fotográfico nativo, filtros e dashboard.

## Recursos implementados
- login e cadastro via Supabase Auth
- cadastro de descoberta com título, descrição, categoria e raridade
- captura de até 3 imagens usando a câmera nativa do dispositivo
- armazenamento local com sincronização automática quando online
- lista de registros com busca, filtros e favoritos
- dashboard de métricas: total, raridade e sincronização
- interface mobile-friendly com estilo profissional

## Estrutura de arquivos
- `index.html` - interface do app PWA
- `style.css` - estilos modernos e responsivos
- `app.js` - lógica de cadastro, offline, câmera e sincronização
- `config.js` - credenciais Supabase
- `supabase-schema.sql` - criação da tabela `tarefas` em português
- `service-worker.js` - cache para funcionamento offline
- `manifest.json` - configurações de PWA

## Configuração Supabase
1. Crie um projeto no Supabase.
2. Crie a tabela usando `atendimento-off-camera/supabase-schema.sql`.
3. Copie a `URL` e a `public anon key` para `config.js`.
4. Habilite Realtime/Auth no Supabase.
5. Crie um bucket de Storage chamado `images` (ou atualize `app.js` com outro nome).
	- No painel Supabase: Storage → Create new bucket → nome `images`.
	- Defina como pública ou use URLs assinadas conforme sua política de segurança.

## Teste local
Use um servidor estático no diretório `atendimento-off-camera`:

```bash
cd "c:\Users\caio-\OneDrive\Documentos\tarefa-mobile-emerson\atendimento-off-camera"
python -m http.server 8000
```

Depois abra `http://localhost:8000` no navegador.

## Deploy
- Execute em Vercel importando o diretório `atendimento-off-camera`.
- Use `vercel.json` para deploy estático.
- Configure variáveis de ambiente se desejar esconder a chave Supabase.

## Observações
- O app salva dados localmente e tenta sincronizar registros pendentes quando a conexão estiver disponível.
- A câmera é acionada pelo campo de upload de imagens com `capture="environment"`.
