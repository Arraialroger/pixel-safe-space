import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { haptic } from "@/lib/haptics";

type VaultItem = {
  id: string;
  final_deliverable_url: string;
  status: string;
  is_fully_paid: boolean;
  created_at: string;
  client_name: string;
  project_title: string | null;
};

type Props = {
  item: VaultItem;
  onOpen: (item: VaultItem) => void;
  onCopy: (item: VaultItem) => void;
};

function badge(item: VaultItem) {
  if (item.is_fully_paid)
    return (
      <Badge className="bg-primary/15 text-primary border-primary/20">Quitado</Badge>
    );
  if (item.status === "partially_paid")
    return (
      <Badge className="bg-warning/15 text-warning border-warning/20">
        Entrada Paga
      </Badge>
    );
  if (item.status === "signed")
    return (
      <Badge className="bg-success/15 text-success border-success/20">
        Assinado
      </Badge>
    );
  return <Badge variant="secondary">{item.status}</Badge>;
}

export function CofreMobileCard({ item, onOpen, onCopy }: Props) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate">
            {item.project_title || (
              <span className="text-muted-foreground italic font-normal">
                Sem proposta vinculada
              </span>
            )}
          </p>
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {item.client_name}
          </p>
        </div>
        {badge(item)}
      </div>
      <p className="text-xs text-muted-foreground">
        {format(new Date(item.created_at), "dd 'de' MMM yyyy", { locale: ptBR })}
      </p>
      <div className="flex gap-2 pt-1 border-t border-border/40">
        <Button variant="outline" size="sm" onClick={() => { haptic(10); onOpen(item); }} className="flex-1">
          <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Abrir
        </Button>
        <Button variant="outline" size="sm" onClick={() => { haptic(10); onCopy(item); }} className="flex-1">
          <Copy className="h-3.5 w-3.5 mr-1.5" /> Copiar link
        </Button>
      </div>
    </Card>
  );
}
