import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Shield,
  Share,
  Plus,
  MoreVertical,
  Download,
  Smartphone,
  Apple,
  Chrome,
  Copy,
  CheckCircle2,
  ArrowLeft,
  Zap,
  Maximize2,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type Platform = "ios" | "android" | "desktop";

function getPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  const platform = (navigator as Navigator & { platform?: string }).platform || "";
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (platform === "MacIntel" && (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints! > 1);
  if (isIOS) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const APP_URL = "https://app.pixelsafe.com.br";

export default function Install() {
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setPlatform(getPlatform());
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);

    document.title = "Instalar PixelSafe no celular";
    const meta = document.querySelector('meta[name="description"]');
    const original = meta?.getAttribute("content") || "";
    meta?.setAttribute(
      "content",
      "Instale o PixelSafe na tela inicial do iPhone ou Android. Acesso rápido como app nativo, sem app store.",
    );

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      if (meta && original) meta.setAttribute("content", original);
    };
  }, []);

  const cards = useMemo(() => {
    const ios = <IOSCard key="ios" />;
    const android = (
      <AndroidCard
        key="android"
        deferredPrompt={deferredPrompt}
        onInstall={async () => {
          if (!deferredPrompt) return;
          await deferredPrompt.prompt();
          const choice = await deferredPrompt.userChoice;
          if (choice.outcome === "accepted") {
            toast.success("Instalação iniciada");
          }
          setDeferredPrompt(null);
        }}
      />
    );
    if (platform === "ios") return [ios, android];
    return [android, ios];
  }, [platform, deferredPrompt]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(APP_URL);
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16 space-y-10">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold">PixelSafe</span>
          </div>
        </div>

        {/* Already installed banner */}
        {isStandalone && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-300">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p className="text-sm">PixelSafe já está instalado neste dispositivo.</p>
          </div>
        )}

        {/* Hero */}
        <header className="text-center space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-card/60 backdrop-blur shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.06),0_10px_30px_-10px_hsl(var(--primary)/0.4)]">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              Instale o PixelSafe no seu celular
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
              Acesso rápido como um app nativo, direto da sua tela inicial. Sem App Store, sem download pesado.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Badge variant="secondary" className="gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              Abertura instantânea
            </Badge>
            <Badge variant="secondary" className="gap-1.5">
              <Maximize2 className="h-3.5 w-3.5" />
              Tela cheia
            </Badge>
            <Badge variant="secondary" className="gap-1.5">
              <Home className="h-3.5 w-3.5" />
              Ícone na home
            </Badge>
          </div>
        </header>

        {/* Desktop helper: QR + copy */}
        {platform === "desktop" && !isStandalone && (
          <Card className="overflow-hidden">
            <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-6">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(
                  APP_URL + "/install",
                )}`}
                alt="QR Code para abrir o PixelSafe no celular"
                width={140}
                height={140}
                className="rounded-lg bg-white p-2 shrink-0"
              />
              <div className="flex-1 space-y-3 text-center sm:text-left">
                <h2 className="text-lg font-semibold">Abra esta página no celular</h2>
                <p className="text-sm text-muted-foreground">
                  Aponte a câmera do seu celular para o QR Code, ou copie o link e abra no navegador do dispositivo.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <code className="flex-1 rounded-md border border-white/10 bg-muted/30 px-3 py-2 text-sm text-muted-foreground truncate">
                    {APP_URL}
                  </code>
                  <Button variant="outline" onClick={copyLink} className="shrink-0">
                    <Copy className="h-4 w-4" />
                    Copiar link
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Platform cards */}
        {!isStandalone && <div className="space-y-6">{cards}</div>}

        {/* FAQ */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Perguntas frequentes</h2>
          <Accordion type="single" collapsible className="rounded-xl border border-white/10 bg-card/40 px-4">
            <AccordionItem value="appstore" className="border-white/5">
              <AccordionTrigger>Preciso baixar pela App Store ou Play Store?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Não. O PixelSafe é um Progressive Web App (PWA) e é instalado direto pelo navegador.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="updates" className="border-white/5">
              <AccordionTrigger>Vou receber atualizações automaticamente?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Sim. Toda vez que você abre o app, ele carrega a versão mais recente automaticamente.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="offline" className="border-white/5">
              <AccordionTrigger>Funciona offline?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                A instalação adiciona o atalho na tela inicial. Recursos como propostas, pagamentos e cofre exigem conexão com a internet.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="uninstall" className="border-b-0">
              <AccordionTrigger>Como faço para desinstalar?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Segure o ícone do PixelSafe na tela inicial e toque em "Remover" ou "Desinstalar", como qualquer outro app.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        {/* Final CTA */}
        <div className="text-center pt-2">
          <Button asChild variant="outline" size="lg">
            <Link to="/login">Voltar para o app</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function StepList({ steps }: { steps: { icon: React.ReactNode; text: React.ReactNode }[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-muted/40 text-xs font-semibold text-foreground">
            {i + 1}
          </span>
          <div className="flex-1 flex items-start gap-2 pt-0.5">
            <span className="text-primary mt-0.5 shrink-0">{s.icon}</span>
            <p className="text-sm text-foreground/90 leading-relaxed">{s.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function IOSCard() {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-muted/40">
          <Apple className="h-5 w-5" />
        </div>
        <div>
          <CardTitle className="text-lg">No iPhone (Safari)</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">iOS / iPadOS</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <StepList
          steps={[
            {
              icon: <Smartphone className="h-4 w-4" />,
              text: (
                <>
                  Abra <span className="font-medium text-foreground">app.pixelsafe.com.br</span> no <span className="font-medium text-foreground">Safari</span>.
                </>
              ),
            },
            {
              icon: <Share className="h-4 w-4" />,
              text: (
                <>
                  Toque no botão <span className="font-medium text-foreground">Compartilhar</span> (quadrado com seta para cima) na barra inferior.
                </>
              ),
            },
            {
              icon: <Plus className="h-4 w-4" />,
              text: (
                <>
                  Role e selecione <span className="font-medium text-foreground">Adicionar à Tela de Início</span>.
                </>
              ),
            },
            {
              icon: <CheckCircle2 className="h-4 w-4" />,
              text: (
                <>
                  Confirme tocando em <span className="font-medium text-foreground">Adicionar</span> no canto superior direito.
                </>
              ),
            },
          ]}
        />
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          Importante: a instalação no iPhone funciona apenas pelo <strong>Safari</strong>. Chrome e outros navegadores no iOS não suportam esse recurso.
        </div>
      </CardContent>
    </Card>
  );
}

function AndroidCard({
  deferredPrompt,
  onInstall,
}: {
  deferredPrompt: BeforeInstallPromptEvent | null;
  onInstall: () => void;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-muted/40">
          <Chrome className="h-5 w-5" />
        </div>
        <div>
          <CardTitle className="text-lg">No Android (Chrome)</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Chrome, Edge, Samsung Internet</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {deferredPrompt && (
          <Button onClick={onInstall} className="w-full" size="lg">
            <Download className="h-4 w-4" />
            Instalar agora
          </Button>
        )}
        <StepList
          steps={[
            {
              icon: <Smartphone className="h-4 w-4" />,
              text: (
                <>
                  Abra <span className="font-medium text-foreground">app.pixelsafe.com.br</span> no <span className="font-medium text-foreground">Chrome</span>.
                </>
              ),
            },
            {
              icon: <MoreVertical className="h-4 w-4" />,
              text: (
                <>
                  Toque no menu <span className="font-medium text-foreground">⋮</span> (três pontos) no canto superior direito.
                </>
              ),
            },
            {
              icon: <Download className="h-4 w-4" />,
              text: (
                <>
                  Selecione <span className="font-medium text-foreground">Instalar app</span> ou <span className="font-medium text-foreground">Adicionar à tela inicial</span>.
                </>
              ),
            },
            {
              icon: <CheckCircle2 className="h-4 w-4" />,
              text: (
                <>
                  Confirme tocando em <span className="font-medium text-foreground">Instalar</span>.
                </>
              ),
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}
