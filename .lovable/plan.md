## Diagnóstico

Sua proposta está correta e é a melhor prática de UX/conversão:
- Botão = **ação curta e direta** (verbo + valor)
- Microcopy de apoio = **fora do botão**, logo abaixo, em texto pequeno

Isso resolve o corte no mobile, melhora a leitura (o olho lê o valor instantaneamente) e mantém a clareza do que acontece após o pagamento. É o padrão usado por Stripe Checkout, Mercado Pago, Hotmart, etc.

Como reforço de robustez, aplicar também `whitespace-normal leading-tight text-base sm:text-lg` no botão, para que mesmo se algum valor longo aparecer no futuro, ele quebre linha em vez de cortar.

## Mudanças em `src/pages/ContratoPublico.tsx`

Três botões de pagamento serão ajustados (linhas ~496, ~522, ~566):

**1. Entrada (status `signed` com entrada):**
- Botão: `Pagar entrada — R$ X,XX`
- Microcopy abaixo: *"Após a confirmação, seu projeto será iniciado automaticamente."*

**2. Pagamento total (sem entrada, entregável pronto):**
- Botão: `Pagar R$ X,XX`
- Microcopy abaixo: *"Após a confirmação, os arquivos finais serão liberados para download."*
- (já existe explicação acima — vamos manter só uma das duas para não duplicar)

**3. Saldo final (status `partially_paid`, entregável pronto):**
- Botão: `Pagar saldo — R$ X,XX`
- Microcopy abaixo: *"Após a confirmação, os arquivos finais serão liberados para download."*
- (idem: remover duplicidade com o texto acima do botão)

## Detalhes técnicos

- Texto do botão: substituir pelo formato curto acima.
- Adicionar `whitespace-normal leading-tight` nas classes do `<Button>` como salvaguarda.
- Reduzir `text-lg` para `text-base sm:text-lg` para garantir folga em telas estreitas (≤360px).
- Inserir um `<p className="text-xs text-muted-foreground text-center mt-2">` logo após cada `<a>` do botão, com a microcopy correspondente.
- Nos blocos 2 e 3, o card já contém a frase explicativa acima do botão ("O designer finalizou seu projeto. Efetue o pagamento…"). Vamos mantê-la como está (contexto) e não duplicar a microcopy abaixo — apenas encurtar o botão. No bloco 1 (entrada) não há contexto acima, então a microcopy abaixo é adicionada.

## Resultado esperado

- Mobile (≤390px): botão exibe `Pagar entrada — R$ 1,00` em uma única linha confortável.
- Mensagem de o-que-acontece-depois fica visível, mas sem competir com o CTA.
- Zero risco de texto cortado, mesmo com valores como `R$ 12.500,00`.
