import { CreditCard, Lock, Send } from "lucide-react";

const steps = [
  {
    icon: CreditCard,
    step: "01",
    title: "Cliente paga",
    description: "O valor do projeto é depositado de forma segura antes do início do trabalho.",
  },
  {
    icon: Lock,
    step: "02",
    title: "PixelSafe retém",
    description: "Os fundos ficam protegidos no Cofre Anti-Calote, inacessíveis a ambas as partes.",
  },
  {
    icon: Send,
    step: "03",
    title: "Handoff liberado",
    description: "Pagamento confirmado? Seus arquivos são liberados automaticamente ao cliente.",
  },
];

export function VaultSection() {
  return (
    <section className="relative px-6 py-24 lg:px-16 lg:py-32">
      {/* Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10"
        style={{ background: "radial-gradient(ellipse, hsl(var(--landing-success)) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 mx-auto max-w-5xl">
        <p
          className="mb-3 text-center text-sm font-semibold uppercase tracking-widest"
          style={{ color: "hsl(var(--landing-success))" }}
        >
          A solução core
        </p>
        <h2
          className="mx-auto max-w-2xl text-center font-serif text-3xl leading-tight sm:text-4xl"
          style={{ color: "hsl(var(--landing-text))", textWrap: "balance" } as React.CSSProperties}
        >
          O Cofre Anti-Calote
        </h2>
        <p
          className="mx-auto mt-4 max-w-xl text-center text-base leading-relaxed"
          style={{ color: "hsl(var(--landing-text) / 0.6)" }}
        >
          Seu contrato formulado, criptografado e blindado pelo Cofre — ativado em menos de 80 segundos.
        </p>

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.step} className="relative flex flex-col items-center text-center">
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div
                  aria-hidden="true"
                  className="absolute right-0 top-10 hidden h-px w-full translate-x-1/2 sm:block"
                  style={{ background: "linear-gradient(90deg, hsl(var(--landing-accent) / 0.3), transparent)" }}
                />
              )}

              <div
                className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border backdrop-blur-lg"
                style={{
                  background: "hsl(var(--landing-card) / 0.5)",
                  borderColor: "hsl(var(--landing-success) / 0.15)",
                }}
              >
                <s.icon
                  className="h-8 w-8"
                  style={{ color: "hsl(var(--landing-success))" }}
                  aria-hidden="true"
                />
                <span
                  className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs font-bold"
                  style={{
                    background: "hsl(var(--landing-accent))",
                    color: "hsl(var(--landing-accent-foreground))",
                  }}
                >
                  {s.step}
                </span>
              </div>

              <h3
                className="mb-2 text-lg font-semibold"
                style={{ color: "hsl(var(--landing-text))" }}
              >
                {s.title}
              </h3>
              <p
                className="max-w-[240px] text-sm leading-relaxed"
                style={{ color: "hsl(var(--landing-text) / 0.6)" }}
              >
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
