
# Plano definitivo para colocar o PixelSafe em produção

## Parecer direto sobre o estado atual

O PixelSafe está em estágio avançado. A maior parte do produto já existe e funciona como um SaaS real:

- login e rotas internas protegidas;
- dashboard;
- clientes;
- propostas;
- contratos;
- assinatura digital;
- pagamentos de contrato via Mercado Pago;
- assinatura SaaS via Asaas;
- cofre privado para entregáveis;
- links públicos para clientes;
- paywall;
- white-label;
- multi-workspace.

O projeto não precisa de novas funcionalidades agora.

O que falta para produção não é “melhorar o produto”, e sim fechar segurança, validar fluxos críticos e publicar corretamente.

A partir daqui, o foco deve ser apenas:

```text
Segurança → Fluxo principal → Pagamentos → Publicação
```

Sem adicionar novas ideias, telas ou melhorias opcionais.

---

# O que falta obrigatoriamente para produção

## 1. Corrigir segurança/RLS do Supabase

Estado atual:

- As tabelas principais estão com RLS ativado.
- As rotas internas já exigem login.
- As rotas públicas de cliente continuam abertas corretamente:
  - `/p/:id`
  - `/c/:id`
- O bucket `vault` está privado.
- O linter do Supabase aponta apenas um aviso: Leaked Password Protection desativado.

Mas ainda há pontos obrigatórios de hardening antes de produção:

### O que corrigir

1. Restringir RPC interna que expõe dados do workspace.
   - Problema: `get_workspace_contract_info` pode ser chamada publicamente com um `workspace_id`.
   - Correção: ela deve ser usada apenas por usuários logados/membros do workspace.

2. Criar RPCs públicas específicas para páginas de cliente.
   - `/p/:id` deve receber apenas os dados necessários da proposta pública.
   - `/c/:id` deve receber apenas os dados necessários do contrato público.
   - O cliente não deve conseguir consultar dados internos do estúdio por `workspace_id`.

3. Restringir `accept_proposal`.
   - O fluxo atual usa WhatsApp, não aceite digital direto de proposta.
   - Essa função não deve continuar pública.

4. Endurecer permissões de update.
   - Garantir que clientes, propostas e contratos não possam ser movidos para outro workspace.

5. Recriar o trigger de sincronização.
   - Hoje não há triggers ativos no banco.
   - Precisa existir sincronização automática:
     - contrato assinado/entrada paga → proposta aceita;
     - contrato quitado → proposta concluída.

6. Adicionar integridade relacional mínima.
   - Criar foreign keys e índices entre:
     - workspaces;
     - workspace_members;
     - clients;
     - proposals;
     - contracts;
     - payment_sessions;
     - payment_events;
     - workspace_payment_tokens.

7. Ativar manualmente Leaked Password Protection no Supabase.
   - Isso é feito no painel Supabase.
   - Não é código.

Resultado esperado desta etapa:

```text
Usuário logado vê apenas seus próprios workspaces.
Cliente sem login vê apenas o link público recebido.
Atacante sem login não consegue consultar dados internos.
Cofre continua privado.
Pagamentos só funcionam em contrato válido.
```

---

## 2. Ajustar páginas públicas após a correção de segurança

Estado atual:

- `/p/:id` e `/c/:id` ainda usam `get_workspace_contract_info` para buscar dados do estúdio.
- Isso funciona, mas depende de uma RPC que precisa ser restringida.

### O que corrigir

1. Atualizar `PropostaPublica.tsx`.
   - Usar uma RPC pública segura específica para proposta.

2. Atualizar `ContratoPublico.tsx`.
   - Usar uma RPC pública segura específica para contrato.

3. Manter as páginas públicas sem login.
   - Clientes não devem precisar criar conta para ver proposta ou contrato.

Resultado esperado:

```text
Links públicos continuam funcionando.
Dados sensíveis ficam protegidos.
Nenhum cliente precisa fazer login.
```

---

## 3. Endurecer geração de pagamento de contrato

Estado atual:

- A função `generate-payment` é pública porque o cliente precisa pagar pelo link público do contrato.
- Isso está correto.
- Mas ela usa permissões elevadas no backend, então precisa validar melhor o estado do contrato.

### O que corrigir

1. Bloquear pagamento se o contrato estiver:
   - `draft`;
   - `pending_signature`;
   - `paid`.

2. Permitir entrada somente se:
   - contrato estiver `signed`;
   - existir valor de entrada.

3. Permitir saldo somente se:
   - contrato estiver `partially_paid`; ou
   - contrato estiver `signed` sem entrada;
   - e, quando aplicável, o entregável final já tiver sido enviado.

4. Impedir criação de sessões de pagamento duplicadas ou inválidas quando o estado do contrato não permitir.

Resultado esperado:

```text
Cliente só consegue pagar quando o contrato estiver no momento correto.
Não há cobrança indevida.
Não há sessão de pagamento inválida.
```

---

## 4. Testar o fluxo principal completo

Depois das correções de segurança, testar somente o fluxo essencial.

## Fluxo que precisa passar

```text
1. Criar conta
2. Entrar no sistema
3. Criar cliente
4. Criar proposta
5. Liberar proposta para cliente
6. Abrir link público da proposta
7. Gerar contrato a partir da proposta
8. Preparar contrato para assinatura
9. Abrir link público do contrato
10. Cliente assina contrato
11. Cliente paga entrada ou valor total
12. Webhook confirma pagamento
13. Designer envia arquivo final ao Cofre
14. Cliente paga saldo, se houver
15. Cliente consegue baixar arquivo final apenas após quitação
16. Dashboard e listagens refletem os status corretos
```

