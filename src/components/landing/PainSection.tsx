import { Clock, Ghost, Brain } from "lucide-react";

const painPoints = [
  {
    icon: Clock,
    title: "Tempo incinerado cobrando",
    description:
      "Horas preciosas de criação sacrificadas em mensagens de cobrança pelo WhatsApp, e-mails ignorados e ligações constrangedoras.",
  },
  {
    icon: Ghost,
    title: "Clientes fantasmas",
    description:
      "O briefing é aprovado, o trabalho é entregue… e o cliente simplesmente desaparece com seus arquivos sem pagar um centavo.",
  },
  {
    icon: Brain,
    title: "Ansiedade paralisante",
    description:
      "O medo de apertar \"Enviar\" no arquivo final sem garantia de pagamento trava a criatividade e corrói a saúde mental.",
  },
];

export function PainSection() {
  return (
    <section className="relative px-6 py-24 lg:px-16 lg:py-32">
      <div className="mx-auto max-w-5xl">
        <p
          className="mb-3 text-center text-sm font-semibold uppercase tracking-widest"
          style={{ color: "hsl(var(--landing-accent))" }}
        >
          O problema que ninguém resolve
        </p>
        <h2
          className="mx-auto max-w-3xl text-center font-serif text-3xl leading-tight sm:text-4xl"
          style={{ color: "hsl(var(--landing-text))", textWrap: "balance" } as React.CSSProperties}
        >
          Profissionais criativos perdem{" "}
          <span
            className="font-mono tabular-nums font-medium"
            style={{ color: "hsl(var(--landing-success))" }}
          >
            30%
          </span>{" "}
          do mês gerenciando inadimplência
        </h2>

        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          {painPoints.map((point, i) => (
            <div
              key={point.title}
              className="group rounded-2xl border p-6 backdrop-blur-lg transition-all duration-300 hover:scale-[1.02] motion-safe:animate-[fadeInUp_0.6s_ease-out_both]"
              style={{
                background: "hsl(var(--landing-card) / 0.35)",
                borderColor: "hsl(var(--landing-text) / 0.06)",
                animationDelay: `${i * 150}ms`,
              }}
            >
              <div
                className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ background: "hsl(var(--landing-accent) / 0.1)" }}
              >
                <point.icon
                  className="h-6 w-6"
                  style={{ color: "hsl(var(--landing-accent))" }}
                  aria-hidden="true"
                />
              </div>
              <h3
                className="mb-2 text-lg font-semibold"
                style={{ color: "hsl(var(--landing-text))" }}
              >
                {point.title}
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "hsl(var(--landing-text) / 0.6)" }}
              >
                {point.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
