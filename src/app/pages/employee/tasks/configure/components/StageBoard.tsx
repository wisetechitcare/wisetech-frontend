import React from 'react';
import { ActionIconButton, AppIcon, ViewMode } from '@app/modules/common/components/ui';
import { C, FONT, SP, RADIUS, BTN } from '@app/modules/configuration';
import { getPresetPath, PATH_SEPARATOR, PresetTaskLike } from '@utils/presetTaskHierarchy';
import { groupStagesByScope } from '@utils/categoryScope';

/**
 * StageBoard
 * ------------------------------------------------------------------
 * The Stages section's body — every stage WITH its tasks, in one of two views:
 *
 *   grid  a tile per stage, its tasks listed inside it
 *   list  one flat column: a stage line, its tasks indented beneath it
 *
 * Two views rather than one because the two questions differ. Cards answer "what is in this
 * stage" — a few stages side by side, each self-contained. The list answers "what does the
 * whole configuration look like" — thirty stages as tiles is a wall you scan sideways, where
 * the list stays one readable column.
 *
 * Both views render from the SAME data and fire the SAME callbacks; the view is a layout
 * choice and nothing else. Each task is shown as its full chain, the way the stage editor
 * writes it — see `taskLabel`.
 */

export interface StageTaskRow {
  presetTaskId: string;
  sortOrder?: number;
  presetTask?: { id: string; name: string; parentId?: string | null };
}

export interface StageRow {
  id: string;
  name: string;
  color?: string | null;
  tasks?: StageTaskRow[];
  categoryId?: string | null;
  subCategoryId?: string | null;
  category?: { id: string; name: string } | null;
  subCategory?: { id: string; name: string } | null;
}

/** The kit's own view-mode union — re-exported so callers need one import, not two. */
export type StageView = ViewMode;

interface Props {
  stages: StageRow[];
  view: StageView;
  /**
   * The whole preset tree, for resolving a task's ancestry. A stage stores only the node's id
   * and the API returns only the node itself, so the chain has to be walked here — the same
   * walk the stage editor does, via the same helper, so the two never disagree about a name.
   */
  presetTasks: PresetTaskLike[];
  /** Opens the stage's task picker. */
  onAddTask: (stage: StageRow) => void;
  onEditStage: (stage: StageRow) => void;
  onDeleteStage: (stage: StageRow) => void;
}

/**
 * A task's full chain — `Bill → hmmm → Nah`, exactly as the stage editor writes it.
 *
 * The leaf name alone is ambiguous: two branches can both end in "Drawing", and a stage listing
 * one of them gives no way to tell which. Falls back to the node's own name, then its id, so a
 * row can never render blank if the tree has not loaded yet.
 */
const taskLabel = (task: StageTaskRow, presetTasks: PresetTaskLike[]): string => {
  const path = getPresetPath(presetTasks, task.presetTaskId);
  return path.length ? path.join(PATH_SEPARATOR) : (task.presetTask?.name || task.presetTaskId);
};

/** Tasks in the order the stage stores them — the sequence the phase is meant to run in. */
const orderedTasks = (stage: StageRow): StageTaskRow[] =>
  [...(stage.tasks || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

const AddTaskButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...BTN.outline,
        padding: '4px 10px',
        fontSize: '12px',
        fontWeight: 500,
        borderRadius: RADIUS.md,
        gap: '4px',
        whiteSpace: 'nowrap',
        ...(hover ? { backgroundColor: C.primaryLight } : {}),
      }}
    >
      <AppIcon name="bi-plus-lg" />
      Add Task
    </button>
  );
};

/** A stage's controls — one definition, used by both views, so they cannot drift apart. */
const StageActions: React.FC<{
  stage: StageRow;
  onAddTask: Props['onAddTask'];
  onEditStage: Props['onEditStage'];
  onDeleteStage: Props['onDeleteStage'];
}> = ({ stage, onAddTask, onEditStage, onDeleteStage }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: SP.xs, flexShrink: 0 }}>
    <AddTaskButton onClick={() => onAddTask(stage)} />
    <ActionIconButton iconName="pencil" title="Edit stage" size="sm" onClick={() => onEditStage(stage)} />
    <ActionIconButton
      iconName="trash"
      title="Delete stage"
      tone="danger"
      size="sm"
      onClick={() => onDeleteStage(stage)}
    />
  </div>
);

