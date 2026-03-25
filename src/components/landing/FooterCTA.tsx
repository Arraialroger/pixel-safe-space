import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield } from "lucide-react";

export function FooterCTA() {
  return (
    <footer className="relative px-6 py-24 lg:px-16 lg:py-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-primary/10 opacity-15"
        style={{ background: "radial-gradient(ellipse at center bottom, hsl(var(--primary)), transparent 70%)" }}
      />

      <div className="relative z-10 mx-auto max-w-2xl text-center">
        <Shield
          className="mx-auto mb-6 h-12 w-12 text-primary"
          aria-hidden="true"
        />
        <h2 className="font-serif text-3xl leading-tight text-foreground sm:text-4xl [text-wrap:balance]">
          Pare de perseguir pagamentos. Comece a criar em paz.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
          Comece grátis. Sem cartão de crédito. Sem surpresas.
        </p>

        <Button
          asChild
          size="lg"
          className="mt-8 h-14 min-w-[260px] rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-[0_0_40px_hsl(var(--primary)/0.2)] transition-all duration-300 hover:scale-[1.02]"
        >
          <Link to="/register">
            Comece Grátis Agora
            <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
          </Link>
        </Button>

        <p className="mt-16 text-xs text-muted-foreground/50">
          © {new Date().getFullYear()} Pixel Safe. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
