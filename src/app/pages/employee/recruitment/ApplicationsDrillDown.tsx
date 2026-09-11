import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Box, Stack, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import DrillDownDialog from "@app/modules/common/components/DrillDownDialog";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { queryKeys } from "@/lib/queryKeys";
import { getApplications } from "@services/recruitment";
import { applicationColumns } from "./applicationColumns";

/**
 * The people behind a number on the overview.
 *
 * Every bar on that page was a dead end: hovering repeated the count you could already
 * read, at exactly the moment someone wants to act. "Four in Interview" is only useful if
 * you can see WHICH four.
 *
 * Composed entirely from things that already existed — `DrillDownDialog` for the shell,
 * `MaterialTable` for the grid, `applicationColumns` for what a row looks like. The only
 * new code here is the query and the heading.
 *
 * ONE component for BOTH charts. Stage and source are two filters on the same list, so a
 * second component per chart is how two views of the same records start disagreeing.
 */
export interface ApplicationsDrillDownProps {
    open: boolean;
    onClose: () => void;
    /** What the user clicked, shown as the dialog's heading. */
    title: string;
    /** Exactly one of these is set by the caller. */
    statusId?: string;
    sourceId?: string;
    companyId?: string;
}

const ApplicationsDrillDown = ({ open, onClose, title, statusId, sourceId, companyId }: ApplicationsDrillDownProps) => {
    const filters = { ...(statusId ? { statusId } : {}), ...(sourceId ? { sourceId } : {}) };

    const { data: rows = [], isLoading } = useQuery({
        queryKey: queryKeys.recruitment.applications({ companyId, ...filters }),
        queryFn: () => getApplications(filters, companyId),
        // Nothing to fetch until the dialog is open — a closed drill-down must not cost a
        // request on every overview render.
        enabled: open,
    });

    // A stage drill-down already says the stage in its heading; repeating it in a column
    // spends width on something the user just clicked.
    const columns = useMemo(
        () => applicationColumns({ omit: statusId ? ["stage"] : [] }),
        [statusId],
    );

    return (
        <DrillDownDialog open={open} onClose={onClose} maxBodyHeight="70vh" bodyClassName="p-2">
            <Box sx={{ px: { xs: 0.5, sm: 1 }, pt: { xs: 1, sm: 1.5 } }}>
                <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.5 }}>
                    <KTIcon iconName="people" className="fs-2" />
                    <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: { xs: 15, sm: 16.5 }, lineHeight: 1.3 }}>{title}</Typography>
                        <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
                            {isLoading ? "Loading…" : `${rows.length} ${rows.length === 1 ? "candidate" : "candidates"}`}
                        </Typography>
                    </Box>
                </Stack>
            </Box>

            <MaterialTable
                columns={columns}
                data={rows}
                isLoading={isLoading}
                // Named per chart so a recruiter's column choices on the stage drill-down do
                // not silently rearrange the source one.
                tableName={statusId ? "RecruitmentByStage" : "RecruitmentBySource"}
                muiTableContainerProps={{ sx: { maxHeight: "52vh" } }}
            />
        </DrillDownDialog>
    );
};

export default ApplicationsDrillDown;
