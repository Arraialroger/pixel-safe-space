export async function exportContractPdf(element: HTMLElement, clientName: string) {
  const html2pdf = (await import("html2pdf.js")).default;

  const sanitized = clientName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  const filename = `contrato-${sanitized || "documento"}.pdf`;

  const opts: Record<string, unknown> = {
    margin: [12, 14, 12, 14],
    filename,
    image: { type: "jpeg", quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["avoid-all", "css", "legacy"] },
  };

  return html2pdf()
    .set(opts)
    .from(element)
    .save();
}
