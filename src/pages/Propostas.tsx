import { FileText } from "lucide-react";

export default function Propostas() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Propostas</h1>
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <p className="text-muted-foreground">Nenhuma proposta criada ainda.</p>
        <p className="text-sm text-muted-foreground/60 mt-1">Suas propostas aparecerão aqui.</p>
      </div>
    </div>
  );
}
