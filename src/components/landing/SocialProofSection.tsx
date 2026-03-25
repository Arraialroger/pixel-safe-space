const metrics = [
  { value: "R$ 50M+", label: "protegidos no Cofre" },
  { value: "2.000+", label: "projetos entregues" },
  { value: "99,9%", label: "uptime garantido" },
  { value: "<80s", label: "para blindar um contrato" },
];

const integrations = ["Stripe", "AWS", "Google Cloud", "Dropbox"];

export function SocialProofSection() {
  return (
    <section className="relative px-6 py-24 lg:px-16 lg:py-32">
      <div className="mx-auto max-w-5xl">
        <p
          className="mb-3 text-center text-sm font-semibold uppercase tracking-widest"
          style={{ color: "hsl(var(--landing-accent))" }}
        >
          Confiança comprovada
        </p>
        <h2
          className="mx-auto max-w-2xl text-center font-serif text-3xl leading-tight sm:text-4xl"
          style={{ color: "hsl(var(--landing-text))", textWrap: "balance" } as React.CSSProperties}
        >
          Números que falam por si
        </h2>

        {/* Metrics grid */}
        <div className="mt-14 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="rounded-2xl border p-6 text-center backdrop-blur-lg"
              style={{
                background: "hsl(var(--landing-card) / 0.3)",
                borderColor: "hsl(var(--landing-text) / 0.06)",
              }}
            >
              <span
                className="block font-mono text-2xl font-bold tabular-nums sm:text-3xl"
                style={{ color: "hsl(var(--landing-success))" }}
              >
                {m.value}
              </span>
              <span
                className="mt-2 block text-xs"
                style={{ color: "hsl(var(--landing-text) / 0.5)" }}
              >
                {m.label}
              </span>
            </div>
          ))}
        </div>

        {/* Integrations */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-8">
          {integrations.map((name) => (
            <span
              key={name}
              className="rounded-lg border px-5 py-2.5 text-sm font-medium"
              style={{
                borderColor: "hsl(var(--landing-border))",
                color: "hsl(var(--landing-text) / 0.4)",
              }}
            >
              {name}
            </span>
          ))}
        </div>

        {/* Testimonial placeholder */}
        <div
          className="mx-auto mt-16 max-w-lg rounded-2xl border p-8 text-center backdrop-blur-lg"
          style={{
            background: "hsl(var(--landing-card) / 0.25)",
            borderColor: "hsl(var(--landing-text) / 0.06)",
          }}
        >
          <p
            className="text-base italic leading-relaxed"
            style={{ color: "hsl(var(--landing-text) / 0.7)" }}
          >
            "Antes do PixelSafe, perdi R$ 15 mil em três meses com clientes que sumiram. Hoje, cada centavo
            está protegido antes mesmo de eu começar a criar."
          </p>
          <p
            className="mt-4 text-sm font-semibold"
            style={{ color: "hsl(var(--landing-accent))" }}
          >
            — Designer Freelancer
          </p>
        </div>
      </div>
    </section>
  );
}
