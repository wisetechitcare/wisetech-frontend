import React from "react";
import { useFormikContext } from "formik";
import { Check } from "lucide-react";
import { Progress } from "@/ds/ui/progress";
import { Item, ItemContent, ItemMedia, ItemTitle } from "@/ds/ui/item";
import { cn } from "@/ds/lib/utils";
import { EnterpriseWizardStep } from "../../types/formEngine.types";

interface WizardSidebarProps {
  sections: EnterpriseWizardStep<any>[];
  currentStep: number;
  onStepClick?: (index: number) => void;
  title?: string;
}

type StepStatus = "completed" | "error" | "active" | "pending";

const hasValue = (value: any): boolean => {
  if (value === undefined || value === null || value === "") return false;
  if (Array.isArray(value)) {
    return value.some((item) =>
      typeof item === "object" && item !== null
        ? Object.values(item).some((v) => v !== undefined && v !== null && v !== "")
        : item !== undefined && item !== null && item !== "",
    );
  }
  return true;
};

const BADGE: Record<StepStatus, string> = {
  active: "bg-primary text-primary-foreground ring-primary",
  completed: "bg-success text-white ring-success",
  error: "bg-destructive text-white ring-destructive",
  pending: "bg-card text-muted-foreground ring-border",
};

export const WizardSidebar: React.FC<WizardSidebarProps> = ({
  sections,
  currentStep,
  onStepClick,
  title = "Form Progress",
}) => {
  const { values, errors, touched } = useFormikContext<any>();

  const getStatus = (section: EnterpriseWizardStep<any>, index: number): StepStatus => {
    if (section.fields.some((f) => errors[f] && touched[f])) return "error";
    if (index === currentStep) return "active";
    // A step is gated only by its REQUIRED fields; optional blanks never hold it at "pending".
    const required = section.requiredFields ?? [];
    if (!required.every((f) => hasValue(values[f]))) return "pending";
    // Optional-only steps count as done once passed, so edit-mode prefill doesn't tick steps ahead.
    if (required.length > 0 || index < currentStep) return "completed";
    return "pending";
  };

  // The active step counts toward progress once its required fields (or any field) are filled.
  const isDone = (section: EnterpriseWizardStep<any>, index: number) => {
    const status = getStatus(section, index);
    if (status === "completed") return true;
    if (status !== "active") return false;
    const required = section.requiredFields ?? [];
    return required.length > 0
      ? required.every((f) => hasValue(values[f]))
      : (section.fields || []).some((f) => hasValue(values[f]));
  };
  const completed = sections.filter(isDone).length;
  const percent = sections.length ? Math.round((completed / sections.length) * 100) : 0;

  return (
    <nav
      aria-label="Wizard step navigation"
      className="flex w-full shrink-0 items-center gap-2 overflow-x-auto border-b border-border bg-card px-3 py-2 md:w-[224px] md:flex-col md:items-stretch md:gap-3 md:overflow-y-auto md:border-r md:border-b-0 md:px-3.5 md:py-3.5 xl:w-[236px]"
    >
      <div
        role="status"
        aria-live="polite"
        className="flex min-w-32 shrink-0 flex-col gap-0.5 rounded-xl bg-linear-135 from-(--brand-bright) to-(--brand) px-3.5 py-2.5 text-white shadow-sm md:px-3.5 md:py-2.5"
      >
        <span className="text-[10px] font-bold tracking-wider uppercase opacity-80">{title}</span>
        <div className="flex items-baseline justify-between gap-1">
          <span className="text-xl leading-none font-extrabold tabular-nums md:text-2xl">{percent}%</span>
          <span className="text-[11px] font-semibold opacity-90">
            {completed} of {sections.length} steps completed
          </span>
        </div>
        <Progress value={percent} aria-label={`${percent}% complete`} className="mt-1.5 hidden md:flex [&_[data-slot=progress-indicator]]:bg-white [&_[data-slot=progress-track]]:h-1 [&_[data-slot=progress-track]]:bg-white/25" />
      </div>

      <ol className="m-0 flex list-none items-stretch gap-1 p-0 md:flex-col md:gap-0">
        {sections.map((section, index) => {
          const status = getStatus(section, index);
          return (
            <li key={section.id} className="relative flex md:flex-col">
              {/* Connector line between steps */}
              {index < sections.length - 1 && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-[32px] left-[20px] hidden h-[calc(100%-24px)] w-0.5 -translate-x-1/2 rounded-full md:block",
                    status === "completed" ? "bg-success" : "bg-border"
                  )}
                />
              )}
              {/* `border-0!`: Item's bare `border` loses to Bootstrap's unlayered `.border{… !important}`. */}
              <Item
                size="xs"
                render={<button type="button" />}
                onClick={() => onStepClick?.(index)}
                aria-current={status === "active" ? "step" : undefined}
                aria-label={`Step ${index + 1}: ${section.label}${status === "completed" ? " (completed)" : status === "error" ? " (has errors)" : ""}`}
                title={section.subtitle}
                className={cn(
                  "relative z-10 w-20 shrink-0 cursor-pointer flex-col flex-nowrap justify-center gap-1 rounded-lg border-0! bg-transparent px-1 py-1 text-center transition-colors hover:bg-muted md:min-h-10 md:w-full md:flex-row md:items-center md:gap-2 md:px-2 md:py-1.5 md:text-left",
                  status === "active" && "bg-accent ring-1 ring-primary/25 hover:bg-accent",
                )}
              >
                <ItemMedia
                  aria-hidden
                  className={cn(
                    "my-auto size-6 shrink-0 translate-y-0! self-center! rounded-full text-[10.5px] font-bold ring-1",
                    BADGE[status]
                  )}
                >
                  {status === "completed" ? <Check className="size-3.5" strokeWidth={3} /> : status === "error" ? "!" : index + 1}
                </ItemMedia>
                {/* Label only: it wraps to two lines instead of truncating; the subtitle is the hover title. */}
                <ItemContent className="my-auto min-w-0 flex-1 justify-center">
                  <ItemTitle
                    className={cn(
                      "line-clamp-2 w-full text-[11px] leading-tight font-semibold text-foreground md:text-[12.5px]",
                      status === "active" && "font-bold text-primary",
                      status === "completed" && "text-success-foreground",
                    )}
                  >
                    {section.label}
                  </ItemTitle>
                </ItemContent>
              </Item>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default WizardSidebar;
