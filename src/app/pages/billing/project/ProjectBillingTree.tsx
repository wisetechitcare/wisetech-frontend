import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Card } from "@/ds/ui/card";
import { Table, TableBody, TableHeader } from "@/ds/ui/table";
import { EmptyState } from "@/ds/patterns/empty-state";
import type { ProjectBillingRow } from "@services/bills";
import {
    FILTERS, SORTS, attentionOf, liveBill, totalsOf, type BillingFilterTab, type BillingSortOption, type StageViewProps,
} from "./projectBillingRules";
import { COLUMN_WIDTHS, GrandTotalRow, PartsRow, StageColumns, StageRow } from "./StageTable";
import { CompactTotal, StageCard } from "./StageCards";

/**
 * Project → Billing: one row per stage (the billed unit), with its billing, collection and money. Opening a stage
 * shows its bill's path. Work never gates a bill: an Advance is billed before any work exists.
 *
 * Built from the v2 kit (src/ds). Wide screens get a table; narrower ones get a card per stage.
 */

/**
 * Below TABLE_MIN_WIDTH the ten columns cannot hold their figures without
 * overlapping, so each stage becomes a card. Same data, same order, same
 * vocabulary — only the arrangement changes:
 *   cards  — figures keep a five-column grid, aligned from one stage to the next;
 *   narrow — Bill Value and Pending (what decides the next step) lead, the rest wrap below.
 */
type Layout = "table" | "cards" | "narrow";
/** Where the widest totals still fit their 7% columns. */
const TABLE_MIN_WIDTH = 1280;
/** Where the bill path still fits on one line per step. */
const CARDS_MIN_WIDTH = 800;

export interface ProjectBillingTreeProps {
    projectId: string;
    rows: ProjectBillingRow[];
    filterTab: BillingFilterTab;
    searchQuery: string;
    sortBy: BillingSortOption;
    /** The primary step and overflow menu for one stage — owned by the workspace. */
    actionsFor: (row: ProjectBillingRow) => React.ReactNode;
    onOpenDocument: (documentId: string, status?: string | null) => void;
    /** Lets the workspace put Expand all beside Sort. Null when nothing is visible. */
    onExpandApi?: (api: { allOpen: boolean; toggle: () => void } | null) => void;
}

const ProjectBillingTree: React.FC<ProjectBillingTreeProps> = ({
    projectId, rows, filterTab, searchQuery, sortBy, actionsFor, onOpenDocument, onExpandApi,
}) => {
    // Opens with ONE stage: the first that needs attention, else none. Set once, not
    // re-derived, so a refetch after a payment never re-folds the page.
    const [openRows, setOpenRows] = useState<Set<string>>(() => {
        const first = rows.find((r) => attentionOf(r));
        return new Set(first ? [first.rowId] : []);
    });

    const query = searchQuery.trim().toLowerCase();

    const visibleRows = useMemo(() => {
        const matches = rows.filter((row) => {
            if (!FILTERS[filterTab].match(row)) return false;
            if (!query) return true;
            const bill = liveBill(row);
            return [row.stageName, bill?.proformaNumber, bill?.invoiceNumber, bill?.billNumber, ...row.deliverables.map((d) => d.name)]
                .some((text) => text?.toLowerCase().includes(query));
        });
        const compare = SORTS[sortBy].compare;
        return compare ? matches.sort(compare) : matches;
    }, [rows, filterTab, query, sortBy]);

    const toggle = (id: string) =>
        setOpenRows((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });

    // Stages billed in parts show as one parent with its parts nested under it; the
    // parent is open unless folded (`closedGroups`), so its parts are visible by default.
    const groups = useMemo(() => {
        const byStage = new Map<string, ProjectBillingRow[]>();
        for (const row of visibleRows) byStage.set(row.stageId, [...(byStage.get(row.stageId) ?? []), row]);
        return [...byStage.values()];
    }, [visibleRows]);
    const [closedGroups, setClosedGroups] = useState<Set<string>>(new Set());
    const toggleGroup = (stageId: string) =>
        setClosedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(stageId)) next.delete(stageId); else next.add(stageId);
            return next;
        });

    const allOpen = visibleRows.length > 0 && visibleRows.every((r) => openRows.has(r.rowId));

    const toggleAll = React.useCallback(() => {
        setOpenRows(allOpen ? new Set() : new Set(visibleRows.map((r) => r.rowId)));
    }, [allOpen, visibleRows]);

    useEffect(() => {
        if (!onExpandApi) return;
        onExpandApi(visibleRows.length ? { allOpen, toggle: toggleAll } : null);
    }, [onExpandApi, allOpen, toggleAll, visibleRows.length]);

    useEffect(() => () => onExpandApi?.(null), [onExpandApi]);

    // Measured on the tree itself, not the window: the app sidebar and the page
    // padding decide how much room the figures actually get. It starts narrow (the layout effect below
    // measures before paint) and is capped at the screen: starting from the 11-column table made the host
    // wider than a phone, which then measured as "wide" and kept the table.
    const [host, setHost] = useState<HTMLDivElement | null>(null);
    const [width, setWidth] = useState(0);
    useLayoutEffect(() => {
        if (!host || typeof ResizeObserver === "undefined") return;
        const measure = () => setWidth(Math.min(host.clientWidth, document.documentElement.clientWidth));
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(host);
        return () => observer.disconnect();
    }, [host]);
    const layout: Layout = width >= TABLE_MIN_WIDTH ? "table" : width >= CARDS_MIN_WIDTH ? "cards" : "narrow";

    const viewProps = (row: ProjectBillingRow): StageViewProps => ({
        projectId,
        row,
        open: openRows.has(row.rowId),
        onToggle: () => toggle(row.rowId),
        actionsFor,
        onOpenDocument,
    });

    if (visibleRows.length === 0) {
        return (
            <EmptyState
                title="Nothing matches"
                description={filterTab === "NEEDS_ATTENTION" && !query
                    ? "No stage is waiting on an action right now."
                    : "Clear the search or pick another filter to see more stages."}
            />
        );
    }

    const totals = totalsOf(visibleRows);

    return (
        <div ref={setHost}>
            {layout === "table" ? (
                <Card variant="panel" className="gap-0 py-0">
                    <Table className="table-fixed">
                        <colgroup>
                            {COLUMN_WIDTHS.map((w, i) => <col key={i} style={{ width: w }} />)}
                        </colgroup>
                        <TableHeader>
                            <StageColumns />
                        </TableHeader>
                        <TableBody>
                            {groups.map((group) => group.length === 1
                                ? <StageRow key={group[0].rowId} {...viewProps(group[0])} />
                                : (
                                    <React.Fragment key={group[0].stageId}>
                                        <PartsRow
                                            rows={group}
                                            open={!closedGroups.has(group[0].stageId)}
                                            onToggle={() => toggleGroup(group[0].stageId)}
                                        />
                                        {!closedGroups.has(group[0].stageId) && group.map((row, rIdx) => (
                                            <StageRow
                                                key={row.rowId}
                                                {...viewProps(row)}
                                                nested
                                                isLastChild={rIdx === group.length - 1}
                                            />
                                        ))}
                                    </React.Fragment>
                                ))}
                            <GrandTotalRow totals={totals} />
                        </TableBody>
                    </Table>
                </Card>
            ) : (
                <div className="flex flex-col gap-3">
                    {visibleRows.map((row) => (
                        <StageCard key={row.rowId} {...viewProps(row)} narrow={layout === "narrow"} />
                    ))}
                    <CompactTotal totals={totals} />
                </div>
            )}
        </div>
    );
};

export default ProjectBillingTree;
