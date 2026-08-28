import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { BillingEmptyState } from "@pages/billing/components";
import { formatDateTime } from "@utils/dateFormats";
import type { WorkspaceActivity } from "@services/projectBilling";

/**
 * Sections 3 and 10 — the project's financial event stream.
 *
 * These are ONE dataset, not two. "Billing Timeline" and "Activity Feed" ask for
 * the same events (request raised, approved, proforma generated, payment
 * recorded, invoice downloaded…) and differ only in how they are drawn, so this
 * renders both from the same rows with a `variant`. Two components would be two
 * places for the same list to go stale.
 *
 * Every line's text is the `message` the owning module rendered when the event
 * happened — never reconstructed here from a type. That is what makes a line in
 * this feed identical to the same line in Billing Operations or the document
 * repository.
 */

const SOURCE_META: Record<
    WorkspaceActivity["source"],
    { icon: string; color: string; label: string }
> = {
    REQUEST: { icon: "document", color: "#1E3A8A", label: "Billing Request" },
    OPERATION: { icon: "wallet", color: "#12805C", label: "Operation" },
    DOCUMENT: { icon: "file-added", color: "#7C3AED", label: "Document" },
};

export interface ActivityFeedProps {
    activity: WorkspaceActivity[];
    /** `timeline` draws a connected rail; `feed` is a compact newest-first list. */
    variant?: "timeline" | "feed";
    /** Cap the rows rendered. Omit for all. */
    limit?: number;
    /** Opens the record the event belongs to. */
    onOpen?: (entry: WorkspaceActivity) => void;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({
    activity, variant = "feed", limit, onOpen,
}) => {
    const rows = limit ? activity.slice(0, limit) : activity;

    if (rows.length === 0) {
        return (
            <BillingEmptyState
                icon="time"
                title="No financial activity yet"
                description="Events appear here as billing requests are raised, approved, invoiced and paid."
            />
        );
    }

    return (
        <Stack spacing={variant === "timeline" ? 0 : 0.5}>
            {rows.map((entry, index) => {
                const meta = SOURCE_META[entry.source];
                const isLast = index === rows.length - 1;
                const clickable = Boolean(onOpen);

                return (
                    <Stack
                        key={entry.id}
                        direction="row"
                        spacing={1.25}
                        onClick={clickable ? () => onOpen?.(entry) : undefined}
                        sx={{
                            minHeight: variant === "timeline" ? 54 : undefined,
                            px: variant === "feed" ? 1 : 0,
                            py: variant === "feed" ? 0.75 : 0,
                            borderRadius: variant === "feed" ? "10px" : 0,
                            cursor: clickable ? "pointer" : "default",
                            ...(clickable ? { "&:hover": { bgcolor: "action.hover" } } : {}),
                        }}
                    >
                        {/* Rail. The connector stops at the last marker so the line does
                            not trail into empty space. */}
                        <Stack alignItems="center" sx={{ width: 26, flexShrink: 0 }}>
                            <Box
                                sx={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: "50%",
                                    display: "grid",
                                    placeItems: "center",
                                    color: meta.color,
                                    border: "1.5px solid",
                                    borderColor: meta.color,
                                    flexShrink: 0,
                                }}
                            >
                                <KTIcon iconName={meta.icon} className="fs-8" />
                            </Box>
                            {variant === "timeline" && !isLast && (
                                <Box sx={{ width: 2, flex: 1, bgcolor: "divider", minHeight: 14 }} />
                            )}
                        </Stack>

                        <Box sx={{ flex: 1, minWidth: 0, pb: variant === "timeline" && !isLast ? 1.25 : 0 }}>
                            <Typography sx={{ fontSize: 12.5, fontWeight: 600, wordBreak: "break-word" }}>
                                {entry.message}
                            </Typography>
                            <Stack direction="row" spacing={0.75} flexWrap="wrap" alignItems="center">
                                <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                                    {formatDateTime(entry.createdAt)}
                                </Typography>
                                {entry.actorName && (
                                    <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                                        · {entry.actorName}
                                    </Typography>
                                )}
                                <Typography sx={{ fontSize: 11, color: "text.disabled" }}>
                                    · {meta.label}
                                </Typography>
                            </Stack>
                        </Box>
                    </Stack>
                );
            })}
        </Stack>
    );
};

export default ActivityFeed;
