import * as React from "react"
import { titleCase } from "@/ds/lib/text"
import { Check, CircleAlert } from "lucide-react"
import { cn } from "@/ds/lib/utils"
import { Button } from "@/ds/ui/button"
import { Progress } from "@/ds/ui/progress"

export type Step = {
  label: string
  description?: string
  optional?: boolean
  /** The step has a validation problem; `errorText` says what. */
  error?: boolean
  errorText?: string
}

/**
 * Where the user is in a multi-step task (onboarding, offer letter, payroll run). Replaces the live kit's
 * `WtStepper`. An ordered list with the current step marked; on phones it collapses to "Step 2 of 5 · Label"
 * and a progress bar. Steps are buttons only when `onStepClick` is given and the step is reachable.
 */
export function Stepper({
  steps,
  activeStep,
  completed = {},
  onStepClick,
  allowFutureNavigation = false,
  orientation = "horizontal",
  className,
}: {
  steps: Step[]
  activeStep: number
  completed?: Record<number, boolean>
  onStepClick?: (index: number) => void
  allowFutureNavigation?: boolean
  orientation?: "horizontal" | "vertical"
  className?: string
}) {
  const current = steps[activeStep]
  return (
    <nav aria-label="Progress" data-slot="stepper" className={className}>
      {orientation === "horizontal" && (
        <div className="space-y-2 sm:hidden">
          <p className="text-sm">
            <span className="text-muted-foreground">
              Step {activeStep + 1} of {steps.length} ·{" "}
            </span>
            <span className="font-medium">{current?.label}</span>
          </p>
          <Progress value={((activeStep + 1) / steps.length) * 100} aria-label="Steps completed" />
        </div>
      )}
      <ol
        className={cn(
          orientation === "horizontal" ? "hidden items-start gap-2 sm:flex" : "flex flex-col gap-1",
        )}
      >
        {steps.map((step, i) => {
          const isDone = completed[i] || i < activeStep
          const isActive = i === activeStep
          const reachable = onStepClick && (allowFutureNavigation || isDone || isActive || completed[i - 1])
          const state = step.error ? "error" : isActive ? "active" : isDone ? "done" : "todo"
          const marker = (
            <span
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-full border text-sm font-semibold tabular transition-colors [&>svg]:size-4",
                state === "active" && "border-primary bg-primary text-primary-foreground",
                state === "done" && "border-transparent bg-success-soft text-success-foreground",
                state === "error" && "border-transparent bg-destructive-soft text-destructive-foreground",
                state === "todo" && "border-border bg-background text-muted-foreground",
              )}
            >
              {state === "done" ? <Check aria-hidden /> : state === "error" ? <CircleAlert aria-hidden /> : i + 1}
            </span>
          )
          const text = (
            <span className="min-w-0 text-left">
              <span className={cn("block text-sm font-medium", state === "todo" && "text-muted-foreground")}>
                {titleCase(step.label)}
                {state === "done" && <span className="sr-only"> (completed)</span>}
              </span>
              {step.error && step.errorText ? (
                <span className="block text-xs text-destructive-foreground">{step.errorText}</span>
              ) : (
                (step.description || step.optional) && (
                  <span className="block text-xs text-muted-foreground">{step.optional ? "Optional" : step.description}</span>
                )
              )}
            </span>
          )
          const body = (
            <>
              {marker}
              {text}
            </>
          )
          return (
            <li
              key={step.label}
              aria-current={isActive ? "step" : undefined}
              className={cn(
                "flex min-w-0 items-start",
                orientation === "horizontal" && "flex-1 after:mt-4 after:ml-2 after:h-px after:flex-1 after:bg-border last:flex-none last:after:hidden",
              )}
            >
              {reachable ? (
                <Button
                  variant="ghost"
                  onClick={() => onStepClick?.(i)}
                  className="h-auto min-w-0 items-start justify-start gap-2.5 rounded-xl p-1 font-normal tracking-normal whitespace-normal"
                >
                  {body}
                </Button>
              ) : (
                <span className="flex min-w-0 items-start gap-2.5 p-1">{body}</span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
