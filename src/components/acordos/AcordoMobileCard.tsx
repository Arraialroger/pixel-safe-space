import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { dealStageConfig, type DealStage } from "@/lib/deal-utils";
import { formatCurrency } from "@/lib/format";
import { haptic } from "@/lib/haptics";

type Props = {
  deal: {
    id: string;
    title: string;
    stage: string;
    created_at: string;
    client_name: string;
    payment_value: number | null;
  };
};

export function AcordoMobileCard({ deal }: Props) {
  const navigate = useNavigate();
  const cfg = dealStageConfig[deal.stage as DealStage] ?? dealStageConfig.draft;

  return (
    <Card
      onClick={() => { haptic(5); navigate(`/acordos/${deal.id}`); }}
      className="p-4 space-y-3 cursor-pointer active:scale-[0.99] transition-transform"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate">{deal.client_name}</p>
          <p className="text-sm text-muted-foreground truncate mt-0.5">{deal.title}</p>
        </div>
        <Badge variant="outline" className={cfg.className}>
          {cfg.short}
        </Badge>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{format(new Date(deal.created_at), "dd 'de' MMM yyyy", { locale: ptBR })}</span>
        <span className="font-medium text-foreground">{formatCurrency(deal.payment_value)}</span>
      </div>
    </Card>
  );
}
