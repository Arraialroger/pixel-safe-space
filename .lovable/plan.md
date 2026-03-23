

# Plano: Lapidacao UX + ROADMAP.md

## ACAO 1: Melhorias de UX (5 itens)

### 1.1 WhatsApp Clicavel na Tabela de Clientes
**Arquivo:** `src/components/clientes/ClientTable.tsx`
- Na coluna "Telefone", se `c.phone` existir, renderizar como link `<a href="https://wa.me/{phone_limpo}" target="_blank">` com icone de WhatsApp
- `phone_limpo` = `c.phone.replace(/\D/g, "")`

### 1.2 WhatsApp Clicavel na Tabela de Propostas
**Arquivo:** `src/pages/Propostas.tsx`
- Adicionar `client_phone` ao tipo `ProposalWithClient` e ao SELECT (ja faz JOIN em `clients`)
- Adicionar coluna "WhatsApp" na tabela com link clicavel
- Adicionar coluna "Data de Criacao" formatada com `date-fns`

### 1.3 Aviso de Seguranca nas Credenciais
**Arquivo:** `src/pages/ConfiguracoesWorkspace.tsx`
- Adicionar texto muted com icone de cadeado abaixo do card de Integracoes: "Seus dados sao criptografados de ponta a ponta. O PixelSafe nao tem acesso a sua conta."

### 1.4 Excluir Proposta
**Arquivo:** `src/pages/PropostaDetalhe.tsx`
- Adicionar botao "Excluir" (vermelho, icone Trash2) no header de acoes
- Modal de confirmacao usando `AlertDialog`
- Ao confirmar: `supabase.from("proposals").delete().eq("id", id)` + navegar para `/propostas`

### 1.5 Bug-fix Logo nas Paginas Publicas
**Arquivos:** `src/pages/PropostaPublica.tsx` e `src/pages/ContratoPublico.tsx`
- A RPC `get_workspace_contract_info` retorna `logo_url` do `profiles` (owner). Verificar que o `<img>` usa a URL correta
- Atualmente ja renderiza `proposal.workspace_logo` e `workspace.logo_url` — o codigo esta correto
- Garantir que a tag `<img>` tenha fallback adequado (ja tem: mostra nome textual se logo null)
- Nenhuma mudanca necessaria aqui — o fluxo ja funciona. Apenas confirmar.

## ACAO 2: ROADMAP.md

Criar arquivo `ROADMAP.md` na raiz do projeto com o conteudo exato fornecido pelo usuario (Fases 5 a 8).

## Arquivos Modificados

| Arquivo | Acao |
|---------|------|
| `src/components/clientes/ClientTable.tsx` | WhatsApp clicavel |
| `src/pages/Propostas.tsx` | Colunas Data + WhatsApp |
| `src/pages/ConfiguracoesWorkspace.tsx` | Aviso seguranca |
| `src/pages/PropostaDetalhe.tsx` | Botao excluir + modal |
| `ROADMAP.md` | Criar arquivo |

