import { forwardRef } from "react";
import ReactMarkdown from "react-markdown";
import DOMPurify from "dompurify";

type ContratoPDFViewProps = {
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

const GOLDEN_RULE_FORMAL =
  "A transferência dos direitos patrimoniais de autor e a entrega dos arquivos-fonte estão condicionadas à quitação integral de todos os valores previstos neste contrato. Até o pagamento final, a CONTRATADA retém todos os direitos sobre a obra, incluindo os arquivos finais depositados no Cofre Digital da plataforma.";

const GOLDEN_RULE_FRIENDLY =
  "Os arquivos finais em alta resolução serão liberados após a confirmação do pagamento total. Até lá, eles ficam seguros no nosso Cofre Digital.";

/* ──── Print styles ──── */
const rootStyle: React.CSSProperties = {
  background: "#ffffff",
  color: "#1a1a1a",
  fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif",
  fontSize: "13px",
  lineHeight: "1.65",
  padding: "40px 48px",
  maxWidth: "800px",
};

const h1Style: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 700,
  textAlign: "center",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "32px",
  color: "#111",
};

const h2Style: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  marginBottom: "8px",
  color: "#111",
};

const sectionStyle: React.CSSProperties = { marginBottom: "20px" };

const textStyle: React.CSSProperties = { fontSize: "13px", lineHeight: "1.65", color: "#333" };

const separatorStyle: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid #e0e0e0",
  margin: "24px 0",
};

const markdownStyle: React.CSSProperties = { fontSize: "13px", lineHeight: "1.65", color: "#333" };

const italicMuted: React.CSSProperties = { fontSize: "13px", color: "#999", fontStyle: "italic" };

/* ──── Clause renderers ──── */
function FinancialBlock({ paymentValue, downPayment, deadline, paymentTerms }: Pick<ContratoPDFViewProps, "paymentValue" | "downPayment" | "deadline" | "paymentTerms">) {
  return (
    <p style={textStyle}>
      Valor total: <strong>{paymentValue != null ? formatBRL(paymentValue) : "a definir"}</strong>
      {downPayment != null && downPayment > 0 && <>, entrada de <strong>{formatBRL(downPayment)}</strong></>}.
      {deadline && <> Prazo: <strong>{deadline}</strong>.</>}
      {paymentTerms && <> Condições: <strong>{formatPaymentTermsLabel(paymentTerms)}</strong>.</>}
    </p>
  );
}

