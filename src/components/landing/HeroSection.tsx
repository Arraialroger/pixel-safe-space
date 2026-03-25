import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, ArrowRight } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden px-6 lg:px-16">
      {/* Glow orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-primary/20 opacity-20"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-60 -right-40 h-[500px] w-[500px] rounded-full bg-emerald-500/15 opacity-15"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center gap-16 lg:flex-row lg:items-center lg:justify-between">
        {/* Copy */}
        <div className="max-w-2xl space-y-8 text-center lg:text-left">
          <h1 className="font-serif text-4xl font-normal leading-[1.15] tracking-tight text-foreground sm:text-5xl md:text-6xl [text-wrap:balance]">
            Desenhe sem medo.{" "}
            <span className="text-primary">Entregue com segurança.</span>{" "}
            Receba no ato.
          </h1>

          <p className="mx-auto max-w-lg text-lg leading-relaxed text-muted-foreground lg:mx-0">
            Propostas inteligentes, contratos com assinatura digital e um Cofre Anti-Calote
            que só libera seus arquivos quando o pagamento é confirmado. Seu talento protegido
            por código e respaldo jurídico.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
            <Button
              asChild
              size="lg"
              className="relative h-14 min-w-[260px] rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-[0_0_30px_hsl(var(--primary)/0.3)] transition-all duration-300 hover:scale-[1.02]"
            >
              <Link to="/register">
                Proteja Seu Primeiro Projeto
                <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
              </Link>
            </Button>

            <p className="text-sm text-muted-foreground">
              Grátis para sempre · Sem cartão
            </p>
          </div>
        </div>

        {/* Realistic UI mockup */}
        <div
          className="relative w-full max-w-md shrink-0 rounded-2xl border border-white/10 bg-card/50 p-6 backdrop-blur-xl motion-safe:animate-[fadeInUp_0.8s_ease-out_0.3s_both]"
          aria-hidden="true"
        >
          {/* Mock header */}
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground/90">Painel PixelSafe</p>
              <p className="text-xs text-muted-foreground">Seus contratos ativos</p>
            </div>
          </div>

          {/* Mock table rows */}
          {[
            { label: "Proposta #041", status: "Aceita", color: "text-emerald-400 bg-emerald-400/12" },
            { label: "Contrato #039", status: "Assinado", color: "text-primary bg-primary/12" },
            { label: "Cofre #039", status: "Liberado", color: "text-emerald-400 bg-emerald-400/12" },
          ].map((item) => (
            <div
              key={item.label}
              className="mb-3 flex items-center justify-between rounded-xl border border-white/5 bg-background/50 px-4 py-3"
            >
              <span className="text-sm font-medium text-foreground/80">
                {item.label}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.color}`}>
                {item.status}
              </span>
            </div>
          ))}

          {/* Mock value */}
          <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-3">
            <span className="text-xs text-muted-foreground">
              Valor protegido
            </span>
            <span className="font-mono text-lg font-medium tabular-nums text-emerald-400">
              R$&nbsp;12.500
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
