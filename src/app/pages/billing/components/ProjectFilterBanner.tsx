import React from "react";
import { Stack, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { GlassCard, WtButton } from "@app/modules/common/components/ui";

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
    <Stack
      direction={{ xs: "column", sm: "row" }}
      alignItems={{ sm: "center" }}
      spacing={1}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1, minWidth: 0 }}>
        <KTIcon iconName="filter" className="fs-5" />
        <Typography sx={{ fontSize: 12.5, minWidth: 0 }}>
          Filtered to <strong>{projectName || "one project"}</strong>
        </Typography>
      </Stack>
      <Stack direction="row" spacing={0.75} sx={{ flexShrink: 0 }}>
        {onBackToProject && (
          <WtButton
            ghost
            size="small"
            onClick={onBackToProject}
            startIcon={<KTIcon iconName="arrow-left" className="fs-7" />}
            sx={{ minHeight: 30, borderRadius: "8px", fontSize: 12 }}
          >
            Back to project
          </WtButton>
        )}
        <WtButton
          ghost
          size="small"
          onClick={onClear}
          startIcon={<KTIcon iconName="cross" className="fs-7" />}
          sx={{ minHeight: 30, borderRadius: "8px", fontSize: 12 }}
        >
          Show all
        </WtButton>
      </Stack>
    </Stack>
  </GlassCard>
);

export default ProjectFilterBanner;
