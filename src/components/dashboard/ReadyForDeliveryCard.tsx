import { Link, useNavigate } from "react-router-dom";
import { Package, Upload, ChevronRight, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface ReadyForDeliveryItem {
  id: string;
  project_title: string;
  client_name: string | null;
  created_at: string;
}

interface Props {
  items: ReadyForDeliveryItem[];
  total: number;
}

export function ReadyForDeliveryCard({ items, total }: Props) {
  const navigate = useNavigate();

  return (
    <Card className="animate-fade-in-up" style={{ animationDelay: "640ms" }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-medium">Prontos para Entrega</CardTitle>
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
            Nenhuma entrega pendente
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(`/contratos/${item.id}`)}
                className="w-full text-left px-6 py-3 hover:bg-accent/40 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {item.client_name ?? "Cliente"} — {item.project_title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      há {formatDistanceToNow(new Date(item.created_at), { locale: ptBR })}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/contratos/${item.id}`);
                    }}
                  >
                    <Upload className="h-3 w-3 mr-1" /> Upload no Cofre
                  </Button>
                </div>
              </button>
            ))}
          </div>
        )}
        {total > 0 && (
          <div className="px-6 pt-3 pb-1">
            <Link to="/cofre" className="text-xs text-primary hover:underline">
              Ver no Cofre →
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
