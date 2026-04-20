import { useEffect, useState } from "react";
import { Table as TableIcon, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

export type ViewMode = "table" | "cards";

const STORAGE_PREFIX = "pixelsafe-view:";

export function useViewMode(key: string, defaultMode: ViewMode = "table") {
  const storageKey = `${STORAGE_PREFIX}${key}`;
  const [mode, setMode] = useState<ViewMode>(defaultMode);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === "table" || saved === "cards") setMode(saved);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const update = (next: ViewMode) => {
    setMode(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      /* ignore */
    }
  };

  return [mode, update] as const;
}

const options: { value: ViewMode; label: string; Icon: typeof TableIcon }[] = [
  { value: "table", label: "Visualizar em tabela", Icon: TableIcon },
  { value: "cards", label: "Visualizar em cards", Icon: LayoutGrid },
];

export function ViewModeToggle({
  mode,
  onChange,
  className,
}: {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Modo de visualização"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-border bg-card/60 p-0.5",
        className,
      )}
    >
      {options.map(({ value, label, Icon }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            onClick={() => {
              if (active) return;
              haptic(10);
              onChange(value);
            }}
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}
