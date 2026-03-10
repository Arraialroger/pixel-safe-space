import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Bem-vindo de volta{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ""}.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Propostas ativas", value: "0" },
          { label: "Clientes", value: "0" },
          { label: "Taxa de conversão", value: "0%" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-card p-5 space-y-1">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="text-2xl font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Index;
