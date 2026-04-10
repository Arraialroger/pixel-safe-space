

# Exportacao em PDF dos Contratos

## Resumo

Criar um componente `ContratoPDFView` (print-friendly, fundo branco) que espelha o `ContratoDocumento` e usar `html2pdf.js` (ja instalado) para gerar o PDF no lado do cliente. Adicionar botoes de download em ambas as paginas.

## Abordagem

Seguir o padrao existente em `ContratoPDF.tsx` (propostas): um componente com `forwardRef` renderizado off-screen com estilos de impressao (fundo branco, texto preto), capturado por `html2pdf.js`.

## Alteracoes

### 1. Criar `src/components/contratos/ContratoPDFView.tsx`

Componente com `forwardRef` que replica a estrutura do `ContratoDocumento` mas com estilos de impressao:
- Fundo branco, texto preto/cinza escuro
- Tipografia `font-sans`, tamanho `13px`
- Bordas e separadores em cinza claro
- Suporta todos os 4 templates (shield, dynamic, friendly, custom)
- Renderiza a assinatura digital quando presente
- Recebe as mesmas props que `ContratoDocumento`

### 2. Criar `src/lib/pdf-export.ts`

Funcao utilitaria `exportContractPdf(element: HTMLElement, clientName: string)` que:
- Importa `html2pdf.js` dinamicamente
- Configura: A4, margens, qualidade de imagem, quebras de pagina
- Gera o download com nome `contrato-{clientName}.pdf`

### 3. Atualizar `src/pages/ContratoDetalhe.tsx`

- Adicionar `useRef` para o componente PDF off-screen
- Renderizar `<ContratoPDFView ref={pdfRef} ... />` com `position: absolute; left: -9999px` (invisivel mas no DOM)
- Adicionar botao "Baixar PDF" (icone Download) no header, ao lado dos botoes existentes (linha ~325)

### 4. Atualizar `src/pages/ContratoPublico.tsx`

- Mesmo padrao: ref + componente off-screen + botao "Baixar Contrato (PDF)" proeminente apos o documento

## Arquivos

| Arquivo | Tipo |
|---------|------|
| `src/components/contratos/ContratoPDFView.tsx` | Novo |
| `src/lib/pdf-export.ts` | Novo |
| `src/pages/ContratoDetalhe.tsx` | Editar — botao + ref + componente off-screen |
| `src/pages/ContratoPublico.tsx` | Editar — botao + ref + componente off-screen |

Zero alteracoes no banco de dados. Zero dependencias novas (`html2pdf.js` ja esta instalado).

