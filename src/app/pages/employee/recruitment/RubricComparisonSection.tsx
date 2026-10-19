import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Box, Typography } from "@mui/material";
import type { MRT_ColumnDef } from "material-react-table";
import { ConfigSectionCard } from "@app/modules/configuration";
import { WtEmptyState } from "@app/modules/common/components/ui";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { queryKeys } from "@/lib/queryKeys";
import { apiErrorMessage } from "@utils/apiError";
import { useDepartmentDesignations } from "@/hooks/useDepartmentDesignations";
import { isRoleOpenForCandidates } from "@utils/requisitions";
import { toPercentages } from "@utils/weightBalancer";
import {
    getRequisitions, getScorecardTemplates,
    type JobRequisition, type ScorecardTemplate,
} from "@services/recruitment";

type RubricRow = {
    id: string;
    role: string;
    designation: string;
    templateName: string;
    source: string;
    criteria: string;
};

/**
 * Resolve the same way the panelist API does: designation-specific template, else default.
 */
function resolveTemplate(
    designationId: string | null | undefined,
    templates: ScorecardTemplate[],
): ScorecardTemplate | null {
    if (designationId) {
        const specific = templates.find((t) => t.designationId === designationId && t.isActive !== false);
        if (specific) return specific;
    }
    return templates.find((t) => t.isDefault && t.isActive !== false) ?? null;
}

function formatCriteria(template: ScorecardTemplate | null): string {
    if (!template?.factors?.length) return "— (overall rating only)";
    const weights: Record<string, number> = {};
    for (const f of template.factors) {
        weights[f.id] = Number(f.weight) || 0;
    }
    const pct = toPercentages(weights);
    return [...template.factors]
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((f) => `${f.label} ${pct[f.id] ?? 0}%`)
        .join(" · ");
}

/**
 * Read-only table: open roles × the scorecard they would get today.
 * Makes rubric drift between near-identical requisitions visible (roadmap 2.7).
 */
const RubricComparisonSection = () => {
    const { designations } = useDepartmentDesignations();
    const designationName = (id?: string | null) =>
        id ? (designations.find((d) => d.id === id)?.role ?? "Unknown designation") : "No designation";

    const reqQ = useQuery({
        queryKey: queryKeys.recruitment.requisitions(),
        queryFn: () => getRequisitions(),
    });
    const tmplQ = useQuery({
        queryKey: queryKeys.recruitment.scorecardTemplates(),
        queryFn: getScorecardTemplates,
    });

    const isLoading = reqQ.isLoading || tmplQ.isLoading;
    const isError = reqQ.isError || tmplQ.isError;
    const error = reqQ.error ?? tmplQ.error;

    const rows = useMemo((): RubricRow[] => {
        const open = (reqQ.data ?? []).filter(isRoleOpenForCandidates);
        const templates = tmplQ.data?.templates ?? [];
        return open.map((r: JobRequisition) => {
            const template = resolveTemplate(r.designationId, templates);
            const specific = r.designationId
                ? templates.find((t) => t.designationId === r.designationId && t.isActive !== false)
                : null;
            return {
                id: r.id,
                role: r.prefix ? `${r.prefix} · ${r.title}` : r.title,
                designation: designationName(r.designationId),
                templateName: template?.name ?? "— none —",
                source: !template
                    ? "No rubric"
                    : specific
                        ? "By designation"
                        : template.isDefault
                            ? "Default"
                            : "Fallback",
                criteria: formatCriteria(template),
            };
        });
    }, [reqQ.data, tmplQ.data, designations]);

    const columns = useMemo((): MRT_ColumnDef<RubricRow>[] => [
        { accessorKey: "role", header: "Open role", size: 220 },
        { accessorKey: "designation", header: "Designation", size: 140 },
        { accessorKey: "templateName", header: "Scorecard", size: 160 },
        { accessorKey: "source", header: "How resolved", size: 120 },
        {
            accessorKey: "criteria",
            header: "Criteria (weights)",
            size: 360,
            Cell: ({ cell }) => (
                <Typography sx={{ fontSize: 12.5, lineHeight: 1.45, whiteSpace: "normal" }}>
                    {String(cell.getValue() ?? "")}
                </Typography>
            ),
        },
    ], []);

    return (
        <ConfigSectionCard
            title="Rubric comparison"
            description="Which scorecard each open role uses today — spot weight drift across similar designations."
            icon="bi-table"
            iconColor="teal"
            loading={isLoading}
        >
            {isError ? (
                <WtEmptyState
                    variant="error"
                    dense
                    title="Could not load rubric comparison"
                    hint={apiErrorMessage(error, "Check your connection and try again.")}
                    actionLabel="Retry"
                    onAction={() => { void reqQ.refetch(); void tmplQ.refetch(); }}
                />
            ) : rows.length === 0 ? (
                <WtEmptyState
                    dense
                    title="No open roles"
                    hint="Approve a headcount request with seats left to compare rubrics here."
                />
            ) : (
                <Box>
                    <MaterialTable
                        columns={columns}
                        data={rows}
                        isLoading={isLoading}
                        tableName="RecruitmentRubricCompare"
                    />
                </Box>
            )}
        </ConfigSectionCard>
    );
};

export default RubricComparisonSection;
