

# Fix: Normalizar estilos do Template Personalizado no PDF

## Problema

O `CustomClausesPDF` injeta o HTML do TipTap via `dangerouslySetInnerHTML` com apenas `markdownStyle` no wrapper — mas os elementos internos (`h1`, `h2`, `h3`, `p`, `ul`, `ol`, `li`, `strong`, `em`, `u`) herdam os estilos default do browser, resultando em fontes inconsistentes, casing errado e espaço em branco no topo.

## Solução

Adicionar um objeto de estilo CSS normalizado (inline style sheet) ao wrapper do conteúdo custom que force todos os elementos HTML gerados pelo TipTap a seguirem o mesmo padrão visual dos templates fixos.

## Alterações

### `src/components/contratos/ContratoPDFView.tsx`

1. **Criar um style tag inline** dentro do wrapper do custom content que normalize:
   - `h1` → mesmo estilo de `h2Style` (14px, bold, uppercase, letter-spacing)
   - `h2`, `h3` → 14px bold uppercase
   - `p` → 13px, line-height 1.65, color #333
   - `ul`, `ol` → margin/padding consistente, 13px
   - `li` → 13px, line-height 1.65
   - `strong`, `em`, `u` → herdam font-size
   - Margin-top do primeiro elemento filho → 0 (elimina espaço em branco no topo)

2. **Técnica**: Usar um `<style>` tag scoped via uma classe CSS única (e.g., `.pdf-custom-content`) dentro do div, já que inline styles não conseguem atingir elementos filhos gerados por `dangerouslySetInnerHTML`.

Alternativamente, como `html2pdf.js` renderiza via `html2canvas` que lê computed styles, podemos envolver o HTML sanitizado num wrapper que aplica estilos via uma folha de estilo injetada no próprio componente.

```tsx
const customContentNormalize = `
  .pdf-custom-content * { font-family: 'DM Sans', 'Helvetica Neue', Arial, sans-serif; }
  .pdf-custom-content h1, .pdf-custom-content h2, .pdf-custom-content h3 {
    font-size: 14px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.03em; margin: 0 0 8px 0; color: #111;
  }
  .pdf-custom-content p { font-size: 13px; line-height: 1.65; color: #333; margin: 0 0 8px 0; }
  .pdf-custom-content ul, .pdf-custom-content ol { font-size: 13px; padding-left: 20px; margin: 0 0 8px 0; }
  .pdf-custom-content li { font-size: 13px; line-height: 1.65; color: #333; }
  .pdf-custom-content > *:first-child { margin-top: 0 !important; padding-top: 0 !important; }
`;
```

3. **Atualizar `CustomClausesPDF`** para injetar `<style>` + classe wrapper:

```tsx
function CustomClausesPDF(...) {
  return (
    <>
      {p.customContractText ? (
        <div style={sectionStyle}>
          <style>{customContentNormalize}</style>
          <div className="pdf-custom-content" 
               dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(p.customContractText) }} />
        </div>
      ) : ...}
      ...
    </>
  );
}
```

## Arquivos

| Arquivo | Alteração |
|---------|-----------|
| `src/components/contratos/ContratoPDFView.tsx` | Adicionar estilos de normalização ao `CustomClausesPDF` |

Zero dependências novas. Zero alterações no banco de dados.

