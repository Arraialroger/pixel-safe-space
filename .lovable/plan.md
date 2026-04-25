# Página /install — Guia de Instalação do PixelSafe

Criar uma página pública e bonita explicando como instalar o PixelSafe na tela inicial do iPhone e Android, seguindo o design system de luxo escuro do projeto.

## O que será criado

### 1. Nova página `src/pages/Install.tsx`
Página pública (sem autenticação), responsiva, com:

- **Hero**
  - Logo (escudo) do PixelSafe centralizada
  - Título: "Instale o PixelSafe no seu celular"
  - Subtítulo: "Acesso rápido como um app nativo, direto da tela inicial. Sem app store."
  - Badges/benefícios curtos: "Abertura instantânea", "Tela cheia", "Ícone na home"

- **Detecção automática do dispositivo** (via `navigator.userAgent`)
  - Mostra primeiro o card correspondente (iOS ou Android), o outro fica logo abaixo
  - Botão "Copiar link" (`app.pixelsafe.com.br`) para o usuário abrir no navegador do celular caso esteja no desktop
  - Se desktop: mostra um QR Code apontando para `https://app.pixelsafe.com.br/install` (gerado com a API gratuita `https://api.qrserver.com/v1/create-qr-code/?data=...`) com a mensagem "Aponte a câmera do celular"

- **Card iPhone (Safari)** — passo a passo numerado com ícones Lucide
  1. Abra `app.pixelsafe.com.br` no **Safari**
  2. Toque no botão **Compartilhar** (ícone quadrado com seta para cima)
  3. Role e toque em **Adicionar à Tela de Início**
  4. Confirme em **Adicionar**
  - Aviso destacado: "Funciona apenas no Safari. Chrome no iPhone não suporta instalação."

- **Card Android (Chrome)** — passo a passo numerado
  1. Abra `app.pixelsafe.com.br` no **Chrome**
  2. Toque no menu **⋮** (três pontos) no canto superior direito
  3. Toque em **Instalar app** (ou **Adicionar à tela inicial**)
  4. Confirme em **Instalar**
  - Botão "Instalar agora" que dispara o evento `beforeinstallprompt` capturado (quando disponível no Chrome Android/Desktop). Se não disponível, o botão fica oculto.

- **FAQ curto** (3–4 itens em accordion):
  - "Preciso baixar da App Store / Play Store?" → Não, o PixelSafe é um Progressive Web App.
  - "Vou receber atualizações?" → Sim, automaticamente ao abrir.
  - "Funciona offline?" → A instalação adiciona o atalho; recursos online continuam exigindo internet.
  - "Posso desinstalar?" → Sim, segure o ícone e remova como qualquer app.

- **CTA final**: botão "Voltar para o app" → `/` ou `/login`

### 2. Rota em `src/App.tsx`
Adicionar `<Route path="/install" element={<Install />} />` na seção pública (antes do catch-all `*`), sem `ProtectedRoute` e sem `AppLayout` — a página renderiza seu próprio layout limpo (igual `PropostaPublica`/`ContratoPublico`).

### 3. Link discreto no rodapé do login
Em `src/pages/Login.tsx`, adicionar um link sutil "📱 Instalar no celular" → `/install` abaixo do formulário, para descoberta orgânica.

## Detalhes técnicos

- **Stack visual**: shadcn `Card`, `Button`, `Accordion`, `Badge` + Tailwind, mantendo `bg-background`, `border-white/5`, glassmorphism leve, gradientes sutis.
- **Ícones**: `Share`, `Plus`, `MoreVertical`, `Download`, `Smartphone`, `Apple`, `Chrome` do `lucide-react`.
- **Detecção iOS/Android**: helper local `getPlatform()` retornando `"ios" | "android" | "desktop"` baseado em `navigator.userAgent` + `navigator.platform`.
- **`beforeinstallprompt`**: capturar o evento em `useEffect`, salvar em estado, exibir botão "Instalar agora" só quando disponível; ao clicar, chamar `prompt()` e descartar.
- **Detecção "já instalado"**: se `window.matchMedia('(display-mode: standalone)').matches` for `true`, mostrar um banner verde no topo: "PixelSafe já está instalado neste dispositivo ✓" e ocultar os passos.
- **Copiar link**: `navigator.clipboard.writeText('https://app.pixelsafe.com.br')` + toast `sonner`.
- **QR Code**: `<img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=https://app.pixelsafe.com.br/install" />` com fallback `alt`.
- **Sem novas dependências**, sem service worker, sem alteração de manifest (já existente).
- **SEO**: `<title>` e `<meta description>` específicos via efeito no mount.

## Arquivos afetados

- **Criar**: `src/pages/Install.tsx`
- **Editar**: `src/App.tsx` (nova rota pública)
- **Editar**: `src/pages/Login.tsx` (link discreto para `/install`)
