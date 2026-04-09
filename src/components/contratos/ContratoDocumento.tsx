import ReactMarkdown from "react-markdown";
import { Separator } from "@/components/ui/separator";

type ContractDocProps = {
  workspace: {
    name: string;
    logo_url?: string | null;
    company_document?: string | null;
    company_address?: string | null;
  } | null;
  client: {
    name: string;
    document?: string | null;
    company?: string | null;
    address?: string | null;
  };
  deliverables: string | null;
  exclusions: string | null;
  revisions: string | null;
  paymentValue: number | null;
  downPayment: number | null;
  deadline: string | null;
  paymentTerms: string | null;
  signedByName?: string | null;
  signedByEmail?: string | null;
  signedAt?: string | null;
  template?: "shield" | "dynamic" | "friendly" | "custom";
  customContractText?: string | null;
};

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatPaymentTermsLabel(terms: string | null) {
  if (!terms) return null;
  if (terms === "50_50") return "50% no início / 50% na entrega";
  if (terms === "100_upfront") return "100% antecipado";
  if (terms === "custom") return "Personalizado";
  return terms;
}

/* ───────────────────────────────── GOLDEN RULE ──────────────────────────────── */
const GOLDEN_RULE_FORMAL =
  "A transferência dos direitos patrimoniais de autor e a entrega dos arquivos-fonte estão condicionadas à quitação integral de todos os valores previstos neste contrato. Até o pagamento final, a CONTRATADA retém todos os direitos sobre a obra, incluindo os arquivos finais depositados no Cofre Digital da plataforma.";

const GOLDEN_RULE_FRIENDLY =
  "Os arquivos finais em alta resolução serão liberados após a confirmação do pagamento total. Até lá, eles ficam seguros no nosso Cofre Digital.";

