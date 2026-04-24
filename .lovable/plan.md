## Limpeza total do banco e do storage para começar a Etapa 2 do zero

### Operação irreversível

Vai apagar **tudo**: 5 usuários, todos os workspaces, clientes, propostas, contratos, pagamentos e arquivos do Cofre/Logos. Depois você cria uma conta nova em `/register` e o sistema gera automaticamente seu workspace zerado.

### Ordem de execução (precisa ser nessa ordem por causa das foreign keys)

**1. Apagar dados de negócio (SQL)**
```sql
DELETE FROM public.payment_events;
DELETE FROM public.payment_sessions;
DELETE FROM public.contracts;
DELETE FROM public.proposals;
DELETE FROM public.clients;
DELETE FROM public.workspace_payment_tokens;
DELETE FROM public.workspaces;
-- workspace_members e profiles cascateiam sozinhos
```

**2. Apagar arquivos do Storage**
```sql
DELETE FROM storage.objects WHERE bucket_id = 'vault';
DELETE FROM storage.objects WHERE bucket_id = 'logos';
```

**3. Apagar os 5 usuários do auth**
```sql
DELETE FROM auth.users;
-- profiles cascateia sozinho via ON DELETE CASCADE
```

**4. Verificação final**
Rodo SELECT COUNT(*) em todas as tabelas e te mostro tudo zerado.

### Por que essa ordem

A tabela `contracts` não tem `ON DELETE CASCADE` para `workspaces`, `clients` e `proposals`. Se eu apagar workspace direto, dá erro de FK. Por isso apago contratos primeiro, depois subo a hierarquia.

### Resultado esperado

- Painel Authentication do Supabase: **0 usuários**
- Todas as tabelas públicas: **0 registros**
- Storage `vault` e `logos`: **vazios**
- Você acessa `/register`, cria conta nova, faz login e começa a Etapa 2 com banco limpo

### O que NÃO será afetado

- Estrutura das tabelas (schema)
- Edge functions
- Secrets
- Configurações do projeto
- Código da aplicação
