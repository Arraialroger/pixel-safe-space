import { ArrowDownAZ, ArrowDownWideNarrow, ArrowUpWideNarrow } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type SortOption = "newest" | "oldest" | "az";

export function sortItems<T>(items: T[], option: SortOption, getName: (i: T) => string, getDate: (i: T) => string | Date): T[] {
  const arr = [...items];
  if (option === "az") {
    return arr.sort((a, b) => getName(a).localeCompare(getName(b), "pt-BR", { sensitivity: "base" }));
  }
  return arr.sort((a, b) => {
    const da = new Date(getDate(a)).getTime();
    const db = new Date(getDate(b)).getTime();
    return option === "newest" ? db - da : da - db;
  });
}

interface Props {
  value: SortOption;
  onChange: (v: SortOption) => void;
  className?: string;
}

export function SortSelector({ value, onChange, className }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as SortOption)}>
      <SelectTrigger className={className ?? "w-[180px]"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="newest">
          <span className="inline-flex items-center gap-2">
            <ArrowDownWideNarrow className="h-3.5 w-3.5" /> Mais recentes
          </span>
        </SelectItem>
        <SelectItem value="oldest">
          <span className="inline-flex items-center gap-2">
            <ArrowUpWideNarrow className="h-3.5 w-3.5" /> Mais antigos
          </span>
        </SelectItem>
        <SelectItem value="az">
          <span className="inline-flex items-center gap-2">
            <ArrowDownAZ className="h-3.5 w-3.5" /> A–Z
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
