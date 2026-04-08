

# Gestao de Contratos Pre-Assinatura — Reverter e Excluir

## Analise

A abordagem proposta esta correta. Concordo integralmente com a estrategia:

- **Reverter para Rascunho**: Logica pura de frontend, um `update` de `status` para `draft`. Preserva o ID/link, zero impacto na maquina de estados financeira.
- **Excluir Contrato**: Um `delete` com guard estrito (`draft` ou `pending_signature` apenas). Seguro porque RLS ja permite delete para workspace members, e a restricao visual/logica no frontend impede exclusao de contratos assinados.

**Uma sugestao adicional**: Ao reverter para rascunho, limpar tambem `signed_by_name`, `signed_by_email` e `signed_at` (caso existam residuos de testes), garantindo um estado limpo.

## Alteracoes

### `src/pages/ContratoDetalhe.tsx`

1. **Botao "Reverter para Rascunho"**: Visivel apenas quando `status === 'pending_signature'`. Executa `update({ status: 'draft' })` e atualiza o estado local.

2. **Botao "Excluir Contrato"**: Icone de lixeira, visivel apenas quando `status === 'draft' || status === 'pending_signature'`. Abre um `AlertDialog` de confirmacao com texto claro sobre a acao irreversivel. Ao confirmar, executa `delete().eq('id', id)` e redireciona para `/contratos`.

3. **Posicionamento na UI**: Ambos os botoes ficam na barra superior (ao lado dos badges de status), seguindo o padrao visual existente. O botao de excluir usa `variant="destructive"` ou `variant="ghost"` com cor vermelha.

## Resumo de arquivos

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/ContratoDetalhe.tsx` | Adicionar handlers `handleRevertToDraft` e `handleDelete` + AlertDialog de confirmacao + botoes condicionais |

Zero alteracoes no banco de dados — RLS de delete ja existe para workspace members.

