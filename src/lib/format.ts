/**
 * Formatadores centralizados de moeda e data (pt-BR).
 * Use estas funções em todo o projeto — não duplique formatadores em componentes.
 */

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/**
 * Formata um valor numérico em BRL. Retorna "—" para null/undefined.
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return BRL.format(value);
}

/**
 * Formata um valor numérico em BRL sem fallback (sempre retorna string formatada).
 * Use quando o valor é garantidamente número.
 */
export function formatBRL(value: number): string {
  return BRL.format(value);
}

/**
 * Formata data ISO em formato longo pt-BR (ex: "21 de abril de 2026").
 */
export function formatDateLong(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
