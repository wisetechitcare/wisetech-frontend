import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { deliverableBoardQuery } from '@services/projectExecution';
import type { PresetTaskLike } from '@utils/presetTaskHierarchy';
import { usePresetTasks } from './useTaskQueries';

/** Same guard the tree helpers use against a corrupt parent cycle. */
const MAX_DEPTH = 100;

/**
 * A project's deliverables as the task screens need them — read from the same board the
 * project's Deliverables tab shows, so a task and that tab always agree:
 *
 *  - `deliverableTaskIds`: every Project Task that is a deliverable on this project;
 *  - `stageOf(presetTaskId)`: the stage a task counts toward ("Stage 2 · Design Concept") —
 *    its own deliverable's, or the nearest deliverable above it in the task tree — or null.
 */
export const useProjectDeliverables = (projectId: string | null | undefined) => {
    const boardQuery = useQuery(deliverableBoardQuery(projectId || ''));
    const presetsQuery = usePresetTasks('PROJECT');

    const stageOfDeliverable = useMemo(() => {
        const map = new Map<string, string>();
        const board = boardQuery.data;
        board?.stages.forEach((st, i) => st.deliverables.forEach((d) => {
            if (d.presetTaskId && !map.has(d.presetTaskId)) {
                map.set(d.presetTaskId, `Stage ${board.stageLabels?.[i] ?? i + 1} · ${st.name}`);
            }
        }));
        return map;
    }, [boardQuery.data]);

    const parentOf = useMemo(
        () => new Map(((presetsQuery.data?.presetTaskStatuses ?? []) as PresetTaskLike[]).map((p) => [p.id, p.parentId ?? null])),
        [presetsQuery.data],
    );

    const stageOf = (presetTaskId: string | null | undefined): string | null => {
        let node = presetTaskId || null;
        for (let steps = 0; node && steps < MAX_DEPTH; steps++) {
            const stage = stageOfDeliverable.get(node);
            if (stage) return stage;
            node = parentOf.get(node) ?? null;
        }
        return null;
    };

    const deliverableTaskIds = useMemo(() => [...stageOfDeliverable.keys()], [stageOfDeliverable]);
    return { deliverableTaskIds, stageOf, isFetching: boardQuery.isFetching };
};
