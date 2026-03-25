import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, ArrowRight } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden px-6 lg:px-16">
      {/* Gradient orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, hsl(var(--landing-accent)) 0%, transparent 70%)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-60 -right-40 h-[500px] w-[500px] rounded-full opacity-15"
        style={{ background: "radial-gradient(circle, hsl(var(--landing-success)) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center gap-16 lg:flex-row lg:items-center lg:justify-between">
        {/* Copy */}
        <div className="max-w-2xl space-y-8 text-center lg:text-left">
          <h1
            className="font-serif text-4xl font-normal leading-[1.15] tracking-tight sm:text-5xl md:text-6xl"
            style={{ color: "hsl(var(--landing-text))", textWrap: "balance" } as React.CSSProperties}
          >
            Desenhe sem medo.{" "}
            <span style={{ color: "hsl(var(--landing-accent))" }}>
              Entregue com segurança.
            </span>{" "}
            Receba no ato.
          </h1>

          <p
            className="mx-auto max-w-lg text-lg leading-relaxed lg:mx-0"
            style={{ color: "hsl(var(--landing-text) / 0.7)" }}
          >
            Propostas inteligentes, contratos com assinatura digital e um Cofre Anti-Calote
            que só libera seus arquivos quando o pagamento é confirmado. Seu talento protegido
            por código e respaldo jurídico.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
            <Button
              asChild
              size="lg"
              className="relative h-14 min-w-[260px] rounded-xl text-base font-semibold shadow-lg transition-all duration-300 hover:scale-[1.02]"
              style={{
                background: "hsl(var(--landing-accent))",
                color: "hsl(var(--landing-accent-foreground))",
                boxShadow: "0 0 30px hsl(var(--landing-success) / 0.25)",
              }}
            >
              <Link to="/register">
                Proteja Seu Primeiro Projeto
                <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
              </Link>
            </Button>

            <p
              className="text-sm"
              style={{ color: "hsl(var(--landing-text) / 0.5)" }}
            >
              Grátis para sempre · Sem cartão
            </p>
          </div>
        </div>

        {/* Glassmorphism UI mockup */}
        <div
          className="relative w-full max-w-md shrink-0 rounded-2xl border p-6 backdrop-blur-xl motion-safe:animate-[fadeInUp_0.8s_ease-out_0.3s_both]"
          style={{
            background: "hsl(var(--landing-card) / 0.4)",
            borderColor: "hsl(var(--landing-text) / 0.08)",
          }}
          aria-hidden="true"
        >
          {/* Mock header */}
          <div className="mb-6 flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ background: "hsl(var(--landing-accent) / 0.15)" }}
            >
              <Shield className="h-5 w-5" style={{ color: "hsl(var(--landing-accent))" }} />
            </div>
            <div>
              <div className="h-3 w-28 rounded-full" style={{ background: "hsl(var(--landing-text) / 0.2)" }} />
              <div className="mt-1.5 h-2 w-20 rounded-full" style={{ background: "hsl(var(--landing-text) / 0.1)" }} />
            </div>
          </div>

          {/* Mock rows */}
          {[
            { label: "Proposta #041", status: "Aceita", statusColor: "var(--landing-success)" },
            { label: "Contrato #039", status: "Assinado", statusColor: "var(--landing-accent)" },
            { label: "Cofre #039", status: "Liberado", statusColor: "var(--landing-success)" },
          ].map((item) => (
            <div
              key={item.label}
              className="mb-3 flex items-center justify-between rounded-xl border px-4 py-3"
              style={{
                background: "hsl(var(--landing-bg) / 0.5)",
                borderColor: "hsl(var(--landing-text) / 0.06)",
              }}
            >
              <span className="text-sm font-medium" style={{ color: "hsl(var(--landing-text) / 0.8)" }}>
                {item.label}
              </span>
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  background: `hsl(${item.statusColor} / 0.12)`,
                  color: `hsl(${item.statusColor})`,
                }}
              >
                {item.status}
              </span>
            </div>
          ))}

          {/* Mock value */}
          <div
            className="mt-4 flex items-center justify-between rounded-xl border px-4 py-3"
            style={{
              background: "hsl(var(--landing-success) / 0.06)",
              borderColor: "hsl(var(--landing-success) / 0.15)",
            }}
          >
            <span className="text-xs" style={{ color: "hsl(var(--landing-text) / 0.5)" }}>
              Valor protegido
            </span>
            <span
              className="font-mono text-lg font-medium tabular-nums"
              style={{ color: "hsl(var(--landing-success))" }}
            >
              R$&nbsp;12.500
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