/* ───────────────────────────── TEMPLATE: SHIELD ─────────────────────────────── */
function ShieldClauses({
  deliverables, exclusions, revisions, paymentValue, downPayment, deadline, paymentTerms,
}: Pick<ContractDocProps, "deliverables" | "exclusions" | "revisions" | "paymentValue" | "downPayment" | "deadline" | "paymentTerms">) {
  return (
    <>
      <section className="mb-6">
        <h2 className="text-base font-bold uppercase tracking-wide mb-2">Cláusula 1 — Do Objeto e Escopo</h2>
        {deliverables ? (
          <div className="text-sm leading-relaxed"><ReactMarkdown>{deliverables}</ReactMarkdown></div>
        ) : (
          <p className="text-sm text-muted-foreground italic">Sem entregáveis definidos.</p>
        )}
        <p className="text-sm leading-relaxed mt-3">
          1.2. As partes declaram que a presente relação é de natureza estritamente civil e empresarial, não configurando relação de consumo.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-base font-bold uppercase tracking-wide mb-2">Cláusula 2 — Das Exclusões do Escopo</h2>
        {exclusions ? (
          <div className="text-sm leading-relaxed"><ReactMarkdown>{exclusions}</ReactMarkdown></div>
        ) : (
          <p className="text-sm text-muted-foreground italic">Sem exclusões definidas.</p>
        )}
        <p className="text-sm leading-relaxed mt-3">
          2.2. Qualquer item não listado acima é automaticamente excluído do escopo e, se solicitado, será tratado como novo projeto com orçamento próprio.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-base font-bold uppercase tracking-wide mb-2">Cláusula 3 — Dos Prazos e Obrigações</h2>
        <p className="text-sm leading-relaxed">
          3.1. O início dos trabalhos está condicionado à assinatura deste instrumento, ao pagamento da entrada (se aplicável) e à entrega de todos os materiais e informações iniciais por parte do CONTRATANTE. Atrasos no fornecimento de feedback, senhas ou aprovações prolongam o prazo final de entrega na exata e mesma proporção dos dias de atraso.
        </p>
        <p className="text-sm leading-relaxed mt-3">
          3.2. Atrasos do CONTRATANTE superiores a 15 (quinze) dias úteis configuram suspensão automática do projeto, sem prejuízo dos valores já devidos, podendo a CONTRATADA realocar recursos para outros projetos.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-base font-bold uppercase tracking-wide mb-2">Cláusula 4 — Dos Limites de Revisão e Aprovações</h2>
        {revisions ? (
          <div className="text-sm leading-relaxed"><ReactMarkdown>{revisions}</ReactMarkdown></div>
        ) : (
          <p className="text-sm text-muted-foreground italic">Sem regras de revisão definidas.</p>
        )}
        <p className="text-sm leading-relaxed mt-3">
          4.2. As solicitações de revisão devem ser formalizadas por escrito (e-mail ou plataforma oficial de gestão). Alterações que excedam os limites aqui estipulados serão consideradas novo escopo, sujeitas a novo orçamento e aprovação prévia obrigatória.
        </p>
        <p className="text-sm leading-relaxed mt-3">
          4.3. A ausência de feedback ou resposta do CONTRATANTE no prazo de 5 (cinco) dias úteis após a entrega de uma etapa será considerada como aceite tácito (aprovação automática) da respectiva fase.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-base font-bold uppercase tracking-wide mb-2">Cláusula 5 — Da Propriedade Intelectual e Portfólio</h2>
        <p className="text-sm leading-relaxed">
          5.1. {GOLDEN_RULE_FORMAL}
        </p>
        <p className="text-sm leading-relaxed mt-3">
          5.2. A utilização pública da obra antes da quitação configura uso indevido, sujeito a indenização nos termos do Art. 603 do Código Civil e legislação autoral aplicável.
        </p>
        <p className="text-sm leading-relaxed mt-3">
          5.3. A CONTRATADA reserva-se o direito de exibir as peças criadas em seu portfólio, site e redes sociais para fins de divulgação profissional.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-base font-bold uppercase tracking-wide mb-2">Cláusula 6 — Do Investimento, Inadimplência e Rescisão</h2>
        <p className="text-sm leading-relaxed">
          6.1. O valor total acordado para a execução do escopo é de: <strong>{paymentValue != null ? formatBRL(paymentValue) : "a definir"}</strong>
          {downPayment != null && downPayment > 0 && <>, sendo o valor da entrada de <strong>{formatBRL(downPayment)}</strong> para o início do projeto</>}.
          {deadline && <> O prazo estimado para conclusão é de: <strong>{deadline}</strong>.</>}
          {paymentTerms && <> Condições de pagamento: <strong>{formatPaymentTermsLabel(paymentTerms)}</strong>.</>}
        </p>
        <p className="text-sm leading-relaxed mt-3">
          6.2. O atraso no pagamento de qualquer parcela sujeitará o CONTRATANTE a uma multa moratória de 2% (dois por cento) sobre o valor devido, além de juros de 1% (um por cento) ao mês, e poderá acarretar a paralisação imediata dos serviços.
        </p>
        <p className="text-sm leading-relaxed mt-3">
          6.3. Em caso de rescisão imotivada por parte do CONTRATANTE após o início dos trabalhos, os valores já pagos referentes às etapas concluídas não serão reembolsados, havendo ainda incidência de multa de 20% (vinte por cento) sobre o saldo devedor restante.
        </p>
        <p className="text-sm leading-relaxed mt-3">
          6.4. O valor do projeto não inclui a aquisição de licenças de terceiros (fontes pagas, bancos de imagens, plugins). Se necessários, os custos e licenças serão de responsabilidade exclusiva do CONTRATANTE.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-base font-bold uppercase tracking-wide mb-2">Cláusula 7 — Do Foro</h2>
        <p className="text-sm leading-relaxed">
          7.1. Elege-se o foro da comarca da sede da CONTRATADA para dirimir quaisquer dúvidas oriundas deste contrato, com possibilidade de arbitragem.
        </p>
      </section>
    </>
  );
}