function ShieldClausesPDF(p: Pick<ContratoPDFViewProps, "deliverables" | "exclusions" | "revisions" | "paymentValue" | "downPayment" | "deadline" | "paymentTerms">) {
  return (
    <>
      <div style={sectionStyle}>
        <h2 style={h2Style}>Cláusula 1 — Do Objeto e Escopo</h2>
        {p.deliverables ? <div style={markdownStyle}><ReactMarkdown>{p.deliverables}</ReactMarkdown></div> : <p style={italicMuted}>Sem entregáveis definidos.</p>}
        <p style={{ ...textStyle, marginTop: "10px" }}>1.2. As partes declaram que a presente relação é de natureza estritamente civil e empresarial, não configurando relação de consumo.</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>Cláusula 2 — Das Exclusões do Escopo</h2>
        {p.exclusions ? <div style={markdownStyle}><ReactMarkdown>{p.exclusions}</ReactMarkdown></div> : <p style={italicMuted}>Sem exclusões definidas.</p>}
        <p style={{ ...textStyle, marginTop: "10px" }}>2.2. Qualquer item não listado acima é automaticamente excluído do escopo e, se solicitado, será tratado como novo projeto com orçamento próprio.</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>Cláusula 3 — Dos Prazos e Obrigações</h2>
        <p style={textStyle}>3.1. O início dos trabalhos está condicionado à assinatura deste instrumento, ao pagamento da entrada (se aplicável) e à entrega de todos os materiais e informações iniciais por parte do CONTRATANTE. Atrasos no fornecimento de feedback, senhas ou aprovações prolongam o prazo final de entrega na exata e mesma proporção dos dias de atraso.</p>
        <p style={{ ...textStyle, marginTop: "10px" }}>3.2. Atrasos do CONTRATANTE superiores a 15 (quinze) dias úteis configuram suspensão automática do projeto, sem prejuízo dos valores já devidos, podendo a CONTRATADA realocar recursos para outros projetos.</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>Cláusula 4 — Dos Limites de Revisão e Aprovações</h2>
        {p.revisions ? <div style={markdownStyle}><ReactMarkdown>{p.revisions}</ReactMarkdown></div> : <p style={italicMuted}>Sem regras de revisão definidas.</p>}
        <p style={{ ...textStyle, marginTop: "10px" }}>4.2. As solicitações de revisão devem ser formalizadas por escrito (e-mail ou plataforma oficial de gestão). Alterações que excedam os limites aqui estipulados serão consideradas novo escopo, sujeitas a novo orçamento e aprovação prévia obrigatória.</p>
        <p style={{ ...textStyle, marginTop: "10px" }}>4.3. A ausência de feedback ou resposta do CONTRATANTE no prazo de 5 (cinco) dias úteis após a entrega de uma etapa será considerada como aceite tácito (aprovação automática) da respectiva fase.</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>Cláusula 5 — Da Propriedade Intelectual e Portfólio</h2>
        <p style={textStyle}>5.1. {GOLDEN_RULE_FORMAL}</p>
        <p style={{ ...textStyle, marginTop: "10px" }}>5.2. A utilização pública da obra antes da quitação configura uso indevido, sujeito a indenização nos termos do Art. 603 do Código Civil e legislação autoral aplicável.</p>
        <p style={{ ...textStyle, marginTop: "10px" }}>5.3. A CONTRATADA reserva-se o direito de exibir as peças criadas em seu portfólio, site e redes sociais para fins de divulgação profissional.</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>Cláusula 6 — Do Investimento, Inadimplência e Rescisão</h2>
        <p style={textStyle}>6.1. <FinancialBlock paymentValue={p.paymentValue} downPayment={p.downPayment} deadline={p.deadline} paymentTerms={p.paymentTerms} /></p>
        <p style={{ ...textStyle, marginTop: "10px" }}>6.2. O atraso no pagamento de qualquer parcela sujeitará o CONTRATANTE a uma multa moratória de 2% (dois por cento) sobre o valor devido, além de juros de 1% (um por cento) ao mês, e poderá acarretar a paralisação imediata dos serviços.</p>
        <p style={{ ...textStyle, marginTop: "10px" }}>6.3. Em caso de rescisão imotivada por parte do CONTRATANTE após o início dos trabalhos, os valores já pagos referentes às etapas concluídas não serão reembolsados, havendo ainda incidência de multa de 20% (vinte por cento) sobre o saldo devedor restante.</p>
        <p style={{ ...textStyle, marginTop: "10px" }}>6.4. O valor do projeto não inclui a aquisição de licenças de terceiros (fontes pagas, bancos de imagens, plugins). Se necessários, os custos e licenças serão de responsabilidade exclusiva do CONTRATANTE.</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>Cláusula 7 — Do Foro</h2>
        <p style={textStyle}>7.1. Elege-se o foro da comarca da sede da CONTRATADA para dirimir quaisquer dúvidas oriundas deste contrato, com possibilidade de arbitragem.</p>
      </div>
    </>
  );
}

