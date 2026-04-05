

# Central do Cofre — "Meu Cofre"

## Resumo

Nova pagina de leitura que lista todos os entregaveis (arquivos do Cofre) do workspace em uma unica central, eliminando a necessidade de navegar contrato por contrato.

## Analise do plano do CEO

O plano esta solido. Concordo com a abordagem e tenho apenas uma sugestao complementar:

**Sugestao**: Adicionar um campo de busca por nome do cliente ou titulo do projeto, seguindo o mesmo padrao ja usado em Propostas e Contratos (`useMemo` + filtro textual). Isso torna a central realmente escalavel quando o designer tiver dezenas de entregas.

## Alteracoes

### 1. Nova pagina `src/pages/Cofre.tsx`

- Query Supabase: `contracts` filtrado por `workspace_id` e `final_deliverable_url IS NOT NULL`
- JOIN com `clients(name)` e `proposals(title)` via select relacional
- Colunas da tabela:
  - Projeto (proposal title, com fallback para "Sem proposta vinculada")
  - Cliente (client name)
  - Data de Entrega (contract `updated_at`)
  - Status Financeiro (badge: Quitado se `is_fully_paid`, Entrada Paga se `status = partially_paid`, Assinado se `status = signed`)
  - Acoes: botao "Abrir" (nova aba) + botao "Copiar Link" (clipboard + toast)
- Busca textual por cliente ou projeto
- Paginacao client-side (10 itens, mesmo padrao de Propostas/Contratos)

### 2. Rota em `src/App.tsx`

- Adicionar rota `/cofre` protegida com `AppLayout`

### 3. Menu lateral em `src/components/AppSidebar.tsx`

- Adicionar item "Meu Cofre" com icone `FolderLock` (Lucide), posicionado abaixo de "Contratos"

## Impacto

- Zero alteracoes no backend, banco de dados ou maquina de estados
- Leitura pura usando RLS existente (`is_workspace_member`)
- Segue exatamente os padroes visuais e de codigo de `Propostas.tsx` e `Contratos.tsx`

## Arquivos modificados

| Arquivo | Tipo |
|---------|------|
| `src/pages/Cofre.tsx` | Novo |
| `src/App.tsx` | Editar (adicionar rota) |
| `src/components/AppSidebar.tsx` | Editar (adicionar item no menu) |