/* ──────────────────────────── TEMPLATE: DYNAMIC ─────────────────────────────── */
function DynamicClauses({
  deliverables, exclusions, revisions, paymentValue, downPayment, deadline, paymentTerms,
}: Pick<ContractDocProps, "deliverables" | "exclusions" | "revisions" | "paymentValue" | "downPayment" | "deadline" | "paymentTerms">) {
  return (
    <>
      <section className="mb-6">
        <h2 className="text-base font-bold uppercase tracking-wide mb-2">Cláusula 1 — Do Objeto e Escopo</h2>
        {deliverables ? (
          <div className="text-sm leading-relaxed"><ReactMarkdown>{deliverables}</ReactMarkdown></div>
        ) : (
          <p className="text-sm text-muted-foreground italic">Sem entregáveis definidos.</p>
        )}
      </section>

      <section className="mb-6">
        <h2 className="text-base font-bold uppercase tracking-wide mb-2">Cláusula 2 — Das Exclusões do Escopo</h2>
        {exclusions ? (
          <div className="text-sm leading-relaxed"><ReactMarkdown>{exclusions}</ReactMarkdown></div>
        ) : (
          <p className="text-sm text-muted-foreground italic">Sem exclusões definidas.</p>
        )}
      </section>

      <section className="mb-6">
        <h2 className="text-base font-bold uppercase tracking-wide mb-2">Cláusula 3 — Dos Prazos e Obrigações</h2>
        <p className="text-sm leading-relaxed">
          3.1. O início dos trabalhos está condicionado à assinatura deste instrumento, ao pagamento da entrada (se aplicável) e à entrega de todos os materiais e informações iniciais por parte do CONTRATANTE. Atrasos no fornecimento de feedback, senhas ou aprovações prolongam o prazo final de entrega na exata e mesma proporção dos dias de atraso.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-base font-bold uppercase tracking-wide mb-2">Cláusula 4 — Dos Limites de Revisão e Aprovações</h2>
        {revisions ? (
          <div className="text-sm leading-relaxed"><ReactMarkdown>{revisions}</ReactMarkdown></div>
        ) : (
          <p className="text-sm text-muted-foreground italic">Sem regras de revisão definidas.</p>
        )}
        <p className="text-sm leading-relaxed mt-3">
          4.2. As solicitações de revisão devem ser formalizadas por escrito (e-mail ou plataforma oficial de gestão). Alterações que excedam os limites aqui estipulados serão consideradas novo escopo, sujeitas a novo orçamento e aprovação prévia.
        </p>
        <p className="text-sm leading-relaxed mt-3">
          4.3. A ausência de feedback ou resposta do CONTRATANTE no prazo de 5 (cinco) dias úteis após a entrega de uma etapa será considerada como aceite tácito (aprovação automática) da respectiva fase.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-base font-bold uppercase tracking-wide mb-2">Cláusula 5 — Da Propriedade Intelectual e Portfólio</h2>
        <p className="text-sm leading-relaxed">
          5.1. {GOLDEN_RULE_FORMAL}
        </p>
        <p className="text-sm leading-relaxed mt-3">
          5.2. A CONTRATADA reserva-se o direito de exibir as peças criadas em seu portfólio, site e redes sociais para fins de divulgação profissional.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-base font-bold uppercase tracking-wide mb-2">Cláusula 6 — Do Investimento, Inadimplência e Rescisão</h2>
        <p className="text-sm leading-relaxed">
          6.1. O valor total acordado para a execução do escopo é de: <strong>{paymentValue != null ? formatBRL(paymentValue) : "a definir"}</strong>
          {downPayment != null && downPayment > 0 && <>, sendo o valor da entrada de <strong>{formatBRL(downPayment)}</strong> para o início do projeto</>}.
          {deadline && <> O prazo estimado para conclusão é de: <strong>{deadline}</strong>.</>}
          {paymentTerms && <> Condições de pagamento: <strong>{formatPaymentTermsLabel(paymentTerms)}</strong>.</>}
        </p>
        <p className="text-sm leading-relaxed mt-3">
          6.2. O atraso no pagamento de qualquer parcela sujeitará o CONTRATANTE a uma multa moratória de 2% (dois por cento) sobre o valor devido, além de juros de 1% (um por cento) ao mês, e poderá acarretar a paralisação imediata dos serviços.
        </p>
        <p className="text-sm leading-relaxed mt-3">
          6.3. Em caso de rescisão imotivada por parte do CONTRATANTE após o início dos trabalhos, os valores já pagos referentes às etapas concluídas não serão reembolsados.
        </p>
        <p className="text-sm leading-relaxed mt-3">
          6.4. O valor do projeto não inclui a aquisição de licenças de terceiros (fontes pagas, bancos de imagens, plugins). Se necessários, os custos e licenças serão de responsabilidade exclusiva do CONTRATANTE.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-base font-bold uppercase tracking-wide mb-2">Cláusula 7 — Do Foro</h2>
        <p className="text-sm leading-relaxed">
          7.1. Elege-se o foro da comarca da sede da CONTRATADA para dirimir quaisquer dúvidas oriundas deste contrato.
        </p>
      </section>
    </>
  );
}

