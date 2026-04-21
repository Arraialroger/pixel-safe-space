

## Plano: Hardening mínimo do upload no Cofre

### Escopo
Três melhorias pequenas e seguras em `src/pages/ContratoDetalhe.tsx`, no `handleFileUpload`. Nenhuma mudança de schema, RPC, RLS, Edge Function ou outro arquivo.

### Mudanças

**1. Extração segura de extensão**
- Detectar se o nome do arquivo tem ponto. Se não tiver, usar fallback `bin`.
- Para nomes compostos (`entrega.tar.gz`), pegar apenas o último segmento.
- Sanitizar para letras/números/`.` e cortar em 10 caracteres (evita `filePath` inválido).

**2. Validação prévia de tamanho e tipo**
- Limite: **50 MB** (alinhado ao default do Supabase Storage).
- Tipos aceitos: `application/pdf`, `application/zip`, `application/x-zip-compressed`, `image/png`, `image/jpeg`, `image/webp`, `video/mp4`, `application/octet-stream` (cobre PSD/AI/figma exports).
- Se falhar: `toast.error` com mensagem clara e abortar antes de qualquer chamada de rede.

**3. Optimistic update do status**
- Logo após `supabase.storage.upload` retornar sucesso e `update` na tabela `contracts` resolver, atualizar localmente o estado do contrato no componente (ou invalidar a query do React Query) para refletir `execution_status='delivered'` na UI sem esperar refetch round-trip.

### O que NÃO entra neste plano
- Barra de progresso real (exige refactor para `XMLHttpRequest`/tus — escopo separado se decidirmos fazer).
- Suite de testes E2E (validação manual cobre os cenários críticos por enquanto).

### Plano de teste
1. Subir PDF de 2 MB → sucesso, UI muda para "Entregue" instantaneamente.
2. Tentar subir `.exe` ou arquivo de 80 MB → erro amigável, nenhuma chamada de rede.
3. Subir arquivo sem extensão (`teste`) → upload funciona com path `.../uuid.bin`, download do Cofre abre normalmente.
4. Baixar arquivo antigo (path legado `contracts/...`) → continua funcionando via `get-deliverable-url`.

### Garantia de não-quebra
- Nenhuma alteração em paths já existentes no Storage.
- Nenhuma policy/RLS tocada.
- Mudança isolada a uma única função em um único arquivo.

