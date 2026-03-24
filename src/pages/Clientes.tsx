import { useState, useEffect } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Loader2 } from "lucide-react";
import { usePaywall } from "@/hooks/use-paywall";
import { Button } from "@/components/ui/button";
import ClientTable from "@/components/clientes/ClientTable";
import ClientFormDialog from "@/components/clientes/ClientFormDialog";
import ClientDeleteDialog from "@/components/clientes/ClientDeleteDialog";

export interface Client {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  document: string | null;
  address: string | null;
  phone: string | null;
  created_at: string;
}

export default function Clientes() {
  const { workspaceId } = useWorkspace();
  const { guard } = usePaywall();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);

  const fetchClients = async () => {
    if (!workspaceId) return;
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar clientes", description: error.message, variant: "destructive" });
    } else {
      setClients(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, [workspaceId]);

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingClient(null);
  };

  const handleSaved = () => {
    handleCloseForm();
    fetchClients();
  };

  const handleDeleted = () => {
    setDeletingClient(null);
    fetchClients();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
        <Button onClick={() => guard(() => setFormOpen(true))}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      {clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">Nenhum cliente cadastrado.</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Clique em &quot;Novo Cliente&quot; para começar.
          </p>
        </div>
      ) : (
        <ClientTable clients={clients} onEdit={handleEdit} onDelete={setDeletingClient} />
      )}

      <ClientFormDialog
        open={formOpen}
        onOpenChange={handleCloseForm}
        editingClient={editingClient}
        onSaved={handleSaved}
      />

      <ClientDeleteDialog
        client={deletingClient}
        onOpenChange={() => setDeletingClient(null)}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
