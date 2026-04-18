import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { statusConfig } from "@/lib/proposal-utils";

type Props = {
  proposal: {
    id: string;
    title: string;
    status: string;
    created_at: string;
    client_name: string;
    client_phone: string | null;
  };
};

export function PropostaMobileCard({ proposal }: Props) {
  const navigate = useNavigate();
  const sc = statusConfig[proposal.status] ?? statusConfig.draft;

  const publicUrl = `${window.location.origin}/p/${proposal.id}`;

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const copyLink = async (e: React.MouseEvent) => {
    stop(e);
    await navigator.clipboard.writeText(publicUrl);
    toast.success("Link copiado!");
  };

  const openWhatsApp = (e: React.MouseEvent) => {
    stop(e);
    if (!proposal.client_phone) return;
    const phone = proposal.client_phone.replace(/\D/g, "");
    const msg = encodeURIComponent(`Olá! Segue a proposta: ${publicUrl}`);
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  return (
    <Card
      onClick={() => navigate(`/propostas/${proposal.id}`)}
      className="p-4 space-y-3 cursor-pointer active:scale-[0.99] transition-transform"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate">{proposal.client_name}</p>
          <p className="text-sm text-muted-foreground truncate mt-0.5">{proposal.title}</p>
        </div>
        <Badge variant={sc.variant} className={sc.className}>
          {sc.label}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        {format(new Date(proposal.created_at), "dd 'de' MMM yyyy", { locale: ptBR })}
      </p>
      <div className="flex gap-2 pt-1 border-t border-border/40">
        <Button variant="outline" size="sm" onClick={copyLink} className="flex-1">
          <Copy className="h-3.5 w-3.5 mr-1.5" /> Copiar link
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={openWhatsApp}
          disabled={!proposal.client_phone}
          className="flex-1 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-300"
        >
          <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> WhatsApp
        </Button>
      </div>
    </Card>
  );
}
