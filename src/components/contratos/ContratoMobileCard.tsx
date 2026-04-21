import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { contractStatusConfig, execStatusConfig } from "@/lib/contract-utils";
import { formatCurrency } from "@/lib/format";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { haptic } from "@/lib/haptics";

type Props = {
  contract: {
    id: string;
    status: string;
    execution_status: string;
    payment_value: number | null;
    created_at: string;
    client_name: string;
    client_phone: string | null;
  };
};

export function ContratoMobileCard({ contract }: Props) {
  const navigate = useNavigate();
  const sc = contractStatusConfig[contract.status] ?? contractStatusConfig.draft;
  const ec = execStatusConfig[contract.execution_status] ?? execStatusConfig.not_started;

  const publicUrl = `${window.location.origin}/c/${contract.id}`;

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const copyLink = async (e: React.MouseEvent) => {
    stop(e);
    haptic(10);
    await navigator.clipboard.writeText(publicUrl);
    toast.success("Link copiado!");
  };

  const openWhatsApp = (e: React.MouseEvent) => {
    stop(e);
    const url = buildWhatsAppUrl(contract.client_phone, `Olá! Segue o contrato: ${publicUrl}`);
    if (!url) return;
    haptic(10);
    window.open(url, "_blank");
  };

  return (
    <Card
      onClick={() => { haptic(5); navigate(`/contratos/${contract.id}`); }}
      className="p-4 space-y-3 cursor-pointer active:scale-[0.99] transition-transform"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate">{contract.client_name}</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {formatCurrency(contract.payment_value)}
          </p>
        </div>
        <Badge variant={sc.variant} className={sc.className}>
          {sc.label}
        </Badge>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <Badge variant="outline" className={ec.className}>
          {ec.label}
        </Badge>
        <span className="text-muted-foreground">
          {format(new Date(contract.created_at), "dd/MM/yyyy", { locale: ptBR })}
        </span>
      </div>
      <div className="flex gap-2 pt-1 border-t border-border/40">
        <Button variant="outline" size="sm" onClick={copyLink} className="flex-1">
          <Copy className="h-3.5 w-3.5 mr-1.5" /> Copiar link
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={openWhatsApp}
          disabled={!contract.client_phone}
          className="flex-1 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-300"
        >
          <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> WhatsApp
        </Button>
      </div>
    </Card>
  );
}