/* ──────────────────────────── TEMPLATE: FRIENDLY ────────────────────────────── */
function FriendlyClauses({
  deliverables, exclusions, paymentValue, downPayment, deadline, paymentTerms,
}: Pick<ContractDocProps, "deliverables" | "exclusions" | "paymentValue" | "downPayment" | "deadline" | "paymentTerms">) {
  return (
    <>
      <section className="mb-6">
        <h2 className="text-base font-bold uppercase tracking-wide mb-2">O que vamos fazer juntos</h2>
        {deliverables ? (
          <div className="text-sm leading-relaxed"><ReactMarkdown>{deliverables}</ReactMarkdown></div>
        ) : (
          <p className="text-sm text-muted-foreground italic">Sem entregáveis definidos.</p>
        )}
        <p className="text-sm leading-relaxed mt-3">
          Se precisar de algo além do combinado, fazemos um novo orçamento juntos. Sem surpresas. 😊
        </p>
      </section>

      {exclusions && (
        <section className="mb-6">
          <h2 className="text-base font-bold uppercase tracking-wide mb-2">O que fica de fora</h2>
          <div className="text-sm leading-relaxed"><ReactMarkdown>{exclusions}</ReactMarkdown></div>
          <p className="text-sm leading-relaxed mt-3">
            Qualquer outro serviço não listado acima será orçado à parte.
          </p>
        </section>
      )}

      <section className="mb-6">
        <h2 className="text-base font-bold uppercase tracking-wide mb-2">Como funciona o pagamento</h2>
        <p className="text-sm leading-relaxed">
          O valor total deste projeto é de: <strong>{paymentValue != null ? formatBRL(paymentValue) : "a combinar"}</strong>.
          {downPayment != null && downPayment > 0 && <> Para começarmos, a entrada é de <strong>{formatBRL(downPayment)}</strong>.</>}
          {deadline && <> O prazo estimado é de <strong>{deadline}</strong>.</>}
          {paymentTerms && <> Condições: <strong>{formatPaymentTermsLabel(paymentTerms)}</strong>.</>}
        </p>
        <p className="text-sm leading-relaxed mt-3">
          {GOLDEN_RULE_FRIENDLY}
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-base font-bold uppercase tracking-wide mb-2">Combinados importantes</h2>
        <p className="text-sm leading-relaxed">
          <strong>Portfólio:</strong> Posso mostrar este trabalho no meu portfólio e redes sociais para divulgação profissional.
        </p>
        <p className="text-sm leading-relaxed mt-3">
          <strong>Atrasos:</strong> Se houver atraso no pagamento, incide uma taxa de 2% ao mês sobre o valor pendente.
        </p>
        <p className="text-sm leading-relaxed mt-3">
          <strong>Cancelamento:</strong> Se você precisar cancelar após o início, os valores das etapas já realizadas não serão devolvidos.
        </p>
        <p className="text-sm leading-relaxed mt-3">
          <strong>Foro:</strong> Fica combinado que qualquer questão sobre este acordo será resolvida na cidade do prestador de serviço.
        </p>
        <p className="text-sm leading-relaxed mt-3">
          <strong>Licenças:</strong> O valor do projeto não inclui a aquisição de licenças de terceiros (fontes pagas, bancos de imagens, plugins). Se necessários, os custos serão de responsabilidade do cliente.
        </p>
      </section>
    </>
  );
}

