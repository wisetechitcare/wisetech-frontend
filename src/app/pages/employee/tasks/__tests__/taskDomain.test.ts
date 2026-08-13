/**
 * Phase 4 — Task UI behaviour tests.
 *
 * The repository has no frontend test runner, so rather than adding one for a handful of
 * assertions these run on Node's built-in runner — the same convention the backend already
 * uses. That is only possible because the DECISIONS live in `taskDomain.ts` as pure functions
 * rather than inside JSX: what is tested here is exactly what the components call.
 *
 *   npm run test:tasks
 *
 * What is deliberately NOT here: snapshots of rendered markup. §32 asks for behaviour, and a
 * snapshot of a Kanban card would fail on every spacing change while catching no real defect.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    isTaskFinal, isTaskOverdue, daysUntilDue, dueLabel,
    clampProgress, subtaskProgress,
    loggedSeconds, formatDuration,
    fieldsForScope, validateScopeShape, buildTaskPayload,
    filtersToQuery, activeFilterCount,
    apiErrorMessage, employeeName, initialsOf, shortTaskId,
    TaskScope,
    mainPresets, subPresets, presetTaskName, presetPairForName,
} from '../taskDomain';

const NOW = new Date('2026-08-12T10:00:00.000Z');
const status = (over: Partial<{ id: string; name: string; isFinal: boolean }> = {}) => ({
    id: 's1', name: 'Task In Progress', isFinal: false, ...over,
});

// ═════════════════════════════════════════════════════════════════════════════
describe('final stage — never string matching (RSK-072)', () => {
    it('reads isFinal, not the stage name', () => {
        assert.equal(isTaskFinal({ status: status({ isFinal: true }) }), true);
        assert.equal(isTaskFinal({ status: status({ isFinal: false }) }), false);
    });

    it('a stage NAMED "Completed" but not flagged final is NOT final', () => {
        // The exact defect the old UI shipped: it compared the name to "completed", so
        // renaming a stage in Configure silently broke completion.
        assert.equal(isTaskFinal({ status: status({ name: 'Completed', isFinal: false }) }), false);
    });

    it('a task with no stage is not final — it has not started moving', () => {
        assert.equal(isTaskFinal({ status: null }), false);
        assert.equal(isTaskFinal({}), false);
    });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('overdue', () => {
    it('is true for a past due date on an open task', () => {
        assert.equal(isTaskOverdue({ dueDate: '2026-08-10', status: status() }, NOW), true);
    });

    it('is false for a future due date', () => {
        assert.equal(isTaskOverdue({ dueDate: '2026-08-20', status: status() }, NOW), false);
    });

    it('is false with no due date at all', () => {
        assert.equal(isTaskOverdue({ status: status() }, NOW), false);
        assert.equal(isTaskOverdue({ dueDate: null, status: status() }, NOW), false);
    });

    it('🔴 a task in a TERMINAL stage is never overdue — work that stopped cannot be late', () => {
        assert.equal(isTaskOverdue({ dueDate: '2026-01-01', status: status({ isFinal: true }) }, NOW), false);
    });

    it('ignores an unparseable date rather than throwing', () => {
        assert.equal(isTaskOverdue({ dueDate: 'not-a-date', status: status() }, NOW), false);
    });
});

describe('due labels', () => {
    it('counts days in both directions', () => {
        assert.equal(daysUntilDue('2026-08-12', NOW), 0);
        assert.equal(daysUntilDue('2026-08-13', NOW), 1);
        assert.equal(daysUntilDue('2026-08-09', NOW), -3);
        assert.equal(daysUntilDue(null, NOW), null);
    });

    it('reads naturally at the boundaries', () => {
        assert.equal(dueLabel('2026-08-12', NOW), 'Due today');
        assert.equal(dueLabel('2026-08-13', NOW), 'Due tomorrow');
        assert.equal(dueLabel('2026-08-11', NOW), '1 day overdue');
        assert.equal(dueLabel('2026-08-07', NOW), '5 days overdue');
        assert.equal(dueLabel('2026-08-19', NOW), 'Due in 7 days');
    });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('progress', () => {
    it('clamps to the 0–100 the server enforces', () => {
        assert.equal(clampProgress(150), 100);
        assert.equal(clampProgress(-20), 0);
        assert.equal(clampProgress(65), 65);
    });

    it('rounds fractions and survives junk', () => {
        assert.equal(clampProgress(33.6), 34);
        assert.equal(clampProgress(null), 0);
        assert.equal(clampProgress(undefined), 0);
        assert.equal(clampProgress(NaN), 0);
    });

    it('counts subtask completion from the children only — no rollup onto the parent', () => {
        const subs = [
            { status: status({ isFinal: true }) },
            { status: status({ isFinal: true }) },
            { status: status({ isFinal: false }) },
        ];
        assert.deepEqual(subtaskProgress(subs), { done: 2, total: 3 });
        assert.deepEqual(subtaskProgress([]), { done: 0, total: 0 });
    });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('logged time', () => {
    it('sums hours, minutes and seconds across entries', () => {
        assert.equal(loggedSeconds([
            { logTimeHours: 1, logTimeMinutes: 30, logTimeSeconds: 0 },
            { logTimeHours: 0, logTimeMinutes: 45, logTimeSeconds: 30 },
        ]), 3600 + 1800 + 2700 + 30);
    });

    it('treats missing entries as no time', () => {
        assert.equal(loggedSeconds(undefined), 0);
        assert.equal(loggedSeconds([]), 0);
    });

    it('renders nothing as an em dash, not "0h"', () => {
        assert.equal(formatDuration(0), '—');
        assert.equal(formatDuration(3600), '1h');
        assert.equal(formatDuration(5400), '1h 30m');
        assert.equal(formatDuration(120), '2m');
        assert.equal(formatDuration(45), '45s');
    });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('scope → which fields a form shows (§7)', () => {
    it('PROJECT shows project and deliverable, and sources assignees from the project team', () => {
        assert.deepEqual(fieldsForScope('PROJECT'), {
            project: true, deliverable: true, assigneeSource: 'project-team',
        });
    });

    it('🔴 GENERAL hides project AND deliverable — it can never reach the billing chain', () => {
        assert.deepEqual(fieldsForScope('GENERAL'), {
            project: false, deliverable: false, assigneeSource: 'general',
        });
    });

    it('GENERAL sources assignees from management scope, never a project team', () => {
        assert.equal(fieldsForScope('GENERAL').assigneeSource, 'general');
        assert.notEqual(fieldsForScope('GENERAL').assigneeSource, fieldsForScope('PROJECT').assigneeSource);
    });
});

describe('scope shape validation (mirrors checkTaskScopeConsistency)', () => {
    it('PROJECT requires a project', () => {
        assert.match(validateScopeShape('PROJECT', {})!, /Project is required/);
        assert.equal(validateScopeShape('PROJECT', { projectId: 'p1' }), null);
    });

    it('GENERAL rejects a project and a deliverable', () => {
        assert.match(validateScopeShape('GENERAL', { projectId: 'p1' })!, /cannot belong to a project/);
        assert.match(validateScopeShape('GENERAL', { deliverableId: 'd1' })!, /cannot be linked to a deliverable/);
        assert.equal(validateScopeShape('GENERAL', {}), null);
    });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('payload building (§7, §8)', () => {
    const base = { taskScope: 'PROJECT' as TaskScope, taskTypeMode: 'PRESETS' as const, taskName: 'Drawing-DD' };

    it('🔴 never sends createdById or lastEditedById', () => {
        // `createdById` is a PROTECTED field server-side — sending it made every UPDATE 400.
        const payload = buildTaskPayload({ ...base, projectId: 'p1' });
        assert.equal('createdById' in payload, false);
        assert.equal('lastEditedById' in payload, false);
    });

    it('a GENERAL task omits projectId entirely, not as an empty string', () => {
        // '' would read as a supplied-but-unresolvable project reference and be rejected.
        const payload = buildTaskPayload({ ...base, taskScope: 'GENERAL', projectId: '' });
        assert.equal('projectId' in payload, false);
        assert.equal(payload.taskScope, 'GENERAL');
    });

    it('a PROJECT task carries its projectId', () => {
        assert.equal(buildTaskPayload({ ...base, projectId: 'p1' }).projectId, 'p1');
    });

    it('🔴 taskType reflects the mode the user is actually in (the preset/custom bug)', () => {
        assert.equal(buildTaskPayload({ ...base, taskTypeMode: 'CUSTOM', projectId: 'p1' }).taskType, 'CUSTOM');
        assert.equal(buildTaskPayload({ ...base, taskTypeMode: 'PRESETS', projectId: 'p1' }).taskType, 'PRESETS');
    });

    it('taskType and taskScope stay separate concepts', () => {
        const payload = buildTaskPayload({ ...base, taskScope: 'GENERAL', taskTypeMode: 'CUSTOM' });
        assert.equal(payload.taskScope, 'GENERAL');
        assert.equal(payload.taskType, 'CUSTOM');
    });

    it('trims the name and clamps progress', () => {
        const payload = buildTaskPayload({ ...base, taskName: '  Spaced  ', projectId: 'p1', progress: 150 });
        assert.equal(payload.taskName, 'Spaced');
        assert.equal(payload.progress, 100);
    });

    it('omits progress when it was never set, rather than sending 0', () => {
        assert.equal('progress' in buildTaskPayload({ ...base, projectId: 'p1' }), false);
    });

    it('carries parentTaskId only when creating a subtask', () => {
        assert.equal('parentTaskId' in buildTaskPayload({ ...base, projectId: 'p1' }), false);
        assert.equal(buildTaskPayload({ ...base, projectId: 'p1', parentTaskId: 't9' }).parentTaskId, 't9');
    });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('filters → query (§14, §16, §17)', () => {
    it('drops empty values instead of sending them as blanks', () => {
        assert.deepEqual(filtersToQuery({ search: '', statusId: '', taskScope: '' }), {});
    });

    it('drops false booleans so "off" is absent, not "false"', () => {
        assert.deepEqual(filtersToQuery({ mine: false, overdue: false }), {});
    });

    it('sends the flags that are on', () => {
        assert.deepEqual(filtersToQuery({ mine: true, overdue: true }), { mine: 'true', overdue: 'true' });
    });

    it('trims the search term', () => {
        assert.deepEqual(filtersToQuery({ search: '  drawing  ' }), { search: 'drawing' });
    });

    it('passes every supported filter through', () => {
        assert.deepEqual(
            filtersToQuery({
                taskScope: 'PROJECT', statusId: 's1', priorityId: 'p1', assignedToId: 'e1',
                projectId: 'l1', billingType: 'BILLABLE', sortBy: 'dueDate', sortDir: 'asc',
            }),
            {
                taskScope: 'PROJECT', statusId: 's1', priorityId: 'p1', assignedToId: 'e1',
                projectId: 'l1', billingType: 'BILLABLE', sortBy: 'dueDate', sortDir: 'asc',
            },
        );
    });

    it('counts only narrowing filters — sort and search are not filters', () => {
        assert.equal(activeFilterCount({ sortBy: 'dueDate', sortDir: 'asc', search: 'x' }), 0);
        assert.equal(activeFilterCount({ mine: true, taskScope: 'PROJECT' }), 2);
        assert.equal(activeFilterCount({}), 0);
    });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('API error handling (§23)', () => {
    it("surfaces the server's own reason, which names what to change", () => {
        const err = { response: { status: 403, data: { detail: "Assignee must belong to this project's internal team" } } };
        assert.match(apiErrorMessage(err), /internal team/);
    });

    it('falls back sensibly on a bare 403 or 404', () => {
        assert.match(apiErrorMessage({ response: { status: 403, data: {} } }), /not permitted/i);
        assert.match(apiErrorMessage({ response: { status: 404, data: {} } }), /not found/i);
    });

    it('ignores the generic "Bad request" title in favour of the fallback', () => {
        const msg = apiErrorMessage({ response: { status: 400, data: { message: 'Bad request' } } }, 'Could not save');
        assert.equal(msg, 'Could not save');
    });

    it('never throws on an unrecognised error shape', () => {
        assert.equal(typeof apiErrorMessage(null), 'string');
        assert.equal(typeof apiErrorMessage(undefined), 'string');
        assert.equal(typeof apiErrorMessage('boom'), 'string');
    });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('display helpers', () => {
    it('names an employee, and says Unassigned rather than showing a blank', () => {
        assert.equal(employeeName({ users: { firstName: 'Irfan', lastName: 'Shaikh' } }), 'Irfan Shaikh');
        assert.equal(employeeName(null), 'Unassigned');
        assert.equal(employeeName({ users: null }), 'Unassigned');
    });

    it('builds initials from at most two words', () => {
        assert.equal(initialsOf('Irfan Shaikh'), 'IS');
        assert.equal(initialsOf('Mohammed Saad Hodekar'), 'MS');
        assert.equal(initialsOf('Unassigned'), 'U');
        assert.equal(initialsOf(''), '?');
    });

    it('shortens a UUID to something a card can show', () => {
        assert.equal(shortTaskId('4e13816b-5314-4204-a197-ef1105eacc01'), '#4e13816b');
    });
});

// ═════════════════════════════════════════════════════════════════════════════
// Preset task tree — merged in from main (preset tasks are a two-level Task → Sub-task tree)
// ═════════════════════════════════════════════════════════════════════════════
describe('preset task tree', () => {
    const presets = [
        { id: 'm1', name: 'Drawing', parentId: null },
        { id: 'm2', name: 'Survey', parentId: null },
        { id: 's1', name: 'Drawing-DD', parentId: 'm1' },
        { id: 's2', name: 'Drawing-GFC', parentId: 'm1' },
    ];

    it('main tasks are the roots', () => {
        assert.deepEqual(mainPresets(presets).map((p) => p.id), ['m1', 'm2']);
    });

    it('sub-tasks are filed under their main task only', () => {
        assert.deepEqual(subPresets(presets, 'm1').map((p) => p.id), ['s1', 's2']);
        assert.deepEqual(subPresets(presets, 'm2'), []);
        assert.deepEqual(subPresets(presets, undefined), []);
    });

    it('the LAST choice names the task — sub-task wins over main', () => {
        assert.equal(presetTaskName(presets, 'm1', 's2'), 'Drawing-GFC');
        assert.equal(presetTaskName(presets, 'm1', ''), 'Drawing');
        assert.equal(presetTaskName(presets, undefined, undefined), '');
    });

    it('an edited task maps its stored NAME back onto the pair it came from', () => {
        // Tasks are stored by name, not preset id, so reopening one has to resolve backwards
        // or both pickers show empty.
        assert.deepEqual(presetPairForName(presets, 'Drawing-DD'), { mainTaskId: 'm1', subTaskId: 's1' });
        assert.deepEqual(presetPairForName(presets, 'Survey'), { mainTaskId: 'm2', subTaskId: '' });
    });

    it('a name that matches no preset resolves to nothing rather than guessing', () => {
        assert.deepEqual(presetPairForName(presets, 'Typed by hand'), { mainTaskId: '', subTaskId: '' });
        assert.deepEqual(presetPairForName(presets, undefined), { mainTaskId: '', subTaskId: '' });
    });
});
