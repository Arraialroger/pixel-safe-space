import { Users } from "lucide-react";

export default function Clientes() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <p className="text-muted-foreground">Nenhum cliente cadastrado.</p>
        <p className="text-sm text-muted-foreground/60 mt-1">Seus clientes aparecerão aqui.</p>
      </div>
    </div>
  );
}