/* ──────────────────────────── TEMPLATE: CUSTOM ──────────────────────────────── */
function CustomClauses({
  customContractText, paymentValue, downPayment, deadline, paymentTerms,
}: Pick<ContractDocProps, "customContractText" | "paymentValue" | "downPayment" | "deadline" | "paymentTerms">) {
  return (
    <>
      {customContractText ? (
        <section className="mb-6">
          <div className="text-sm leading-relaxed"><ReactMarkdown>{customContractText}</ReactMarkdown></div>
        </section>
      ) : (
        <section className="mb-6">
          <p className="text-sm text-muted-foreground italic">Nenhum texto de contrato foi inserido.</p>
        </section>
      )}

      {(paymentValue != null || downPayment != null || deadline || paymentTerms) && (
        <section className="mb-6">
          <h2 className="text-base font-bold uppercase tracking-wide mb-2">Dados Financeiros</h2>
          <p className="text-sm leading-relaxed">
            Valor total: <strong>{paymentValue != null ? formatBRL(paymentValue) : "a definir"}</strong>
            {downPayment != null && downPayment > 0 && <>, entrada de <strong>{formatBRL(downPayment)}</strong></>}.
            {deadline && <> Prazo: <strong>{deadline}</strong>.</>}
            {paymentTerms && <> Condições: <strong>{formatPaymentTermsLabel(paymentTerms)}</strong>.</>}
          </p>
        </section>
      )}

      <Separator className="my-6 bg-white/10" />

      <section className="mb-6">
        <h2 className="text-base font-bold uppercase tracking-wide mb-2">Cláusula de Tecnologia e Handoff</h2>
        <p className="text-sm leading-relaxed">
          {GOLDEN_RULE_FORMAL}
        </p>
      </section>
    </>
  );
}

/* ────────────────────────── MAIN COMPONENT ──────────────────────────────────── */
export default function ContratoDocumento({
  workspace,
  client,
  deliverables,
  exclusions,
  revisions,
  paymentValue,
  downPayment,
  deadline,
  paymentTerms,
  signedByName,
  signedByEmail,
  signedAt,
  template = "dynamic",
  customContractText,
}: ContractDocProps) {
  return (
    <article className="prose prose-sm prose-invert max-w-none">
      <h1 className="text-center text-xl font-bold tracking-wide uppercase mb-8">
        {template === "friendly" ? "Termo de Prestação de Serviços" : "Contrato de Prestação de Serviços"}
      </h1>

      {/* Qualificação das Partes */}
      <section className="mb-6">
        <h2 className="text-base font-bold uppercase tracking-wide mb-2">
          {template === "friendly" ? "Quem somos nós" : "Qualificação das Partes"}
        </h2>
        <p className="text-sm leading-relaxed">
          <strong>{template === "friendly" ? "Prestador:" : "CONTRATADA:"}</strong> {workspace?.name ?? "—"}
          {workspace?.company_document && <>, Documento: {workspace.company_document}</>}
          {workspace?.company_address && <>, Endereço: {workspace.company_address}</>}.
        </p>
        <p className="text-sm leading-relaxed">
          <strong>{template === "friendly" ? "Cliente:" : "CONTRATANTE:"}</strong> {client.name}
          {client.company && <> ({client.company})</>}
          {client.document && <>, Documento: {client.document}</>}
          {client.address && <>, Endereço: {client.address}</>}.
        </p>
      </section>

      <Separator className="my-6 bg-white/10" />

      {/* Template-specific clauses */}
      {template === "shield" && (
        <ShieldClauses
          deliverables={deliverables} exclusions={exclusions} revisions={revisions}
          paymentValue={paymentValue} downPayment={downPayment} deadline={deadline} paymentTerms={paymentTerms}
        />
      )}
      {template === "dynamic" && (
        <DynamicClauses
          deliverables={deliverables} exclusions={exclusions} revisions={revisions}
          paymentValue={paymentValue} downPayment={downPayment} deadline={deadline} paymentTerms={paymentTerms}
        />
      )}
      {template === "friendly" && (
        <FriendlyClauses
          deliverables={deliverables} exclusions={exclusions}
          paymentValue={paymentValue} downPayment={downPayment} deadline={deadline} paymentTerms={paymentTerms}
        />
      )}
      {template === "custom" && (
        <CustomClauses
          customContractText={customContractText}
          paymentValue={paymentValue} downPayment={downPayment} deadline={deadline} paymentTerms={paymentTerms}
        />
      )}

      {signedByName && (
        <>
          <Separator className="my-6 bg-white/10" />
          <section className="mb-6 text-center">
            <p className="text-sm text-emerald-400 font-semibold">✓ Assinado digitalmente</p>
            <p className="text-sm text-muted-foreground mt-1">
              por {signedByName} ({signedByEmail})
              {signedAt && <> em {new Date(signedAt).toLocaleString("pt-BR")}</>}
            </p>
          </section>
        </>
      )}
    </article>
  );
}
