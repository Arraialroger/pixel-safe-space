import { forwardRef } from "react";
import ReactMarkdown from "react-markdown";
import { formatCurrency, formatDate, paymentLabels } from "@/lib/proposal-utils";

type ContratoPDFProps = {
  proposal: {
    title: string;
    price: number | null;
    deadline: string | null;
    payment_terms: string | null;
    ai_generated_scope: string | null;
    status: string;
    accepted_by_name: string | null;
    accepted_by_email?: string | null;
    accepted_at: string | null;
  };
  workspace: {
    name: string;
    company_document: string | null;
    company_address: string | null;
    logo_url: string | null;
  };
  client: {
    name: string;
    company: string | null;
    document: string | null;
    address: string | null;
  };
};

const ContratoPDF = forwardRef<HTMLDivElement, ContratoPDFProps>(
  ({ proposal, workspace, client }, ref) => {
    const isAccepted = proposal.status === "accepted";

    return (
      <div ref={ref} className="bg-white text-black p-12 max-w-[210mm] mx-auto text-[13px] leading-relaxed font-sans">
        {/* Header */}
        <div className="text-center mb-10 border-b-2 border-black pb-6">
          {workspace.logo_url && (
            <img
              src={workspace.logo_url}
              alt={workspace.name}
              className="h-14 mx-auto mb-4 object-contain"
            />
          )}
          <h1 className="text-xl font-bold uppercase tracking-widest">
            Contrato de Prestação de Serviços
          </h1>
          <p className="text-sm text-gray-600 mt-2">{proposal.title}</p>
        </div>

        {/* Qualification */}
        <section className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-wider mb-3 border-b border-gray-300 pb-1">
            Qualificação das Partes
          </h2>

          <div className="grid grid-cols-2 gap-8 text-[12px]">
            <div>
              <p className="font-bold mb-1">CONTRATADA</p>
              <p>{workspace.name}</p>
              {workspace.company_document && <p>CNPJ: {workspace.company_document}</p>}
              {workspace.company_address && <p>Endereço: {workspace.company_address}</p>}
            </div>
            <div>
              <p className="font-bold mb-1">CONTRATANTE</p>
              <p>{client.name}</p>
              {client.company && <p>Empresa: {client.company}</p>}
              {client.document && <p>CPF/CNPJ: {client.document}</p>}
              {client.address && <p>Endereço: {client.address}</p>}
            </div>
          </div>
        </section>

        {/* Commercial Terms */}
        <section className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-wider mb-3 border-b border-gray-300 pb-1">
            Condições Comerciais
          </h2>
          <div className="grid grid-cols-3 gap-4 text-[12px]">
            <div>
              <p className="text-gray-500">Valor</p>
              <p className="font-semibold">{formatCurrency(proposal.price)}</p>
            </div>
            <div>
              <p className="text-gray-500">Prazo</p>
              <p className="font-semibold">{proposal.deadline ?? "—"}</p>
            </div>
            <div>
              <p className="text-gray-500">Pagamento</p>
              <p className="font-semibold">
                {proposal.payment_terms
                  ? (paymentLabels[proposal.payment_terms] ?? proposal.payment_terms)
                  : "—"}
              </p>
            </div>
          </div>
        </section>

        {/* Scope */}
        {proposal.ai_generated_scope && (
          <section className="mb-10">
            <h2 className="text-sm font-bold uppercase tracking-wider mb-3 border-b border-gray-300 pb-1">
              Escopo do Projeto
            </h2>
            <div className="prose prose-sm max-w-none prose-headings:text-black prose-headings:text-sm prose-headings:font-bold prose-p:text-[12px] prose-li:text-[12px]">
              <ReactMarkdown>{proposal.ai_generated_scope}</ReactMarkdown>
            </div>
          </section>
        )}

        {/* Signatures */}
        <section className="mt-16 pt-8 border-t-2 border-black">
          <h2 className="text-sm font-bold uppercase tracking-wider mb-6 text-center">
            Assinaturas
          </h2>

          {isAccepted ? (
            <div className="text-center space-y-2 text-[12px]">
              <p className="text-green-700 font-semibold">
                ✅ Assinado digitalmente por {proposal.accepted_by_name}
                {proposal.accepted_by_email && ` (${proposal.accepted_by_email})`} em{" "}
                {formatDate(proposal.accepted_at)}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-16 mt-8 text-[12px]">
              <div className="text-center">
                <div className="border-b border-black mb-2 h-16" />
                <p className="font-semibold">{workspace.name}</p>
                <p className="text-gray-500">Contratada</p>
              </div>
              <div className="text-center">
                <div className="border-b border-black mb-2 h-16" />
                <p className="font-semibold">{client.name}</p>
                <p className="text-gray-500">Contratante</p>
              </div>
            </div>
          )}
        </section>
      </div>
    );
  }
);

ContratoPDF.displayName = "ContratoPDF";
export default ContratoPDF;
