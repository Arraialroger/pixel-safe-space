import { Link, useNavigate } from "react-router-dom";
import { Zap, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePaywall } from "@/hooks/use-paywall";

export function QuickActions() {
  const navigate = useNavigate();
  const { guard } = usePaywall();

  return (
    <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up" style={{ animationDelay: "440ms" }}>
      <Button
        size="lg"
        className="flex-1 h-auto py-4 text-base font-medium"
        onClick={() => guard(() => navigate("/propostas/nova"))}
      >
        <Zap className="mr-2 h-5 w-5" />
        Nova Proposta
      </Button>
      <Button
        asChild
        size="lg"
        variant="secondary"
        className="flex-1 h-auto py-4 text-base font-medium"
      >
        <Link to="/clientes?new=1">
          <UserPlus className="mr-2 h-5 w-5" />
          Novo Cliente
        </Link>
      </Button>
    </div>
  );
}
