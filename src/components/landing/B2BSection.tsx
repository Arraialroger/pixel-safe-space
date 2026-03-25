import { useState } from "react";
import { User, Building2, Check } from "lucide-react";

const freelancerFeatures = [
  "Propostas em cliques, sem formatação manual",
  "Contratos modelo prontos para diversos nichos",
  "Cobrança automatizada sem intervenção",
  "Cofre Anti-Calote ativado em 80 segundos",
  "Plano gratuito para sempre",
];

const studioFeatures = [
  "Operação White Label com sua marca",
  "Multi-seat para toda a equipe",
  "Fluxos de aprovação e compliance",
  "ROI transparente com dashboard analítico",
  "API para integração com sistemas internos",
];

export function B2BSection() {
  const [isStudio, setIsStudio] = useState(false);

  const features = isStudio ? studioFeatures : freelancerFeatures;

  return (
    <section className="relative px-6 py-24 lg:px-16 lg:py-32">
      <div className="mx-auto max-w-4xl">
        <p
          className="mb-3 text-center text-sm font-semibold uppercase tracking-widest"
          style={{ color: "hsl(var(--landing-accent))" }}
        >
          Para todos os tamanhos
        </p>
        <h2
          className="mx-auto max-w-2xl text-center font-serif text-3xl leading-tight sm:text-4xl"
          style={{ color: "hsl(var(--landing-text))", textWrap: "balance" } as React.CSSProperties}
        >
          Feito para quem cria — sozinho ou em equipe
        </h2>

        {/* Toggle */}
        <div
          className="mx-auto mt-10 flex w-fit rounded-xl border p-1"
          style={{
            background: "hsl(var(--landing-card) / 0.4)",
            borderColor: "hsl(var(--landing-text) / 0.08)",
          }}
          role="tablist"
          aria-label="Tipo de usuário"
        >
          <button
            role="tab"
            aria-selected={!isStudio}
            onClick={() => setIsStudio(false)}
            className="flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium transition-all duration-300"
            style={{
              background: !isStudio ? "hsl(var(--landing-accent))" : "transparent",
              color: !isStudio ? "hsl(var(--landing-accent-foreground))" : "hsl(var(--landing-text) / 0.5)",
            }}
          >
            <User className="h-4 w-4" aria-hidden="true" />
            Sou Independente
          </button>
          <button
            role="tab"
            aria-selected={isStudio}
            onClick={() => setIsStudio(true)}
            className="flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium transition-all duration-300"
            style={{
              background: isStudio ? "hsl(var(--landing-accent))" : "transparent",
              color: isStudio ? "hsl(var(--landing-accent-foreground))" : "hsl(var(--landing-text) / 0.5)",
            }}
          >
            <Building2 className="h-4 w-4" aria-hidden="true" />
            Represento um Estúdio
          </button>
        </div>

        {/* Features */}
        <div
          className="mx-auto mt-10 max-w-md rounded-2xl border p-8 backdrop-blur-lg"
          role="tabpanel"
          style={{
            background: "hsl(var(--landing-card) / 0.3)",
            borderColor: "hsl(var(--landing-text) / 0.06)",
          }}
        >
          <ul className="space-y-4">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-3">
                <Check
                  className="mt-0.5 h-5 w-5 shrink-0"
                  style={{ color: "hsl(var(--landing-success))" }}
                  aria-hidden="true"
                />
                <span
                  className="text-sm leading-relaxed"
                  style={{ color: "hsl(var(--landing-text) / 0.8)" }}
                >
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
