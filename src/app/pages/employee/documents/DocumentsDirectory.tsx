import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import SmartAvatar from "@app/modules/common/components/SmartAvatar";
import { GlassCard, GlassSurface, ListHeader, StatusCyclePill, ToneChip, ToolbarFilterSelect } from "@app/modules/common/components/ui";
import { formatDate } from "@utils/dateFormats";
import { fetchDocumentsDirectory } from "@services/employee";
import type { DocumentsDirectoryEntry } from "@services/employee";
import { fetchOrganizationTree } from "@services/company";
import { fetchBranches } from "@services/options";

interface OrgOption {
  id: string;
  name: string;
}

/** Active → Inactive → All. "All" is a third stop on the same rotation rather than
 *  a separate control, so the button always names exactly what is on screen. */
type StatusFilter = "active" | "inactive" | "all";

const STATUS_OPTIONS = [
  { value: "active" as const, label: "Active", color: "#15803D" },
  { value: "inactive" as const, label: "Inactive", color: "#B45309" },
  { value: "all" as const, label: "All", color: "#1E3A8A" },
];

const FILTER_ACTIVE_THEME = {
  icon: "#3b82f6",
  border: "#bfdbfe",
  bg: "#eff6ff",
  text: "#1e40af",
  ring: "rgba(59, 130, 246, 0.12)",
};

const StatTile: React.FC<{ label: string; value: React.ReactNode; icon: string; color: string; tint: string }> = ({
  label,
  value,
  icon,
  color,
  tint,
}) => (
  <GlassCard preset="tile" sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
    <Box
      sx={{
        width: 40,
        height: 40,
        borderRadius: "11px",
        display: "grid",
        placeItems: "center",
        bgcolor: tint,
        color,
        flexShrink: 0,
      }}
    >
      <Box component="i" className={icon} aria-hidden sx={{ fontSize: 18 }} />
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1 }}>{value}</Typography>
      <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>{label}</Typography>
    </Box>
  </GlassCard>
);

/**
 * HR Documents — the landing list.
 *
 * Built on the shared `MaterialTable` rather than a hand-rolled table, the same as
 * the Employees and Salary screens. That is what brings column search, column
 * show/hide, sorting, pagination, export and fullscreen for free — and, more to the
 * point, means this list behaves identically to every other list in the app instead
 * of being a one-off that has to relearn all of it.
 */
