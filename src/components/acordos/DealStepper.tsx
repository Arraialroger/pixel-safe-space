import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { STAGE_ORDER, dealStageConfig, type DealStage } from "@/lib/deal-utils";

type Props = {
  currentStage: DealStage;
};

export function DealStepper({ currentStage }: Props) {
  const currentIdx = STAGE_ORDER.indexOf(currentStage);

  return (
    <div className="overflow-x-auto -mx-2 px-2 pb-2">
      <ol className="flex items-center gap-2 min-w-max">
        {STAGE_ORDER.map((stage, idx) => {
          const completed = idx < currentIdx;
          const active = idx === currentIdx;
          const cfg = dealStageConfig[stage];
          return (
            <li key={stage} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  active && "border-primary/40 bg-primary/10 text-primary",
                  completed && "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
                  !active && !completed && "border-border bg-muted/30 text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                    active && "bg-primary text-primary-foreground",
                    completed && "bg-emerald-500/30 text-emerald-300",
                    !active && !completed && "bg-muted text-muted-foreground",
                  )}
                >
                  {completed ? <Check className="h-3 w-3" /> : idx + 1}
                </span>
                <span className="whitespace-nowrap">{cfg.short}</span>
              </div>
              {idx < STAGE_ORDER.length - 1 && (
                <span
                  className={cn(
                    "h-px w-4 shrink-0",
                    idx < currentIdx ? "bg-emerald-500/40" : "bg-border",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
