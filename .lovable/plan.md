

# Plano: Máscaras de Input + Formulário Estruturado de Briefing com 6 Campos + Nova Edge Function

## 1. Máscaras de Input no Formulário de Clientes

**Arquivo:** `src/components/clientes/ClientFormDialog.tsx`

- Implementar funções de máscara inline (sem dependência externa) para CPF/CNPJ e Telefone
- CPF: `000.000.000-00` / CNPJ: `00.000.000/0000-00` — detecção automática pelo tamanho
- Telefone: `(00) 00000-0000` ou `(00) 0000-0000`
- Aplicar via `onChange` interceptor nos campos `document` e `phone`

## 2. Reformulação do Formulário em PropostaNova.tsx

**Arquivo:** `src/pages/PropostaNova.tsx`

- Remover campo `summary` do schema Zod
- Adicionar 6 novos campos obrigatórios ao schema:
  - `context` — "Contexto e Dores do Cliente"
  - `objectives` — "Objetivos de Negócio"
  - `deliverables` — "Entregáveis Rígidos"
  - `exclusions` — "Exclusões"
  - `revisions` — "Limites de Revisão"
  - `pricing_tiers` — "Estrutura de Investimento"
- Todos como `z.string().min(1, "Campo obrigatório")` com `<Textarea>`
- Card "Gerador de Escopo com IA" exibirá os 6 campos em vez do campo único

**handleGenerateScope:** Validar que todos os 6 campos estão preenchidos. Enviar os 6 campos individuais + `deadline` + `language` no body da invocação.

**onSubmit:** Concatenar os 6 campos numa string formatada e salvar na coluna `summary`:
```
## Contexto\n{context}\n\n## Objetivos\n{objectives}\n\n...
```

## 3. Reescrita da Edge Function

**Arquivo:** `supabase/functions/generate-proposal/index.ts`

- Receber: `context`, `objectives`, `deliverables`, `exclusions`, `revisions`, `pricing_tiers`, `deadline`, `language`
- Validar que `context` não está vazio (campo mínimo obrigatório)
- Substituir `systemPrompt` e `userPrompt` pelos textos exatos fornecidos pelo usuário
- Manter conexão direta com `api.openai.com` e `OPENAI_API_KEY`
- Manter JWT validation manual, CORS headers, e tratamento de erros existente
- Aumentar `max_tokens` para 3000 (prompt mais complexo gera respostas maiores)

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/components/clientes/ClientFormDialog.tsx` | Máscaras CPF/CNPJ e Telefone |
| `src/pages/PropostaNova.tsx` | 6 campos estruturados, novo payload, concatenação no save |
| `supabase/functions/generate-proposal/index.ts` | Novos parâmetros, prompts reescritos |

Nenhuma migração de banco necessária — os 6 campos são concatenados e salvos na coluna `summary` existente.

