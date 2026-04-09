

# Rich Text Editor para Template Personalizado

## Resumo

Substituir a `<Textarea>` simples por um editor WYSIWYG usando **TipTap** (baseado em ProseMirror, leve, headless, perfeito para React/Vite). O conteudo sera armazenado como HTML na mesma coluna `custom_contract_text`.

## Porque TipTap

- Headless e composavel — integra-se naturalmente com Tailwind/Shadcn
- Preserva formatacao ao colar do Word/Google Docs (extensao `@tiptap/extension-paste`)
- Sem dependencias pesadas (React Quill depende do Quill legacy)
- Gera HTML limpo que pode ser sanitizado com DOMPurify

## Alteracoes

### 1. Instalar dependencias

```
@tiptap/react @tiptap/starter-kit @tiptap/extension-underline dompurify
@types/dompurify (dev)
```

O `starter-kit` inclui Bold, Italic, Headings, Lists, History (undo/redo).

### 2. Criar componente `src/components/contratos/RichTextEditor.tsx`

- Editor TipTap com barra de ferramentas: **Negrito**, **Italico**, **Sublinhado**, **H1/H2/H3**, **Lista ordenada/nao-ordenada**
- Estilizado com Tailwind para combinar com o tema escuro existente
- Props: `content: string`, `onChange: (html: string) => void`, `disabled?: boolean`
- O editor recebe HTML e emite HTML via `onUpdate`

### 3. Atualizar `src/pages/ContratoDetalhe.tsx`

- Substituir a `<Textarea>` (linhas 392-399) pelo novo `<RichTextEditor>`
- `customContractText` continua como string (agora HTML em vez de markdown)
- O `handleSave` ja grava na coluna `custom_contract_text` sem alteracoes

### 4. Atualizar `src/components/contratos/ContratoDocumento.tsx`

- No `CustomClauses`, substituir `<ReactMarkdown>{customContractText}</ReactMarkdown>` por renderizacao HTML sanitizada com DOMPurify:
  ```tsx
  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(customContractText) }} />
  ```
- A Regra de Ouro permanece inalterada no final

### 5. Atualizar `src/pages/ContratoPublico.tsx`

- Mesma logica: o `ContratoDocumento` ja recebe `customContractText` e a alteracao no renderizador (passo 4) cobre ambos os contextos

## Retrocompatibilidade

Contratos existentes com texto em markdown puro continuarao a renderizar — o DOMPurify passa texto simples sem alteracoes, e tags markdown serao exibidas como texto. Para contratos futuros, o conteudo sera HTML rico.

## Arquivos

| Arquivo | Alteracao |
|---------|-----------|
| `package.json` | Adicionar tiptap + dompurify |
| `src/components/contratos/RichTextEditor.tsx` | Novo componente |
| `src/pages/ContratoDetalhe.tsx` | Substituir Textarea pelo RichTextEditor |
| `src/components/contratos/ContratoDocumento.tsx` | Renderizar HTML sanitizado em vez de ReactMarkdown |

Zero alteracoes no banco de dados.