function DynamicClausesPDF(p: Pick<ContratoPDFViewProps, "deliverables" | "exclusions" | "revisions" | "paymentValue" | "downPayment" | "deadline" | "paymentTerms">) {
  return (
    <>
      <div style={sectionStyle}>
        <h2 style={h2Style}>Cláusula 1 — Do Objeto e Escopo</h2>
        {p.deliverables ? <div style={markdownStyle}><ReactMarkdown>{p.deliverables}</ReactMarkdown></div> : <p style={italicMuted}>Sem entregáveis definidos.</p>}
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>Cláusula 2 — Das Exclusões do Escopo</h2>
        {p.exclusions ? <div style={markdownStyle}><ReactMarkdown>{p.exclusions}</ReactMarkdown></div> : <p style={italicMuted}>Sem exclusões definidas.</p>}
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>Cláusula 3 — Dos Prazos e Obrigações</h2>
        <p style={textStyle}>3.1. O início dos trabalhos está condicionado à assinatura deste instrumento, ao pagamento da entrada (se aplicável) e à entrega de todos os materiais e informações iniciais por parte do CONTRATANTE. Atrasos no fornecimento de feedback, senhas ou aprovações prolongam o prazo final de entrega na exata e mesma proporção dos dias de atraso.</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>Cláusula 4 — Dos Limites de Revisão e Aprovações</h2>
        {p.revisions ? <div style={markdownStyle}><ReactMarkdown>{p.revisions}</ReactMarkdown></div> : <p style={italicMuted}>Sem regras de revisão definidas.</p>}
        <p style={{ ...textStyle, marginTop: "10px" }}>4.2. As solicitações de revisão devem ser formalizadas por escrito (e-mail ou plataforma oficial de gestão). Alterações que excedam os limites aqui estipulados serão consideradas novo escopo, sujeitas a novo orçamento e aprovação prévia.</p>
        <p style={{ ...textStyle, marginTop: "10px" }}>4.3. A ausência de feedback ou resposta do CONTRATANTE no prazo de 5 (cinco) dias úteis após a entrega de uma etapa será considerada como aceite tácito (aprovação automática) da respectiva fase.</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>Cláusula 5 — Da Propriedade Intelectual e Portfólio</h2>
        <p style={textStyle}>5.1. {GOLDEN_RULE_FORMAL}</p>
        <p style={{ ...textStyle, marginTop: "10px" }}>5.2. A CONTRATADA reserva-se o direito de exibir as peças criadas em seu portfólio, site e redes sociais para fins de divulgação profissional.</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>Cláusula 6 — Do Investimento, Inadimplência e Rescisão</h2>
        <FinancialBlock paymentValue={p.paymentValue} downPayment={p.downPayment} deadline={p.deadline} paymentTerms={p.paymentTerms} />
        <p style={{ ...textStyle, marginTop: "10px" }}>6.2. O atraso no pagamento de qualquer parcela sujeitará o CONTRATANTE a uma multa moratória de 2% (dois por cento) sobre o valor devido, além de juros de 1% (um por cento) ao mês, e poderá acarretar a paralisação imediata dos serviços.</p>
        <p style={{ ...textStyle, marginTop: "10px" }}>6.3. Em caso de rescisão imotivada por parte do CONTRATANTE após o início dos trabalhos, os valores já pagos referentes às etapas concluídas não serão reembolsados.</p>
        <p style={{ ...textStyle, marginTop: "10px" }}>6.4. O valor do projeto não inclui a aquisição de licenças de terceiros (fontes pagas, bancos de imagens, plugins). Se necessários, os custos e licenças serão de responsabilidade exclusiva do CONTRATANTE.</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>Cláusula 7 — Do Foro</h2>
        <p style={textStyle}>7.1. Elege-se o foro da comarca da sede da CONTRATADA para dirimir quaisquer dúvidas oriundas deste contrato.</p>
      </div>
    </>
  );
}

function FriendlyClausesPDF(p: Pick<ContratoPDFViewProps, "deliverables" | "exclusions" | "paymentValue" | "downPayment" | "deadline" | "paymentTerms">) {
  return (
    <>
      <div style={sectionStyle}>
        <h2 style={h2Style}>O que vamos fazer juntos</h2>
        {p.deliverables ? <div style={markdownStyle}><ReactMarkdown>{p.deliverables}</ReactMarkdown></div> : <p style={italicMuted}>Sem entregáveis definidos.</p>}
        <p style={{ ...textStyle, marginTop: "10px" }}>Se precisar de algo além do combinado, fazemos um novo orçamento juntos. Sem surpresas. 😊</p>
      </div>
      {p.exclusions && (
        <div style={sectionStyle}>
          <h2 style={h2Style}>O que fica de fora</h2>
          <div style={markdownStyle}><ReactMarkdown>{p.exclusions}</ReactMarkdown></div>
          <p style={{ ...textStyle, marginTop: "10px" }}>Qualquer outro serviço não listado acima será orçado à parte.</p>
        </div>
      )}
      <div style={sectionStyle}>
        <h2 style={h2Style}>Como funciona o pagamento</h2>
        <FinancialBlock paymentValue={p.paymentValue} downPayment={p.downPayment} deadline={p.deadline} paymentTerms={p.paymentTerms} />
        <p style={{ ...textStyle, marginTop: "10px" }}>{GOLDEN_RULE_FRIENDLY}</p>
      </div>
      <div style={sectionStyle}>
        <h2 style={h2Style}>Combinados importantes</h2>
        <p style={textStyle}><strong>Portfólio:</strong> Posso mostrar este trabalho no meu portfólio e redes sociais para divulgação profissional.</p>
        <p style={{ ...textStyle, marginTop: "10px" }}><strong>Atrasos:</strong> Se houver atraso no pagamento, incide uma taxa de 2% ao mês sobre o valor pendente.</p>
        <p style={{ ...textStyle, marginTop: "10px" }}><strong>Cancelamento:</strong> Se você precisar cancelar após o início, os valores das etapas já realizadas não serão devolvidos.</p>
        <p style={{ ...textStyle, marginTop: "10px" }}><strong>Foro:</strong> Fica combinado que qualquer questão sobre este acordo será resolvida na cidade do prestador de serviço.</p>
        <p style={{ ...textStyle, marginTop: "10px" }}><strong>Licenças:</strong> O valor do projeto não inclui a aquisição de licenças de terceiros (fontes pagas, bancos de imagens, plugins). Se necessários, os custos serão de responsabilidade do cliente.</p>
      </div>
    </>
  );
}

