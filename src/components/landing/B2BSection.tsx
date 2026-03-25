import { useState } from "react";
import { User, Building2, Check } from "lucide-react";

const freelancerFeatures = [
  "Propostas profissionais geradas com IA em segundos",
  "Contratos com validade jurídica prontos para uso",
  "Envio de links públicos elegantes",
  "Organização de clientes",
  "Plano base acessível",
];

const studioFeatures = [
  "Operação White-label (Sem marca d'água PixelSafe)",
  "Cofre Anti-Calote Integrado (Smart Handoff Vault)",
  "Recebimentos Diretos (Integração Asaas/Mercado Pago)",
  "Gestão de Equipe Colaborativa (Até 5 assentos)",
  "Criação Ilimitada de Propostas e Contratos",
];

export function B2BSection() {
  const [isStudio, setIsStudio] = useState(false);
  const features = isStudio ? studioFeatures : freelancerFeatures;

  return (
    <section className="relative px-6 py-24 lg:px-16 lg:py-32">
      <div className="mx-auto max-w-4xl">
        <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-primary">
          Para todos os tamanhos
        </p>
        <h2 className="mx-auto max-w-2xl text-center font-serif text-3xl leading-tight text-foreground sm:text-4xl [text-wrap:balance]">
          Feito para quem cria — sozinho ou em equipe
        </h2>

        {/* Toggle */}
        <div
          className="mx-auto mt-10 flex w-fit rounded-xl border border-white/10 bg-card/40 p-1"
          role="tablist"
          aria-label="Tipo de usuário"
        >
          <button
            role="tab"
            aria-selected={!isStudio}
            onClick={() => setIsStudio(false)}
            className={`flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium transition-all duration-300 ${
              !isStudio
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground"
            }`}
          >
            <User className="h-4 w-4" aria-hidden="true" />
            Sou Independente
          </button>
          <button
            role="tab"
            aria-selected={isStudio}
            onClick={() => setIsStudio(true)}
            className={`flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium transition-all duration-300 ${
              isStudio
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground"
            }`}
          >
            <Building2 className="h-4 w-4" aria-hidden="true" />
            Represento um Estúdio
          </button>
        </div>

        {/* Features */}
        <div
          className="mx-auto mt-10 max-w-md rounded-2xl border border-white/10 bg-card/30 p-8 backdrop-blur-xl"
          role="tabpanel"
        >
          <ul className="space-y-4">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-3">
                <Check
                  className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400"
                  aria-hidden="true"
                />
                <span className="text-sm leading-relaxed text-foreground/80">
                  {f}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
