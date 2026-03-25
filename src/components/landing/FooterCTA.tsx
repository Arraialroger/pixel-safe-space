import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield } from "lucide-react";

export function FooterCTA() {
  return (
    <footer className="relative px-6 py-24 lg:px-16 lg:py-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-15"
        style={{ background: "radial-gradient(ellipse at center bottom, hsl(var(--landing-accent)), transparent 70%)" }}
      />

      <div className="relative z-10 mx-auto max-w-2xl text-center">
        <Shield
          className="mx-auto mb-6 h-12 w-12"
          style={{ color: "hsl(var(--landing-accent))" }}
          aria-hidden="true"
        />
        <h2
          className="font-serif text-3xl leading-tight sm:text-4xl"
          style={{ color: "hsl(var(--landing-text))", textWrap: "balance" } as React.CSSProperties}
        >
          Pare de perseguir pagamentos. Comece a criar em paz.
        </h2>
        <p
          className="mx-auto mt-4 max-w-md text-base leading-relaxed"
          style={{ color: "hsl(var(--landing-text) / 0.6)" }}
        >
          Comece grátis. Sem cartão de crédito. Sem surpresas.
        </p>

        <Button
          asChild
          size="lg"
          className="mt-8 h-14 min-w-[260px] rounded-xl text-base font-semibold shadow-lg transition-all duration-300 hover:scale-[1.02]"
          style={{
            background: "hsl(var(--landing-accent))",
            color: "hsl(var(--landing-accent-foreground))",
            boxShadow: "0 0 40px hsl(var(--landing-success) / 0.2)",
          }}
        >
          <Link to="/register">
            Comece Grátis Agora
            <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
          </Link>
        </Button>

        <p
          className="mt-16 text-xs"
          style={{ color: "hsl(var(--landing-text) / 0.3)" }}
        >
          © {new Date().getFullYear()} Pixel Safe. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
