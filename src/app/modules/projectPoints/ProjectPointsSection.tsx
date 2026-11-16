import React from "react";
import { ListChecks, Plus } from "lucide-react";
import type { ProjectPointValue } from "@services/projectPoints";
import ProjectPointRow from "./ProjectPointRow";
import { Badge } from "@/ds/ui/badge";
import { Button } from "@/ds/ui/button";
import { EmptyState } from "@/ds/patterns/empty-state";

interface ProjectPointsSectionProps {
    /** Current rows (controlled). */
    value: ProjectPointValue[];
    onChange: (rows: ProjectPointValue[]) => void;
    disabled?: boolean;
    /** Optional heading shown above the rows. */
    title?: string;
}

/**
 * Dynamic, reorderable list of Project Points used inside the Lead/Project form.
 * Replaces the legacy hardcoded "Other Point 1/2/3" fields. Pure controlled component —
 * the parent form owns the array and persists it on save. Editing here never touches masters.
 */
const ProjectPointsSection: React.FC<ProjectPointsSectionProps> = ({
    value, onChange, disabled, title = "Project Points",
}) => {
    const rows = value || [];

    const patchRow = (idx: number, patch: Partial<ProjectPointValue>) =>
        onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

    const removeRow = (idx: number) =>
        onChange(rows.filter((_, i) => i !== idx).map((r, i) => ({ ...r, sortOrder: i })));

    const move = (idx: number, dir: -1 | 1) => {
        const target = idx + dir;
        if (target < 0 || target >= rows.length) return;
        const next = [...rows];
        [next[idx], next[target]] = [next[target], next[idx]];
        onChange(next.map((r, i) => ({ ...r, sortOrder: i })));
    };

    const addCustom = () =>
        onChange([...rows, { pointMasterId: null, heading: "", description: "", sortOrder: rows.length }]);

    const addButton = (
        <Button type="button" variant="outline" size="sm" onClick={addCustom} disabled={disabled}>
            <Plus data-icon="inline-start" />
            Add Point
        </Button>
    );

    return (
        <section data-slot="project-points" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="m-0 flex items-center gap-2 text-sm font-semibold text-foreground">
                    {title}
                    {rows.length > 0 && <Badge variant="neutral">{rows.length}</Badge>}
                </h3>
                {rows.length > 0 && addButton}
            </div>

            {rows.length === 0 ? (
                <EmptyState
                    size="sm"
                    icon={<ListChecks />}
                    title="No project points yet"
                    description="Add the key points of this project, in the order they should read."
                    action={addButton}
                />
            ) : (
                <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
                    {rows.map((row, idx) => (
                        <ProjectPointRow
                            key={row.id || row.pointMasterId || `row-${idx}`}
                            row={row}
                            index={idx}
                            total={rows.length}
                            disabled={disabled}
                            onChange={(patch) => patchRow(idx, patch)}
                            onRemove={() => removeRow(idx)}
                            onMoveUp={() => move(idx, -1)}
                            onMoveDown={() => move(idx, 1)}
                        />
                    ))}
                </ol>
            )}
        </section>
    );
};

export default ProjectPointsSection;
