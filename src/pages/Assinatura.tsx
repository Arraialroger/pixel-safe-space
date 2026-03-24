import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Sparkles } from "lucide-react";

export default function Assinatura() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Minha Assinatura</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gerencie seu plano e faturamento.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Plano Atual</CardTitle>
          </div>
          <CardDescription>
            Detalhes da sua assinatura do PixelSafe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
            <div className="rounded-full bg-primary/10 p-3">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <p className="text-muted-foreground text-sm max-w-md">
              Em breve você poderá gerenciar seu plano, ver faturas e alterar sua assinatura diretamente por aqui.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
