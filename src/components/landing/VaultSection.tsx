import { FileText, FileSignature, Lock, Send } from "lucide-react";

const steps = [
  {
    icon: FileText,
    step: "01",
    title: "Proposta e Escopo",
    description: "Crie sua proposta com IA e envie o link público ao cliente.",
  },
  {
    icon: FileSignature,
    step: "02",
    title: "Contrato e Sinal",
    description: "Cliente aprova, assina digitalmente e paga a entrada.",
  },
  {
    icon: Lock,
    step: "03",
    title: "Execução e Cofre",
    description: "Trabalho concluído, suba os arquivos no Cofre bloqueado.",
  },
  {
    icon: Send,
    step: "04",
    title: "Handoff Automático",
    description: "Pagamento final confirmado, arquivos liberados automaticamente.",
  },
];

export function VaultSection() {
  return (
    <section className="relative px-6 py-24 lg:px-16 lg:py-32">
      {/* Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 opacity-10"
      />

      <div className="relative z-10 mx-auto max-w-6xl">
        <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-emerald-400">
          A solução core
        </p>
        <h2 className="mx-auto max-w-2xl text-center font-serif text-3xl leading-tight text-foreground sm:text-4xl [text-wrap:balance]">
          O Cofre Anti-Calote
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-base leading-relaxed text-muted-foreground">
          Do briefing ao handoff — seu contrato formulado, blindado e ativado em menos de 80 segundos.
        </p>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.step} className="relative flex flex-col items-center text-center">
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div
                  aria-hidden="true"
                  className="absolute right-0 top-10 hidden h-px w-full translate-x-1/2 bg-gradient-to-r from-primary/30 to-transparent lg:block"
                />
              )}

              <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-emerald-500/15 bg-card/50 backdrop-blur-xl">
                <s.icon className="h-8 w-8 text-emerald-400" aria-hidden="true" />
                <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary font-mono text-xs font-bold text-primary-foreground">
                  {s.step}
                </span>
              </div>

              <h3 className="mb-2 text-lg font-semibold text-foreground">
                {s.title}
              </h3>
              <p className="max-w-[240px] text-sm leading-relaxed text-muted-foreground">
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