const DocumentsDirectory: React.FC = () => {
  const navigate = useNavigate();

  const [rows, setRows] = useState<DocumentsDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [subOrganizations, setSubOrganizations] = useState<OrgOption[]>([]);
  const [branches, setBranches] = useState<Array<OrgOption & { companyId?: string }>>([]);

  const [subOrganizationId, setSubOrganizationId] = useState("All");
  const [branchId, setBranchId] = useState("All");
  const [status, setStatus] = useState<StatusFilter>("active");

  // Filter options. Sub-organizations come from the org tree flattened to a list —
  // a nested picker would be over-built for a two-level filter.
  useEffect(() => {
    let cancelled = false;

    const loadFilters = async () => {
      try {
        const [treeRes, branchRes] = await Promise.all([fetchOrganizationTree(), fetchBranches()]);
        if (cancelled) return;

        const flat: OrgOption[] = [];
        const walk = (nodes: any[]) =>
          (nodes || []).forEach((node) => {
            if (node?.id) flat.push({ id: node.id, name: node.name });
            walk(node.children || []);
          });
        walk(treeRes?.data?.organizations ?? []);
        setSubOrganizations(flat);

        setBranches(
          (branchRes?.data?.branches ?? []).map((b: any) => ({
            id: b.id,
            name: b.name,
            companyId: b.companyId,
          }))
        );
      } catch {
        // Filters are an aid, not a gate — the list still loads unfiltered.
      }
    };

    loadFilters();
    return () => {
      cancelled = true;
    };
  }, []);

  // Branch list narrows to the chosen sub-organization, and a branch that no longer
  // belongs to it is dropped rather than silently filtering to nothing.
  const visibleBranches = useMemo(
    () => (subOrganizationId !== "All" ? branches.filter((b) => b.companyId === subOrganizationId) : branches),
    [branches, subOrganizationId]
  );

  useEffect(() => {
    if (branchId !== "All" && !visibleBranches.some((b) => b.id === branchId)) setBranchId("All");
  }, [visibleBranches, branchId]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchDocumentsDirectory({
          subOrganizationId: subOrganizationId !== "All" ? subOrganizationId : undefined,
          branchId: branchId !== "All" ? branchId : undefined,
          // "All" sends nothing, which the API reads as "no status filter".
          status: status === "all" ? undefined : status,
        });
        if (cancelled) return;
        setRows(response?.data?.employees ?? []);
      } catch (err: any) {
        if (cancelled) return;
        setError(
          err?.response?.status === 403
            ? "You do not have permission to view the company document directory."
            : "Could not load the document directory. Please try again."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [subOrganizationId, branchId, status]);

  /**
   * Flattened for the table.
   *
   * MaterialTable searches and sorts on the raw accessor value, so every column that
   * a user might search has to be a plain string on the row — a nested `branch.name`
   * would be invisible to the column search.
   */
  const tableRows = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        employeeCodeText: row.employeeCode || "—",
        branchName: row.branch?.name || "—",
        subOrganizationName: row.subOrganization?.name || "—",
        dateOfJoiningText: row.dateOfJoining ? formatDate(row.dateOfJoining) : "—",
        // Sorted as text, which is safe ONLY because the company format is
        // YYYY.MM.DD — it sorts identically as a string and as a date.
        lastAddedText: row.lastUpdatedAt
          ? formatDate(row.lastUpdatedAt)
          : row.documentCount > 0
            ? "Not dated"
            : "No documents",
        // The server's verdict, not a second guess from `dateOfExit`. Deriving it
        // here would disagree with the filter for anyone suspended, rehired, or
        // holding a future exit date.
        statusText: row.isCurrentlyActive ? "Active" : "Inactive",
      })),
    [rows]
  );

  const totals = useMemo(
    () => ({
      employees: rows.length,
      documents: rows.reduce((sum, row) => sum + row.documentCount, 0),
      missing: rows.filter((row) => row.documentCount === 0).length,
    }),
    [rows]
  );

  const columns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Employee",
        Cell: ({ row }: any) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
            <SmartAvatar
              name={row.original.name}
              id={row.original.id}
              imageUrl={row.original.avatar}
              size={36}
              imageFit="cover"
              status={row.original.isCurrentlyActive ? "active" : "inactive"}
            />
            <Box sx={{ minWidth: 0 }}>
              <Box
                component="button"
                type="button"
                onClick={() => navigate(`/employee/documents/${row.original.id}`)}
                sx={{
                  border: 0,
                  background: "none",
                  p: 0,
                  font: "inherit",
                  fontWeight: 600,
                  fontSize: 13.5,
                  color: "text.primary",
                  cursor: "pointer",
                  textAlign: "left",
                  "&:hover": { color: "primary.main" },
                }}
              >
                {row.original.name || "—"}
              </Box>
              <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>
                {[row.original.employeeCode, row.original.branchName].filter((v) => v && v !== "—").join(" · ") || "—"}
              </Typography>
            </Box>
          </Box>
        ),
      },
      { accessorKey: "employeeCodeText", header: "Employee ID" },
      { accessorKey: "jobProfile", header: "Job Profile", Cell: ({ renderedCellValue }: any) => renderedCellValue || "—" },
      { accessorKey: "subOrganizationName", header: "Sub Organization" },
      { accessorKey: "branchName", header: "Branch" },
      { accessorKey: "dateOfJoiningText", header: "Date Of Joining" },
      {
        accessorKey: "documentCount",
        header: "Documents",
        Cell: ({ row }: any) => (
          <ToneChip
            label={String(row.original.documentCount)}
            tone={row.original.documentCount === 0 ? "warning" : "success"}
            dense
          />
        ),
      },
      {
        accessorKey: "lastAddedText",
        // "Last Added", not "Last Updated": the document tables carry only a
        // `createdAt` and the update path never touches it, so re-uploading a
        // document has never moved this date.
        header: "Last Added",
        Cell: ({ renderedCellValue, row }: any) => (
          <Box component="span" sx={{ color: row.original.lastUpdatedAt ? "text.primary" : "text.disabled" }}>
            {renderedCellValue}
          </Box>
        ),
      },
      { accessorKey: "statusText", header: "Status" },
    ],
    [navigate]
  );

  return (
    <Box sx={{ maxWidth: 1600, mx: "auto", p: { xs: 1.5, sm: 2.5 }, display: "flex", flexDirection: "column", gap: 2 }}>
      <ListHeader
        title="Documents"
        subtitle="Every document held against every employee — onboarding uploads, identity proofs, certificates, bank proof and signatures."
      />

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 1.5 }}>
        <StatTile label="Employees" value={totals.employees} icon="bi-people" color="#1E3A8A" tint="rgba(30, 58, 138, 0.10)" />
        <StatTile label="Documents on file" value={totals.documents} icon="bi-folder2-open" color="#0F766E" tint="rgba(15, 118, 110, 0.10)" />
        <StatTile label="Nothing on file" value={totals.missing} icon="bi-exclamation-triangle" color="#B45309" tint="rgba(180, 83, 9, 0.10)" />
      </Box>

      <GlassSurface
        variant="thin"
        radius={16}
        sx={{ p: 1.5, display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center" }}
      >
        <StatusCyclePill<StatusFilter>
          options={STATUS_OPTIONS}
          value={status}
          onChange={setStatus}
        />

        <ToolbarFilterSelect
          label="Sub Organization"
          icon="bi-building"
          value={subOrganizationId}
          onChange={setSubOrganizationId}
          minWidth={220}
          theme={subOrganizationId !== "All" ? FILTER_ACTIVE_THEME : undefined}
          options={[
            { value: "All", label: "All Sub Organizations" },
            ...subOrganizations.map((org) => ({ value: org.id, label: org.name })),
          ]}
        />

        <ToolbarFilterSelect
          label="Branch"
          icon="bi-geo-alt"
          value={branchId}
          onChange={setBranchId}
          minWidth={200}
          theme={branchId !== "All" ? FILTER_ACTIVE_THEME : undefined}
          options={[
            { value: "All", label: "All Branches" },
            ...visibleBranches.map((branch) => ({ value: branch.id, label: branch.name })),
          ]}
        />
      </GlassSurface>

      {error ? (
        <GlassCard preset="section" sx={{ textAlign: "center", py: 5 }}>
          <Box component="i" className="bi bi-shield-exclamation" aria-hidden sx={{ fontSize: 32, color: "text.disabled" }} />
          <Typography sx={{ fontSize: 14, fontWeight: 600, mt: 1 }}>{error}</Typography>
        </GlassCard>
      ) : (
        <Box sx={{ position: "relative", opacity: loading ? 0.5 : 1, transition: "opacity .15s ease" }}>
          <MaterialTable
            columns={columns}
            data={tableRows}
            tableName="DocumentsDirectory"
            enableColumnSpecificSearch
            muiTableProps={{
              // The row is the way into an employee's documents, so the whole row
              // has to be clickable — not just the name.
              muiTableBodyRowProps: (row: any) => ({
                onClick: () => navigate(`/employee/documents/${row.row.original.id}`),
                sx: { cursor: "pointer" },
              }),
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default DocumentsDirectory;