const StageName: React.FC<{ stage: StageRow; size: number }> = ({ stage, size }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: SP.sm, minWidth: 0 }}>
    {stage.color && (
      <span
        style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: stage.color,
          flexShrink: 0,
        }}
      />
    )}
    <span
      style={{
        fontFamily: FONT.body,
        fontSize: `${size}px`,
        fontWeight: 600,
        color: C.textPrimary,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
      title={stage.name}
    >
      {stage.name}
    </span>
  </div>
);

const EmptyTasks: React.FC<{ inset?: boolean }> = ({ inset }) => (
  <div
    style={{
      fontFamily: FONT.body,
      fontSize: '12px',
      color: C.textMuted,
      fontStyle: 'italic',
      padding: inset ? `${SP.xs} 0 ${SP.xs} ${SP.lg}` : `${SP.sm} 0`,
    }}
  >
    No tasks in this stage yet
  </div>
);

type RowProps = Pick<Props, 'presetTasks' | 'onAddTask' | 'onEditStage' | 'onDeleteStage'> & {
  stage: StageRow;
};

/** One stage as a tile. */
const StageCard: React.FC<RowProps> = ({ stage, presetTasks, ...actions }) => {
  const tasks = orderedTasks(stage);
  return (
    <div
      style={{
        backgroundColor: C.bgCard,
        border: `1px solid ${C.border}`,
        borderRadius: RADIUS.lg,
        padding: SP.md,
        display: 'flex',
        flexDirection: 'column',
        gap: SP.sm,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: SP.sm }}>
        <StageName stage={stage} size={14} />
        <StageActions stage={stage} {...actions} />
      </div>

      {tasks.length === 0 ? (
        <EmptyTasks />
      ) : (
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {tasks.map((task) => (
            <li
              key={task.presetTaskId}
              style={{
                fontFamily: FONT.body,
                fontSize: '13px',
                color: C.textSecondary,
                padding: `${SP.xs} ${SP.sm}`,
                borderRadius: RADIUS.md,
                backgroundColor: C.bgSection,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={taskLabel(task, presetTasks)}
            >
              {taskLabel(task, presetTasks)}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

/** One stage as a line, its tasks indented beneath it. */
const StageListRow: React.FC<RowProps> = ({ stage, presetTasks, ...actions }) => {
  const tasks = orderedTasks(stage);
  return (
    <div style={{ borderBottom: `1px solid ${C.border}`, padding: `${SP.sm} 0` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: SP.sm }}>
        <StageName stage={stage} size={13} />
        <StageActions stage={stage} {...actions} />
      </div>

      {tasks.length === 0 ? (
        <EmptyTasks inset />
      ) : (
        <ol style={{ listStyle: 'none', margin: `${SP.xs} 0 0 0`, padding: 0 }}>
          {tasks.map((task) => (
            <li
              key={task.presetTaskId}
              style={{
                fontFamily: FONT.body,
                fontSize: '13px',
                color: C.textSecondary,
                // Indented under its stage — the nesting being readable in one column is the
                // whole point of this view.
                padding: `3px 0 3px ${SP.lg}`,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={taskLabel(task, presetTasks)}
            >
              {taskLabel(task, presetTasks)}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

/** The project type a run of stages belongs to. */
const ScopeHeading: React.FC<{ label: string; count: number }> = ({ label, count }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: SP.sm,
      paddingBottom: SP.xs,
      borderBottom: `2px solid ${C.border}`,
    }}
  >
    <AppIcon name="bi-folder2-open" style={{ color: C.textMuted, fontSize: '13px' }} />
    <span style={{ fontFamily: FONT.body, fontSize: '13px', fontWeight: 700, color: C.textPrimary }}>
      {label}
    </span>
    <span style={{ fontFamily: FONT.body, fontSize: '11px', color: C.textMuted }}>
      {count} stage{count === 1 ? '' : 's'}
    </span>
  </div>
);

const StageBoard: React.FC<Props> = ({ stages, view, presetTasks, onAddTask, onEditStage, onDeleteStage }) => {
  if (stages.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: SP.lg, color: C.textMuted, fontFamily: FONT.body }}>
        <AppIcon name="bi-inbox" className="fs-1" style={{ display: 'block', marginBottom: SP.sm, opacity: 0.4 }} />
        No stages configured yet
      </div>
    );
  }

  const actions = { presetTasks, onAddTask, onEditStage, onDeleteStage };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SP.lg }}>
      {groupStagesByScope(stages).map((group) => (
        <div key={group.key} style={{ display: 'flex', flexDirection: 'column', gap: SP.sm }}>
          <ScopeHeading label={group.label} count={group.stages.length} />

          {view === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: SP.md }}>
              {group.stages.map((stage) => (
                <StageCard key={stage.id} stage={stage} {...actions} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {group.stages.map((stage) => (
                <StageListRow key={stage.id} stage={stage} {...actions} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default StageBoard;
