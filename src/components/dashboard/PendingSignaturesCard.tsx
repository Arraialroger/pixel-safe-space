import { Link, useNavigate } from "react-router-dom";
import { Clock, CheckCircle2, Copy, MessageCircle, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { haptic } from "@/lib/haptics";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export interface PendingSignatureItem {
  id: string;
  type: "contract" | "proposal";
  title: string;
  client_name: string | null;
  client_phone: string | null;
  created_at: string;
}

interface Props {
  items: PendingSignatureItem[];
  total: number;
}

function urgencyBadge(createdAt: string) {
  const days = Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (days > 14) return <Badge variant="destructive" className="text-[10px]">Urgente</Badge>;
  if (days > 7) return <Badge className="text-[10px] bg-warning text-warning-foreground hover:bg-warning/90">Atrasado</Badge>;
  return null;
}

export function PendingSignaturesCard({ items, total }: Props) {
  const navigate = useNavigate();

  const handleCopy = (e: React.MouseEvent, item: PendingSignatureItem) => {
    e.stopPropagation();
    haptic(10);
    const path = item.type === "contract" ? "c" : "p";
    const url = `${window.location.origin}/${path}/${item.id}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success("Link copiado"),
      () => toast.error("Falha ao copiar link")
    );
  };

  const handleWhatsApp = (e: React.MouseEvent, item: PendingSignatureItem) => {
    e.stopPropagation();
    if (!item.client_phone) return;
    const path = item.type === "contract" ? "c" : "p";
    const url = `${window.location.origin}/${path}/${item.id}`;
    const docLabel = item.type === "contract" ? "contrato" : "proposta";
    const waUrl = buildWhatsAppUrl(item.client_phone, `Olá! Segue o link do seu ${docLabel}: ${url}`);
    if (!waUrl) return;
    haptic(10);
    window.open(waUrl, "_blank");
  };

  const navigateToItem = (item: PendingSignatureItem) => {
    navigate(item.type === "contract" ? `/contratos/${item.id}` : `/propostas/${item.id}`);
  };

  return (
    <Card className="animate-fade-in-up" style={{ animationDelay: "560ms" }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-warning" />
            <CardTitle className="text-base font-medium">Aguardando Assinatura</CardTitle>
          </div>
          {total > 0 && (
            <Badge variant="secondary" className="text-xs">{total}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 text-success/70" />
            Nada aguardando assinatura 🎉
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((item) => (
              <button
                key={`${item.type}-${item.id}`}
                onClick={() => navigateToItem(item)}
                className="w-full text-left px-6 py-3 hover:bg-accent/40 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {item.client_name ?? "Cliente"} — {item.title}
                    </p>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">
                        há {formatDistanceToNow(new Date(item.created_at), { locale: ptBR })}
                      </span>
                      {urgencyBadge(item.created_at)}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="mt-2 flex gap-1">
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={(e) => handleCopy(e, item)}>
                    <Copy className="h-3 w-3 mr-1" /> Copiar link
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    disabled={!item.client_phone}
                    onClick={(e) => handleWhatsApp(e, item)}
                  >
                    <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
                  </Button>
                </div>
              </button>
            ))}
          </div>
        )}
        {total > items.length && (
          <div className="px-6 pt-3 pb-1">
            <Link to="/propostas" className="text-xs text-primary hover:underline">
              Ver todas ({total}) →
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