function CustomClausesPDF(p: Pick<ContratoPDFViewProps, "customContractText" | "paymentValue" | "downPayment" | "deadline" | "paymentTerms">) {
  return (
    <>
      {p.customContractText ? (
        <div style={sectionStyle}>
          <div style={markdownStyle} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(p.customContractText) }} />
        </div>
      ) : (
        <div style={sectionStyle}><p style={italicMuted}>Nenhum texto de contrato foi inserido.</p></div>
      )}
      {(p.paymentValue != null || p.downPayment != null || p.deadline || p.paymentTerms) && (
        <div style={sectionStyle}>
          <h2 style={h2Style}>Dados Financeiros</h2>
          <FinancialBlock paymentValue={p.paymentValue} downPayment={p.downPayment} deadline={p.deadline} paymentTerms={p.paymentTerms} />
        </div>
      )}
      <hr style={separatorStyle} />
      <div style={sectionStyle}>
        <h2 style={h2Style}>Cláusula de Tecnologia e Handoff</h2>
        <p style={textStyle}>{GOLDEN_RULE_FORMAL}</p>
      </div>
    </>
  );
}

/* ──── Main component ──── */
const ContratoPDFView = forwardRef<HTMLDivElement, ContratoPDFViewProps>(
  (props, ref) => {
    const {
      workspace, client, deliverables, exclusions, revisions,
      paymentValue, downPayment, deadline, paymentTerms,
      signedByName, signedByEmail, signedAt,
      template = "dynamic", customContractText,
    } = props;

    const isFriendly = template === "friendly";

    return (
      <div ref={ref} style={rootStyle}>
        <h1 style={h1Style}>
          {isFriendly ? "Termo de Prestação de Serviços" : "Contrato de Prestação de Serviços"}
        </h1>

        {/* Partes */}
        <div style={sectionStyle}>
          <h2 style={h2Style}>{isFriendly ? "Quem somos nós" : "Qualificação das Partes"}</h2>
          <p style={textStyle}>
            <strong>{isFriendly ? "Prestador:" : "CONTRATADA:"}</strong> {workspace?.name ?? "—"}
            {workspace?.company_document && <>, Documento: {workspace.company_document}</>}
            {workspace?.company_address && <>, Endereço: {workspace.company_address}</>}.
          </p>
          <p style={textStyle}>
            <strong>{isFriendly ? "Cliente:" : "CONTRATANTE:"}</strong> {client.name}
            {client.company && <> ({client.company})</>}
            {client.document && <>, Documento: {client.document}</>}
            {client.address && <>, Endereço: {client.address}</>}.
          </p>
        </div>

        <hr style={separatorStyle} />

        {template === "shield" && <ShieldClausesPDF deliverables={deliverables} exclusions={exclusions} revisions={revisions} paymentValue={paymentValue} downPayment={downPayment} deadline={deadline} paymentTerms={paymentTerms} />}
        {template === "dynamic" && <DynamicClausesPDF deliverables={deliverables} exclusions={exclusions} revisions={revisions} paymentValue={paymentValue} downPayment={downPayment} deadline={deadline} paymentTerms={paymentTerms} />}
        {template === "friendly" && <FriendlyClausesPDF deliverables={deliverables} exclusions={exclusions} paymentValue={paymentValue} downPayment={downPayment} deadline={deadline} paymentTerms={paymentTerms} />}
        {template === "custom" && <CustomClausesPDF customContractText={customContractText} paymentValue={paymentValue} downPayment={downPayment} deadline={deadline} paymentTerms={paymentTerms} />}

        {signedByName && (
          <>
            <hr style={separatorStyle} />
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <p style={{ fontSize: "13px", color: "#16a34a", fontWeight: 600 }}>✓ Assinado digitalmente</p>
              <p style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                por {signedByName} ({signedByEmail})
                {signedAt && <> em {new Date(signedAt).toLocaleString("pt-BR")}</>}
              </p>
            </div>
          </>
        )}
      </div>
    );
  }
);

ContratoPDFView.displayName = "ContratoPDFView";

export default ContratoPDFView;
