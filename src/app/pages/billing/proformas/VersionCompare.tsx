import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import { ToneChip } from "@app/modules/common/components/ui";
import type { FieldChange, VersionComparison } from "@services/proformas";

/**
 * Side-by-side diff of two revisions.
 *
 * Two sections, not one, because they answer different questions. EDITABLE is
 * "what did someone change" — notes, terms, bank details. FINANCIAL is "did the
 * ERP data move under us", which nobody did on purpose and nobody can undo here;
 * it changes only by regenerating from Billing.
 *
 * Unchanged rows are collapsed by default: a diff that shows forty identical
 * fields alongside two real changes hides the two.
 */

const KIND_TONE = {
    added: "success",
    removed: "danger",
    changed: "warning",
    unchanged: "neutral",
} as const;

const ChangeRow: React.FC<{ change: FieldChange }> = ({ change }) => (
    <Box
        sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "180px minmax(0, 1fr) minmax(0, 1fr)" },
            gap: 1,
            py: 0.75,
            borderTop: (t) => `1px solid ${t.palette.divider}`,
            alignItems: "start",
        }}
    >
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, minWidth: 0 }}>{change.label}</Typography>
            {change.kind !== "unchanged" && (
                <ToneChip tone={KIND_TONE[change.kind]} label={change.kind} dense />
            )}
        </Stack>
        <Typography
            sx={{
                fontSize: 12, whiteSpace: "pre-line", minWidth: 0, wordBreak: "break-word",
                color: change.kind === "unchanged" ? "text.secondary" : "text.primary",
                textDecoration: change.kind === "removed" ? "line-through" : "none",
            }}
        >
            {change.before ?? "—"}
        </Typography>
        <Typography
            sx={{
                fontSize: 12, whiteSpace: "pre-line", minWidth: 0, wordBreak: "break-word",
                fontWeight: change.kind === "unchanged" ? 400 : 600,
                color: change.kind === "unchanged" ? "text.secondary" : "text.primary",
            }}
        >
            {change.after ?? "—"}
        </Typography>
    </Box>
);

const Section: React.FC<{ title: string; hint?: string; changes: FieldChange[]; showUnchanged: boolean }> = ({
    title, hint, changes, showUnchanged,
}) => {
    const visible = showUnchanged ? changes : changes.filter((c) => c.kind !== "unchanged");
    if (!changes.length) return null;
    return (
        <Box sx={{ mb: 2.5 }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, mb: 0.25 }}>{title}</Typography>
            {hint && <Typography sx={{ fontSize: 11, color: "text.secondary", mb: 0.5 }}>{hint}</Typography>}
            {visible.length === 0 ? (
                <Typography sx={{ fontSize: 12, color: "text.secondary", py: 1 }}>
                    Nothing changed here.
                </Typography>
            ) : (
                visible.map((change) => <ChangeRow key={change.field} change={change} />)
            )}
        </Box>
    );
};

const VersionCompare: React.FC<{ comparison: VersionComparison; showUnchanged: boolean }> = ({
    comparison, showUnchanged,
}) => (
    <Box>
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "180px minmax(0, 1fr) minmax(0, 1fr)" },
                gap: 1,
                pb: 0.5,
            }}
        >
            <Typography sx={{ fontSize: 11, color: "text.secondary", fontWeight: 700 }}>FIELD</Typography>
            <Typography sx={{ fontSize: 11, color: "text.secondary", fontWeight: 700 }}>
                VERSION {comparison.before.versionNumber}
            </Typography>
            <Typography sx={{ fontSize: 11, color: "text.secondary", fontWeight: 700 }}>
                VERSION {comparison.after.versionNumber}
            </Typography>
        </Box>

        <Section
            title="Edited content"
            changes={comparison.editable}
            showUnchanged={showUnchanged}
        />
        <Section
            title="Financial & ERP data"
            hint="Read-only here — these change only by regenerating from Billing."
            changes={comparison.financial}
            showUnchanged={showUnchanged}
        />
    </Box>
);

export default VersionCompare;
