import React from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import type { ProjectPointValue } from "@services/projectPoints";
import { Badge } from "@/ds/ui/badge";
import { Button } from "@/ds/ui/button";
import { Input } from "@/ds/ui/input";
import { Textarea } from "@/ds/ui/textarea";

interface ProjectPointRowProps {
    row: ProjectPointValue;
    index: number;
    total: number;
    onChange: (patch: Partial<ProjectPointValue>) => void;
    onRemove: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    disabled?: boolean;
}

/**
 * One Project Point: order badge, heading + description, and move / remove actions. Custom
 * (non-master) points carry a badge so they read differently from template points.
 */
const ProjectPointRow: React.FC<ProjectPointRowProps> = ({
    row, index, total, onChange, onRemove, onMoveUp, onMoveDown, disabled,
}) => {
    const isCustom = !row.pointMasterId;
    const n = index + 1;
    return (
        <li data-slot="project-point" className="flex items-start gap-3 rounded-2xl bg-card p-3 ring-1 ring-border">
            <span aria-hidden className="mt-1.5 grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground tabular-nums">
                {n}
            </span>

            <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                <div className="flex min-w-0 flex-col gap-1.5">
                    <Input
                        aria-label={`Point ${n} heading`}
                        placeholder="Heading"
                        value={row.heading ?? ""}
                        disabled={disabled}
                        onChange={(e) => onChange({ heading: e.target.value })}
                        className="rounded-xl"
                    />
                    {isCustom && <Badge variant="brand" className="w-fit">Custom point</Badge>}
                </div>
                <Textarea
                    aria-label={`Point ${n} description`}
                    placeholder="Description"
                    value={row.description ?? ""}
                    disabled={disabled}
                    onChange={(e) => onChange({ description: e.target.value })}
                    className="min-h-10 py-2"
                />
            </div>

            <div className="flex shrink-0 items-center gap-0.5 pt-1">
                <Button type="button" variant="ghost" size="icon-sm" title="Move up" aria-label={`Move point ${n} up`}
                    disabled={disabled || index === 0} onClick={onMoveUp}>
                    <ArrowUp />
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" title="Move down" aria-label={`Move point ${n} down`}
                    disabled={disabled || index === total - 1} onClick={onMoveDown}>
                    <ArrowDown />
                </Button>
                <Button type="button" variant="tinted" size="icon-sm" title="Remove" aria-label={`Remove point ${n}`}
                    style={{ "--tint": "var(--cta-danger)" } as React.CSSProperties}
                    disabled={disabled} onClick={onRemove}>
                    <Trash2 />
                </Button>
            </div>
        </li>
    );
};

export default ProjectPointRow;
