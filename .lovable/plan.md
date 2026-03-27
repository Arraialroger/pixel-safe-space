

# Mascaras de Input + RLS do Storage

## Concordancia

Concordo 100% com as 3 correcoes. Apenas uma sugestao: no WhatsApp, incluir o DDI `+55` na mascara visual para ficar `+55 (00) 00000-0000`, mas sanitizar para salvar apenas os digitos (ex: `5511999999999`). Isso mantem compatibilidade com links `wa.me/`.

---

## 1. Mascaras e Sanitizacao (ConfiguracoesWorkspace.tsx)

Reutilizar as funcoes `maskDocument` e `maskPhone` que ja existem no `ClientFormDialog.tsx` (copiar para o arquivo ou extrair para um utilitario compartilhado).

### Alteracoes:
- Adicionar funcoes `maskDocument(value)` e `maskWhatsApp(value)` no topo do arquivo
- `maskWhatsApp`: formata como `+55 (11) 99999-0000` (inclui DDI)
- Nos campos `company_document` e `whatsapp`, usar `onChange` customizado que aplica a mascara visual
- No `onSubmit`, sanitizar com `.replace(/\D/g, '')` antes de enviar ao Supabase
- Atualizar placeholder do endereco para `Rua Esperança, 83 - Centro, São Paulo/SP - CEP 00000-000`
- Aumentar `max` do schema de whatsapp para 25 (a mascara adiciona caracteres)

## 2. RLS do Bucket `logos` (Migration SQL)

O bucket `logos` ja existe e e publico, mas faltam as politicas RLS em `storage.objects`. A migration criara:

```sql
-- SELECT: qualquer pessoa pode ver (bucket publico)
CREATE POLICY "Public read logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

-- INSERT: usuario autenticado pode fazer upload no path do seu workspace
CREATE POLICY "Authenticated upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'logos'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.workspaces
    WHERE owner_id = auth.uid()
  )
);

-- UPDATE (upsert): mesmo criterio do INSERT
CREATE POLICY "Authenticated update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'logos'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.workspaces
    WHERE owner_id = auth.uid()
  )
);

-- DELETE: mesmo criterio
CREATE POLICY "Authenticated delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'logos'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.workspaces
    WHERE owner_id = auth.uid()
  )
);
```

A politica usa `storage.foldername(name)[1]` para extrair o workspace_id do path (`{workspace_id}/logo.png`) e verificar que o usuario autenticado e o owner daquele workspace.

---

## Arquivos Alterados

| Arquivo | Alteracao |
|---------|-----------|
| Migration SQL | Politicas RLS para bucket `logos` |
| `ConfiguracoesWorkspace.tsx` | Mascaras visuais + sanitizacao no submit + placeholder endereco |

