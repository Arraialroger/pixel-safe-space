

# Plano: Mobile Premium — Bottom Nav + Cards + Header Contextual

## Arquitetura

Render condicional por `useIsMobile()` em `AppLayout`:
- **Desktop (≥768px):** mantém `AppSidebar` + header com `SidebarTrigger` (zero alteração visível)
- **Mobile (<768px):** oculta sidebar, renderiza `MobileHeader` (topo) + `MobileBottomNav` (base) + drawer "Mais"

---

## 1. Componentes novos

### `src/components/MobileBottomNav.tsx`
Barra fixa `bottom-0`, altura 64px, `bg-background/95 backdrop-blur border-t`, 5 slots iguais:
| Slot | Ícone | Ação |
|------|-------|------|
| 1 | LayoutDashboard | `/` |
| 2 | FileText | `/propostas` |
| 3 | FileCheck | `/contratos` |
| 4 | FolderLock | `/cofre` |
| 5 | Menu | abre `MobileMoreSheet` |

Cada slot: ícone + label (text-[10px]). Ativo via `useLocation()` → cor `text-primary` + barra superior 2px. Touch target ≥48px. `safe-area-inset-bottom` respeitado via `pb-[env(safe-area-inset-bottom)]`.

### `src/components/MobileHeader.tsx`
Altura 56px (não 48 — caber título + ação confortável), `sticky top-0`, `bg-background/80 backdrop-blur border-b`.
- **Esquerda:** logo do workspace (24px) + título da rota (mapeado por `useLocation()`)
- **Direita:** slot opcional `primaryAction` (children prop) + `Avatar` com `DropdownMenu` (Meu Perfil, Sair)

Mapa de títulos: `/` → "Dashboard", `/propostas` → "Propostas", `/contratos` → "Contratos", `/cofre` → "Meu Cofre", `/clientes` → "Clientes", etc.

### `src/components/MobileMoreSheet.tsx`
`Sheet side="right"` acionado pelo slot 5. Conteúdo:
- Workspace switcher (reutiliza lógica do `AppSidebar`)
- Itens: Clientes, Meu Perfil, Estúdio/Agência, Minha Assinatura
- Footer: botão Sair

### Cards mobile (3 ficheiros)
- `src/components/propostas/PropostaMobileCard.tsx`
- `src/components/contratos/ContratoMobileCard.tsx`
- `src/components/cofre/CofreMobileCard.tsx`

**Layout padrão de card** (`Card` shadcn, `p-4`, `space-y-3`, tap → navega para detalhe):
```
┌─────────────────────────────────┐
│ Cliente (font-semibold)  [Badge]│
│ Título / valor                  │
│ Data · método                   │
├─────────────────────────────────┤
│ [📋 Copiar link] [💬 WhatsApp]  │ ← botões reais, fora de dropdown
└─────────────────────────────────┘
```

Ações por página:
- **Propostas:** Copiar link público (`/p/:id`) + WhatsApp (se `client_phone`)
- **Contratos:** Copiar link público (`/c/:id`) + WhatsApp (busca telefone do cliente — adicionar ao select da query)
- **Cofre:** Abrir entregável (`fetchSignedUrl`) + Copiar link

`stopPropagation` nos botões para não disparar navegação do card.

---

## 2. Modificações

### `src/components/AppLayout.tsx`
```tsx
const isMobile = useIsMobile();
return isMobile ? (
  <div className="min-h-screen flex flex-col">
    <MobileHeader primaryAction={...} />
    {paywallBanner}
    <main className="flex-1 px-3 pt-3 pb-20">{children}</main>
    <MobileBottomNav />
  </div>
) : (
  <SidebarProvider>...estrutura atual...</SidebarProvider>
);
```
Padding mobile: `px-3 pt-3 pb-20` (pb-20 para não esconder atrás da bottom nav). Banner paywall vira pílula compacta `text-xs` em mobile.

> **Nota sobre `primaryAction`:** o header recebe a ação via Context simples (`MobileHeaderActionContext`) — cada página registra sua ação primária via hook `useMobileHeaderAction(<button>)`. Páginas sem ação (Dashboard, Cofre) não registram nada.

### Páginas (Propostas, Contratos, Cofre, Clientes)
Adicionar no topo do componente:
```tsx
const isMobile = useIsMobile();
useMobileHeaderAction(isMobile ? <Button onClick={...}>+ Nova</Button> : null);
```
E render condicional:
```tsx
{isMobile ? (
  <div className="space-y-3">{paginated.map(p => <PropostaMobileCard ... />)}</div>
) : (
  <div className="rounded-md border overflow-x-auto"><Table>...</Table></div>
)}
```

Filtros (search + selects) em mobile: empilhados verticalmente `flex-col gap-2` (já é o comportamento do `flex-col sm:flex-row`, só validar).

### Query do `Contratos.tsx`
Adicionar `clients(name, phone)` ao select para suportar WhatsApp no card.

---

## 3. Ficheiros

**Criar (7):**
- `src/components/MobileBottomNav.tsx`
- `src/components/MobileHeader.tsx`
- `src/components/MobileMoreSheet.tsx`
- `src/components/MobileHeaderActionContext.tsx` (Context + hook)
- `src/components/propostas/PropostaMobileCard.tsx`
- `src/components/contratos/ContratoMobileCard.tsx`
- `src/components/cofre/CofreMobileCard.tsx`

**Modificar (5):**
- `src/components/AppLayout.tsx` — render condicional + provider do Context
- `src/pages/Propostas.tsx` — render cards em mobile + registrar ação header
- `src/pages/Contratos.tsx` — idem + adicionar `phone` à query
- `src/pages/Cofre.tsx` — render cards em mobile
- `src/pages/Clientes.tsx` — apenas registrar ação "Novo Cliente" no header mobile (tabela já é minimal)

**Sem alterações:** `AppSidebar.tsx` (continua intacta para desktop), rotas, RPCs, edge functions, lógica de paywall.

---

## Validação visual após implementação
Testar em viewport 390×844 (iPhone 12/13/14):
1. Bottom nav fixa, sem sobreposição com conteúdo
2. Header com título correto por rota + botão "+" funcional
3. Drawer "Mais" abre com workspace switcher e itens secundários
4. Listagens sem scroll horizontal, ações a 1 toque
5. Tap no card navega para detalhe; tap nos botões NÃO navega

