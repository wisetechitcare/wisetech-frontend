import React from "react";
import { Box, LinearProgress, Stack, Tooltip, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { GlassCard } from "@app/modules/common/components/ui";
import type { WorkflowProgress as WorkflowProgressData, WorkflowKey } from "@services/projectBilling";

/**
 * Section 2 — where this project's billing has reached, as a pipeline.
 *
 * The stage of each request is decided server-side (`stepOf` in
 * `projectWorkspaceService`) from the request's status and the operation it
 * produced. This file draws that answer; it does not compute it, because a second
 * opinion about what stage something is in is exactly how two screens start
 * disagreeing.
 */

const STEP_ICON: Record<WorkflowKey, string> = {
    REQUEST: "document",
    APPROVAL: "check-circle",
    ACCOUNTS: "inbox",
    PROFORMA: "file-added",
    PAYMENT: "wallet",
    INVOICE: "receipt-square",
    COMPLETED: "verify",
};

export interface WorkflowProgressProps {
    workflow: WorkflowProgressData;
}

const WorkflowProgress: React.FC<WorkflowProgressProps> = ({ workflow }) => {
    const currentIndex = workflow.steps.findIndex((s) => s.key === workflow.currentStep);

    /** How many live requests are sitting on each step, for the per-step caption. */
    const countAt = (key: WorkflowKey) =>
        workflow.perRequest.filter((p) => p.step === key).length;

    return (
        <GlassCard preset="section" sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ sm: "center" }}
                spacing={0.5}
                sx={{ mb: 1.5 }}
            >
                <Typography sx={{ fontWeight: 700, fontSize: 14 }}>Billing Progress</Typography>
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                    {workflow.completedCount} of {workflow.totalCount} completed · {workflow.percentage}%
                </Typography>
            </Stack>

            <LinearProgress
                variant="determinate"
                value={Math.min(100, workflow.percentage)}
                sx={{ height: 6, borderRadius: 3, mb: 2 }}
            />

            {/* Horizontal on desktop, scrollable rather than wrapped — a pipeline that
                wraps mid-flow stops reading as a sequence. */}
            <Box sx={{ overflowX: "auto", pb: 0.5 }}>
                <Stack direction="row" alignItems="flex-start" sx={{ minWidth: 620 }}>
                    {workflow.steps.map((step, index) => {
                        const done = index < currentIndex;
                        const current = index === currentIndex;
                        const count = countAt(step.key);
                        const tone = done
                            ? "success.main"
                            : current
                              ? "primary.main"
                              : "text.disabled";

                        return (
                            <Stack
                                key={step.key}
                                alignItems="center"
                                sx={{ flex: 1, minWidth: 0, position: "relative" }}
                            >
                                {/* Connector sits behind the marker and stops before the last one. */}
                                {index < workflow.steps.length - 1 && (
                                    <Box
                                        sx={{
                                            position: "absolute",
                                            top: 17,
                                            left: "50%",
                                            right: "-50%",
                                            height: 2,
                                            bgcolor: done ? "success.main" : "divider",
                                        }}
                                    />
                                )}
                                <Tooltip
                                    title={
                                        count
                                            ? `${count} billing request${count === 1 ? "" : "s"} here`
                                            : "Nothing at this stage"
                                    }
                                >
                                    <Box
                                        sx={{
                                            width: 34,
                                            height: 34,
                                            borderRadius: "50%",
                                            display: "grid",
                                            placeItems: "center",
                                            border: "2px solid",
                                            borderColor: tone,
                                            color: tone,
                                            bgcolor: "background.paper",
                                            position: "relative",
                                            zIndex: 1,
                                        }}
                                    >
                                        <KTIcon iconName={STEP_ICON[step.key]} className="fs-6" />
                                    </Box>
                                </Tooltip>
                                <Typography
                                    sx={{
                                        fontSize: 11,
                                        fontWeight: current ? 700 : 500,
                                        color: current ? "text.primary" : "text.secondary",
                                        mt: 0.75,
                                        textAlign: "center",
                                        px: 0.5,
                                    }}
                                >
                                    {step.label}
                                </Typography>
                                {count > 0 && (
                                    <Typography sx={{ fontSize: 10.5, color: "text.secondary" }}>
                                        {count}
                                    </Typography>
                                )}
                            </Stack>
                        );
                    })}
                </Stack>
            </Box>
        </GlassCard>
    );
};

export default WorkflowProgress;
