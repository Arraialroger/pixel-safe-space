import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "Como a Inteligência Artificial cria a minha proposta?",
    a: "Esqueça as horas perdidas a editar PDFs. Só precisa de digitar um briefing rápido. A nossa IA transforma essas anotações num escopo profissional, persuasivo e dividido em pacotes de preços. Em segundos, a sua proposta está pronta.",
  },
  {
    q: "Como o contrato é gerado? Tem validade legal?",
    a: "Sim, 100% de validade jurídica. Quando o cliente aprova a proposta, o PixelSafe gera um contrato inteligente. Você define os marcos financeiros (ex: 50% de entrada) e o sistema blinda o acordo com assinaturas digitais rastreáveis.",
  },
  {
    q: "Como envio tudo isso para o cliente aprovar e pagar?",
    a: "Através de Links Mágicos. O PixelSafe gera um link público com a identidade do seu estúdio. Envia pelo WhatsApp, o cliente abre no telemóvel, escolhe o pacote, assina e já realiza o pagamento da entrada (Pix ou Cartão) no mesmo ambiente.",
  },
  {
    q: "Como funciona o Cofre Anti-Calote na prática?",
    a: "É o fim do medo de enviar o arquivo final. Quando o trabalho estiver pronto, sobe os arquivos no Cofre. O cliente é notificado para pagar o valor final. Assim que o pagamento é confirmado, o cofre destrava e liberta o download para ele automaticamente.",
  },
  {
    q: "O PixelSafe cobra taxas sobre os meus projetos?",
    a: "Zero taxas nossas! Nós não intermediamos o seu dinheiro. Você liga a sua própria conta do Mercado Pago ou Asaas no nosso sistema. O cliente paga, e o valor cai direto na sua conta bancária.",
  },
  {
    q: "Qual a diferença entre os planos?",
    a: "O plano básico organiza as suas propostas e contratos gratuitamente. O plano Estúdio liberta o motor financeiro completo: Cofre Anti-Calote, recebimentos diretos via Asaas/Mercado Pago, operação White-label (sem a nossa marca) e acesso para a sua equipa.",
  },
];

export function FAQSection() {
  return (
    <section className="relative px-6 py-24 lg:px-16 lg:py-32">
      <div className="mx-auto max-w-2xl">
        <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-primary">
          Dúvidas frequentes
        </p>
        <h2 className="text-center font-serif text-3xl leading-tight text-foreground sm:text-4xl">
          Perguntas e respostas
        </h2>

        <Accordion type="single" collapsible className="mt-12">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="mb-3 rounded-xl border border-white/10 bg-card/25 px-6 backdrop-blur-lg"
            >
              <AccordionTrigger className="text-left text-sm font-medium text-foreground/90 hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