Se esse fluxo passar, o produto está funcionalmente pronto para uso real.

---

## 5. Validar assinatura SaaS do PixelSafe

O PixelSafe cobra o usuário do sistema via Asaas.

### O que validar

1. Criar checkout da assinatura.
2. Pagar ou simular pagamento no Asaas.
3. Confirmar que o webhook atualiza o workspace para `active`.
4. Confirmar que o paywall bloqueia workspace sem acesso.
5. Confirmar que plano `full_access` remove a marca d’água pública.

Resultado esperado:

```text
Usuário consegue assinar.
Workspace ativo libera uso.
Workspace vencido/bloqueado perde acesso de criação.
White-label funciona apenas para plano ativo.
```

---

## 6. Publicar em produção

Depois dos testes, fazer a publicação.

### O que fazer

1. Publicar/update do frontend no Lovable.
2. Confirmar domínio:
   - `https://app.pixelsafe.com.br`
3. Confirmar URLs públicas:
   - proposta pública;
   - contrato público;
   - retorno do Mercado Pago;
   - webhook Mercado Pago;
   - webhook Asaas.
4. Confirmar que as Edge Functions estão respondendo.
5. Fazer um teste real pequeno em produção.

Resultado esperado:

```text
PixelSafe acessível no domínio final.
Login funcionando.
Clientes acessando links públicos.
Pagamentos funcionando.
Cofre protegido.
```

---

# Cronograma objetivo

## Etapa 1 — Segurança Supabase/RLS

Objetivo: fechar exposição de dados e permissões antes do lançamento.

Tarefas:

```text
- Restringir RPC interna do workspace.
- Criar RPCs públicas seguras para proposta/contrato.
- Restringir accept_proposal.
- Endurecer políticas de update.
- Criar foreign keys e índices essenciais.
- Recriar trigger de sincronização.
- Ajustar páginas públicas para novas RPCs.
- Endurecer generate-payment.
```

Critério de conclusão:

```text
Rotas públicas continuam abrindo.
Rotas internas seguem protegidas.
Dados internos não ficam expostos publicamente.
Pagamento inválido é bloqueado.
```

---

## Etapa 2 — Teste funcional completo

Objetivo: validar o caminho real do usuário.

Tarefas:

```text
- Testar cadastro/login.
- Testar cliente.
- Testar proposta.
- Testar contrato.
- Testar assinatura pública.
- Testar pagamento.
- Testar envio ao Cofre.
- Testar download apenas após pagamento total.
- Testar dashboard/listagens.
```

Critério de conclusão:

```text
Fluxo Proposta → Contrato → Assinatura → Pagamento → Cofre funciona do início ao fim.
```

---

## Etapa 3 — Teste de assinatura do PixelSafe

Objetivo: validar monetização do SaaS.

Tarefas:

```text
- Testar checkout Asaas.
- Testar webhook Asaas.
- Confirmar plano ativo.
- Confirmar paywall.
- Confirmar white-label.
```

Critério de conclusão:

```text
Usuário pagante tem acesso.
Usuário vencido fica bloqueado.
Marca d’água some apenas para plano ativo.
```

---

## Etapa 4 — Publicação final

Objetivo: colocar o sistema no ar.

Tarefas:

```text
- Publicar frontend.
- Conferir domínio app.pixelsafe.com.br.
- Conferir links públicos.
- Conferir webhooks em produção.
- Fazer teste real pequeno.
```

Critério de conclusão:

```text
PixelSafe pronto para uso real com usuários e clientes reais.
```

---

# Ordem exata que seguiremos a partir de agora

## Próximo passo imediato

Executar somente a Etapa 1:

```text
Auditoria e correção de segurança/RLS para produção.
```

Não vamos adicionar:

```text
- skeletons;
- melhorias visuais;
- persistência extra de filtros;
- novas telas;
- novas funcionalidades;
- testes opcionais;
- paginação extra no dashboard;
- refinamentos estéticos.
```

Depois da Etapa 1, seguimos para a Etapa 2.

---

# Decisões técnicas já definidas

## Rotas públicas

Manter públicas:

```text
/p/:id
/c/:id
```

Motivo prático:

```text
Clientes precisam abrir proposta e contrato sem criar conta.
```

## Rotas internas

Exigir login:

```text
Dashboard
Clientes
Propostas
Contratos
Cofre
Configurações
Assinatura
Faturas
```

Motivo prático:

```text
São áreas administrativas do estúdio.
```

## Cofre

Manter privado.

Motivo prático:

```text
O cliente só deve baixar o arquivo final depois da quitação total.
```

## Pagamento de contrato

Manter público via contrato, mas com validação forte no backend.

Motivo prático:

```text
Cliente precisa pagar sem login, mas não pode gerar cobrança em contrato inválido.
```

---

# Definição de “pronto para produção”

O PixelSafe estará pronto quando estas 7 condições forem verdadeiras:

```text
1. Usuário não logado não acessa área interna.
2. Cliente acessa /p/:id e /c/:id sem login.
3. Dados de um workspace não aparecem para outro workspace.
4. RPCs públicas expõem apenas o necessário.
5. Pagamento só é gerado para contrato válido.
6. Cofre libera download apenas após pagamento total.
7. Fluxo completo foi testado com sucesso no domínio final.
```

Esse é o plano fechado.

A partir daqui, qualquer item fora dessa lista deve ficar para depois do lançamento.
