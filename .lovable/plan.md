

## Fase 1 — Auditoria de Segurança e Dados

### Objetivo
Validar que o PixelSafe está pronto para produção do ponto de vista de segurança: isolamento entre workspaces, integridade de pagamentos, proteção de dados sensíveis e do Cofre Digital.

### O que vou executar (read-only nesta fase)

**1. Scans automatizados**
- `supabase--linter` — RLS desabilitado, policies permissivas, índices ausentes, funções sem `search_path`.
- `security--run_security_scan` + `security--get_scan_results` — exposição de dados, configuração Auth.

**2. Auditoria manual de RLS (tabela por tabela)**
Verificar isolamento por `workspace_id` em: `workspaces`, `workspace_members`, `workspace_payment_tokens`, `profiles`, `clients`, `proposals`, `contracts`, `payment_sessions`, `payment_events`.
Pontos específicos a validar:
- `profiles` não tem policy DELETE — confirmar se é intencional.
- `workspaces` permite UPDATE só por owner — confirmar que admins não-owners não conseguem mudar dados de billing.
- `payment_events` / `payment_sessions` — clientes anônimos não devem ler.
- Tabelas com PII (`clients.email`, `clients.phone`, `clients.document`) — confirmar que só membros do workspace acessam.

**3. Storage bucket `vault`**
- Listar policies do bucket.
- Confirmar que cliente anônimo só baixa via `get-deliverable-url` quando `is_fully_paid = true`.
- Confirmar que upload é restrito a membros do workspace.

**4. Auditoria de Edge Functions (9 funções)**
Para cada uma, checar: validação de JWT, validação de input (Zod ou manual), autorização (workspace_member/admin), tratamento de erro, logs sem secrets, timeouts, idempotência quando aplicável.

| Função | Foco principal |
|---|---|
| `mp-webhook` | Idempotência, validação cruzada com API MP, sem secret em log |
| `asaas-webhook` | Validação de token (já existe), idempotência |
| `generate-payment` | Autorização do designer, validação de contract_id |
| `create-asaas-checkout` | Verificar que usuário é admin do workspace |
| `cancel-asaas-subscription` | Já verifica admin — confirmar |
| `get-asaas-subscription-info` | Já verifica membership — confirmar |
| `list-asaas-payments` | Já verifica membership — confirmar |
| `get-deliverable-url` | Lógica anon vs autenticado (já parece correta — confirmar) |
| `generate-proposal` | Rate limit (proteger custo OpenAI), validação de input, autorização |

**5. Frontend — exposição de secrets e dados**
- Buscar `console.log` que vaze tokens, emails, IDs sensíveis.
- Buscar uso de `dangerouslySetInnerHTML` sem `DOMPurify`.
- Confirmar que rotas públicas (`/p/:id`, `/c/:id`) usam apenas RPCs `get_public_*` e nunca consultam tabelas diretamente.
- Conferir que `.env` só contém chaves públicas (anon, project_id) — nunca service_role.

**6. RPCs SECURITY DEFINER**
Confirmar que todas têm `SET search_path = public` (proteção contra schema injection) — visível nas db functions.

**7. Validação de inputs no frontend**
Conferir uso de Zod nos formulários críticos (clientes, propostas, contratos, assinatura digital).

### Entregável
Relatório consolidado com formato:

```
🔴 CRÍTICO (bloqueia produção)
  - [Finding] descrição + arquivo + correção sugerida

🟡 IMPORTANTE (corrigir nas próximas semanas)
  - ...

🟢 SAUDÁVEL (boas práticas / longo prazo)
  - ...

✅ APROVADO
  - lista do que está correto e validado
```

Para cada finding 🔴 vou propor a correção exata (SQL de migration ou diff de código) — você decide se aplica antes de avançar para a Fase 2.

### O que NÃO faz parte desta fase
- Refatoração de código (Fase 2).
- Performance e índices de carga (Fase 3).
- Testes automatizados (projeto separado depois).
- Validação jurídica dos templates (precisa advogado).

### Tempo estimado
~10–15 minutos de execução de tools + leitura. O relatório vem em uma única resposta consolidada.

### Como prosseguir
Ao aprovar este plano, eu saio do modo planejamento, executo as 7 verificações acima em paralelo onde possível, e devolvo o relatório completo com findings classificados e correções prontas para você escolher quais aplicar.

