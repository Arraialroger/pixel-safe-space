

# Plano: WhatsApp CTA + Remover Aprovacao + Liberar "Gerar Contrato"

## 1. Migration SQL — Coluna `whatsapp` em `workspaces`

```sql
ALTER TABLE public.workspaces ADD COLUMN whatsapp text;
```

## 2. ConfiguracoesWorkspace.tsx — Campo WhatsApp

- Adicionar `whatsapp` ao schema Zod (string, max 20, opcional)
- Adicionar ao `defaultValues`, ao `form.reset()` no load, e ao `onSubmit` update
- Novo campo no card "Dados do Estudio" com label "WhatsApp de Contato" e placeholder "5511999999999"

## 3. PropostaPublica.tsx — Substituir aprovacao por WhatsApp CTA

**Remover:**
- Import de `useForm`, `zodResolver`, `z`, `Dialog`, `Form`, etc.
- Estado `dialogOpen`, `submitting`, schema `acceptSchema`, funcao `handleAccept`
- Bloco de dialog de aceite e botao "Aceitar Proposta"

**Adicionar:**
- Fetch do `whatsapp` do workspace via RPC `get_workspace_public` (precisa atualizar a RPC para incluir `whatsapp`, ou usar `get_workspace_contract_info` que ja expoe dados extras)
- Botao verde WhatsApp: link para `https://wa.me/{whatsapp}?text={mensagem_codificada}`
- Mensagem: `Olá! Acabei de ler a proposta "${title}" e gostaria de conversar para definirmos o melhor pacote.`
- Se sem WhatsApp: ocultar botao ou mostrar fallback

**RPC update:** Atualizar `get_workspace_contract_info` para incluir `whatsapp`, ou criar nova RPC. Mais simples: usar `get_workspace_contract_info` que ja e SECURITY DEFINER e adicionar `w.whatsapp` ao SELECT.

## 4. PropostaDetalhe.tsx — "Gerar Contrato" visivel em `pending`

Mudar a condicao do botao de `isAccepted` para `isPending || isAccepted`:
```tsx
{(isPending || isAccepted) && (
  <Button onClick={handleGenerateContract} ...>Gerar Contrato</Button>
)}
```

## 5. Edge Function — Atualizar "Proximos Passos"

No `systemPrompt`, substituir a ultima linha `Próximos Passos` por:

```
Próximos Passos (Instrua o leitor a clicar no botão de WhatsApp abaixo da proposta para esclarecer dúvidas, negociar detalhes e escolher a opção ideal. NÃO peça para o cliente assinar ou aprovar a proposta nesta seção.)
```

## 6. Migration para atualizar RPC

```sql
CREATE OR REPLACE FUNCTION public.get_workspace_contract_info(_workspace_id uuid)
  RETURNS TABLE(id uuid, name text, logo_url text, company_document text, company_address text, whatsapp text)
  ...
  SELECT w.id, w.name, p.logo_url, w.company_document, w.company_address, w.whatsapp
  FROM public.workspaces w
  LEFT JOIN public.profiles p ON p.id = w.owner_id
  WHERE w.id = _workspace_id;
```

## Arquivos

| Arquivo | Acao |
|---------|------|
| Migration SQL | `whatsapp` em workspaces + atualizar RPC |
| `src/pages/ConfiguracoesWorkspace.tsx` | Campo WhatsApp |
| `src/pages/PropostaPublica.tsx` | Remover aprovacao, adicionar CTA WhatsApp |
| `src/pages/PropostaDetalhe.tsx` | Botao "Gerar Contrato" em pending |
| `supabase/functions/generate-proposal/index.ts` | Atualizar instrucao "Proximos Passos" |

