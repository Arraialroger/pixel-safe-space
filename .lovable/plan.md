

# Ajustes Juridicos nos Templates de Contrato

## Resumo

4 alteracoes cirurgicas nos textos dos templates para fechar brechas legais identificadas na revisao juridica.

## Alteracoes

### 1. Shield — Clausula 1 (Afastar CDC)
Adicionar paragrafo 1.2 apos os entregaveis na secao "Clausula 1 — Do Objeto e Escopo" do ShieldClauses.

### 2. Shield + Dynamic — Clausula 4 (Aceite Tacito)
Adicionar paragrafo 4.3 sobre aprovacao automatica apos 5 dias uteis sem feedback, na secao de Revisoes de ambos os templates.

### 3. Friendly — Exclusoes de Escopo
Adicionar nova secao "O que fica de fora" entre "O que vamos fazer juntos" e "Como funciona o pagamento". Requer receber a prop `exclusions` no FriendlyClauses (atualmente nao recebe).

### 4. TODOS os Templates — Licencas de Terceiros
Adicionar paragrafo sobre licencas de terceiros (fontes, imagens, plugins) serem responsabilidade do contratante:
- Shield: na Clausula 6 (apos 6.3)
- Dynamic: na Clausula 6 (apos 6.3)
- Friendly: na secao "Combinados importantes"

## Sobre o ContratoPDF.tsx

O `ContratoPDF.tsx` atual e um componente de PDF de **propostas** (nao contratos). Ele renderiza o escopo da proposta via `ai_generated_scope` e nao utiliza o sistema de templates. Nao necessita destas alteracoes — os ajustes aplicam-se apenas ao `ContratoDocumento.tsx`, que e o motor de documentos dos contratos.

## Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/contratos/ContratoDocumento.tsx` | Todos os 4 ajustes de texto + prop `exclusions` no FriendlyClauses |

