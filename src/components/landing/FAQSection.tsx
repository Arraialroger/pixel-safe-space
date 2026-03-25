import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "Como funciona o Cofre Anti-Calote (Smart Handoff Vault)?",
    a: "O cliente deposita o valor do projeto antes do início do trabalho. Os fundos ficam retidos de forma segura até que você conclua a entrega. Quando o pagamento é confirmado, seus arquivos são liberados automaticamente ao cliente.",
  },
  {
    q: "As assinaturas digitais têm validade jurídica?",
    a: "Sim. As assinaturas eletrônicas emitidas pela plataforma seguem os padrões legais e são juridicamente vinculantes, com registro de IP, data/hora e e-mail do signatário.",
  },
  {
    q: "Quais são as taxas por transação?",
    a: "O PixelSafe opera com transparência total. As taxas são detalhadas antes de cada transação e variam de acordo com o plano escolhido. O plano gratuito permite experimentar sem custos.",
  },
  {
    q: "Quanto tempo os fundos ficam retidos no escrow?",
    a: "Os fundos são retidos apenas durante o período de execução do projeto. Assim que ambas as partes confirmam a conclusão, a liberação é imediata.",
  },
  {
    q: "Posso usar o PixelSafe sem cartão de crédito?",
    a: "Sim! O plano gratuito não exige cartão de crédito. Você pode criar propostas, contratos e usar o Cofre sem nenhum custo inicial.",
  },
];

export function FAQSection() {
  return (
    <section className="relative px-6 py-24 lg:px-16 lg:py-32">
      <div className="mx-auto max-w-2xl">
        <p
          className="mb-3 text-center text-sm font-semibold uppercase tracking-widest"
          style={{ color: "hsl(var(--landing-accent))" }}
        >
          Dúvidas frequentes
        </p>
        <h2
          className="text-center font-serif text-3xl leading-tight sm:text-4xl"
          style={{ color: "hsl(var(--landing-text))" }}
        >
          Perguntas e respostas
        </h2>

        <Accordion type="single" collapsible className="mt-12">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="rounded-xl border px-6 mb-3 backdrop-blur-lg"
              style={{
                background: "hsl(var(--landing-card) / 0.25)",
                borderColor: "hsl(var(--landing-text) / 0.06)",
              }}
            >
              <AccordionTrigger
                className="text-left text-sm font-medium hover:no-underline"
                style={{ color: "hsl(var(--landing-text) / 0.9)" }}
              >
                {faq.q}
              </AccordionTrigger>
              <AccordionContent
                className="text-sm leading-relaxed"
                style={{ color: "hsl(var(--landing-text) / 0.6)" }}
              >
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
