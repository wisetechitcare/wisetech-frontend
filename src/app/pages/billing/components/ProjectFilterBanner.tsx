import React from "react";
import { ArrowLeft, Funnel, X } from "lucide-react";
import { Button } from "@/ds/ui/button";
import { GlassCard } from "@app/modules/common/components/ui";

/**
 * "You are looking at one project, not everything."
 *
 * A Billing list opened by drilling down from a project's Financial Workspace is
 * pre-filtered by `?projectId=`. Without this the user sees a short list and
 * reasonably concludes rows are missing — a silent filter is the fastest way to
 * make people distrust a screen. So the filter announces itself and offers the
 * way out.
 */
const ProjectFilterBanner: React.FC<{
  projectName?: string | null;
  onClear: () => void;
  onBackToProject?: () => void;
}> = ({ projectName, onClear, onBackToProject }) => (
  <GlassCard
    preset="row"
    accentEdge="blue"
    sx={{ p: 1.25, mb: 1.5 }}
  >
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 flex-row items-center gap-2">
        <Funnel aria-hidden className="size-4 shrink-0" />
        <p className="min-w-0 text-[12.5px]">
          Filtered to <strong>{projectName || "one project"}</strong>
        </p>
      </div>
      <div className="flex shrink-0 flex-row gap-1.5">
        {onBackToProject && (
          <Button variant="ghost" size="sm" onClick={onBackToProject}>
            <ArrowLeft data-icon="inline-start" aria-hidden />
            Back to project
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X data-icon="inline-start" aria-hidden />
          Show all
        </Button>
      </div>
    </div>
  </GlassCard>
);

export default ProjectFilterBanner;
