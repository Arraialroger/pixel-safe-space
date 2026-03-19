

# Plano: Ponte Proposta → Contrato

## Resumo

Remover o PDF da proposta, adicionar botao "Gerar Contrato" (apenas quando `accepted`), criar a pagina `ContratoDetalhe.tsx` com formulario de edicao, e registrar a rota `/contratos/:id`.

## 1. PropostaDetalhe.tsx - Mudancas

**Remover:**
- Import `ContratoPDF`, `html2pdf.js`, `FileDown`, `useRef`
- Estado `generatingPdf`, `pdfRef`
- Funcao `handleDownloadPdf`
- Botao "Baixar Contrato (PDF)"
- Bloco hidden PDF template (linhas 337-352)
- Tipo `WorkspaceInfo` e estado `workspace` (nao mais necessarios)
- Fetch de workspace/logo no useEffect

**Adicionar:**
- Estado `generatingContract` (boolean)
- Funcao `handleGenerateContract`: faz SELECT da proposta para pegar `summary`, `client_id`, `workspace_id`; parseia o summary usando os headers Markdown (`## Entregáveis Rígidos`, `## Exclusões`, `## Limites de Revisão`) para extrair cada secao; se o parse falhar, coloca o summary inteiro em `content_deliverables`; faz INSERT na tabela `contracts`; redireciona para `/contratos/{new_id}`
- Botao "Gerar Contrato" visivel apenas quando `isAccepted`, com icone `FileCheck`

**Parse do summary** (formato conhecido das linhas 145-152 de PropostaNova):
```
## Contexto e Dores do Cliente\n...
## Objetivos de Negócio\n...
## Entregáveis Rígidos\n...
## Exclusões\n...
## Limites de Revisão\n...
## Estrutura de Investimento\n...
```
Regex split por `## ` headers para extrair as 3 secoes relevantes.

## 2. Nova Pagina ContratoDetalhe.tsx

**Rota:** `/contratos/:id` (protegida)

**Dados:** Fetch do contrato por `id` + `workspace_id`, join com `clients(name)`.

**UI:**
- Header com botao voltar para `/contratos`, titulo "Contrato - {client_name}", Badge de status
- Card com formulario:
  - `Textarea` para `content_deliverables` (label: "Entregáveis (Cláusula 1)")
  - `Textarea` para `content_exclusions` (label: "Exclusões")
  - `Textarea` para `content_revisions` (label: "Regras de Revisão")
  - `Input type=number` para `payment_value` (label: "Valor Total")
  - `Input type=url` para `payment_link` (label: "Link de Pagamento da Entrada")
- Botao "Salvar Rascunho" (UPDATE na tabela contracts)
- Botao "Preparar Link de Assinatura" (UPDATE status para `pending_signature`), visivel apenas quando status = `draft`

## 3. App.tsx - Nova Rota

Adicionar import de `ContratoDetalhe` e rota protegida `/contratos/:id`.

## 4. Contratos.tsx - Links nas Linhas

Tornar as linhas da tabela clicaveis, navegando para `/contratos/{id}`.

## Arquivos

| Arquivo | Acao |
|---------|------|
| `src/pages/PropostaDetalhe.tsx` | Remover PDF, adicionar "Gerar Contrato" |
| `src/pages/ContratoDetalhe.tsx` | Criar (nova pagina) |
| `src/App.tsx` | Adicionar rota `/contratos/:id` |
| `src/pages/Contratos.tsx` | Linhas clicaveis |

