import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { CircleQuestionMark, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/ds/ui/badge';
import { Button } from '@/ds/ui/button';
import { Field, FieldLabel, FieldError } from '@/ds/ui/field';
import { Input } from '@/ds/ui/input';
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@/ds/ui/item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ds/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ds/ui/tooltip';
import { SettingsSection } from '@/ds/patterns/settings-section';
import { deleteConfirmation, errorConfirmation, successConfirmation } from '@utils/modal';
import { canDelete, canSection } from '@utils/can';
import {
  fetchQueryTopics,
  createQueryTopic,
  updateQueryTopic,
  deleteQueryTopic,
  OTHER_TOPIC,
  type QueryTopic,
  type TopicScope,
} from '@services/reimbursementQueries';

/**
 * The "What is this about?" master.
 *
 * These are the topics an approver picks from when they ask an employee a question. It used to be
 * a hardcoded enum, so a company could not add the topic it actually asks about.
 *
 * "Something else" is deliberately absent: the picker always appends it, and it is the only topic
 * that makes the question text mandatory. Making it a row here would let an admin delete the
 * fallback out from under every question.
 */

const SCOPES: Array<{ value: TopicScope; label: string; hint: string }> = [
  { value: 'BOTH', label: 'Both', hint: 'offered on either question' },
  { value: 'REQUEST', label: 'One Expense', hint: 'a question about a single line' },
  { value: 'BATCH', label: 'Whole Submission', hint: 'a question about the batch' },
];

const scopeLabel = (scope: TopicScope) => SCOPES.find((s) => s.value === scope)?.label ?? 'Both';

/** A row icon action with its tooltip (Button story "Tinted"). */
function RowAction({ label, danger, onClick, children }: { label: string; danger?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="tinted"
            size="icon-sm"
            aria-label={label}
            onClick={onClick}
            style={danger ? ({ '--tint': 'var(--cta-danger)' } as CSSProperties) : undefined}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function QueryTopics() {
  const canWrite = canSection('finance.reimbursements', 'write');
  const mayDelete = canDelete('finance.reimbursements');

  const [topics, setTopics] = useState<QueryTopic[]>([]);
  const [label, setLabel] = useState('');
  const [scope, setScope] = useState<TopicScope>('BOTH');
  const [editing, setEditing] = useState<QueryTopic | null>(null);
  const [saving, setSaving] = useState(false);
  // An empty submit explains itself instead of a greyed-out button that gives no reason.
  const [labelError, setLabelError] = useState('');

  const load = useCallback(() => {
    fetchQueryTopics().then(setTopics).catch(() => setTopics([]));
  }, []);

  useEffect(() => { load(); }, [load]);

  const reset = () => { setEditing(null); setLabel(''); setScope('BOTH'); setLabelError(''); };

  const handleSave = async () => {
    const trimmed = label.trim();
    if (!trimmed) {
      setLabelError('Enter a topic name.');
      document.getElementById('topic-name')?.focus();
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateQueryTopic(editing.id, trimmed, scope);
        successConfirmation('Topic updated');
      } else {
        await createQueryTopic(trimmed, scope);
        successConfirmation('Topic added');
      }
      reset();
      load();
    } catch (err: any) {
      errorConfirmation(err?.response?.data?.message || 'Could not save this topic');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (topic: QueryTopic) => {
    setEditing(topic);
    setLabel(topic.label);
    setScope(topic.scope);
  };

  const handleDelete = async (topic: QueryTopic) => {
    const confirmed = await deleteConfirmation(`"${topic.label}" removed`, 'Delete', 'Deleted', false);
    if (!confirmed) return;
    try {
      await deleteQueryTopic(topic.id);
      if (editing?.id === topic.id) reset();
      load();
      await successConfirmation('Topic deleted');
    } catch (err: any) {
      errorConfirmation(err?.response?.data?.message || 'Could not delete this topic');
    }
  };

  return (
    <SettingsSection
      title="Question Topics"
      description='The "What is this about?" list an approver picks from when asking an employee a question.'
      icon={<CircleQuestionMark />}
      count={topics.length}
      divided={false}
    >
      <div className="space-y-4">
        {canWrite && (
          // One row on wide screens, stacked on phones. Enter in the name saves, as before.
          <form
            className="flex flex-col gap-4 sm:flex-row sm:items-start"
            onSubmit={(e) => { e.preventDefault(); handleSave(); }}
          >
            <Field className="min-w-0 flex-1">
              <FieldLabel htmlFor="topic-name">{editing ? 'Rename Topic' : 'Topic Name'}</FieldLabel>
              <Input
                id="topic-name"
                placeholder="e.g. Missing approval mail"
                value={label}
                onChange={(e) => { setLabel(e.target.value); if (labelError) setLabelError(''); }}
                disabled={saving}
                aria-invalid={labelError ? true : undefined}
                aria-describedby={labelError ? 'topic-name-error' : undefined}
              />
              {labelError && <FieldError id="topic-name-error">{labelError}</FieldError>}
            </Field>
            <Field className="sm:w-56">
              <FieldLabel htmlFor="topic-scope">Applies To</FieldLabel>
              <Select
                items={SCOPES.map((s) => ({ value: s.value, label: s.label }))}
                value={scope}
                onValueChange={(v) => setScope(v as TopicScope)}
                disabled={saving}
              >
                <SelectTrigger id="topic-scope" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCOPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <div className="flex shrink-0 items-center gap-2">
              {/* Always enabled: a disabled button can't say what is missing; an empty submit does. */}
              <Button type="submit" loading={saving}>
                {editing ? 'Save' : 'Add Topic'}
              </Button>
              {editing && <Button type="button" variant="outline" onClick={reset} disabled={saving}>Cancel</Button>}
            </div>
          </form>
        )}

        <ItemGroup aria-label="Question topics">
          {topics.map((topic) => (
            <Item
              key={topic.id}
              role="listitem"
              size="sm"
              variant="outline"
              // The row being edited reads as selected.
              className={editing?.id === topic.id ? 'border-primary bg-accent/40' : undefined}
            >
              <ItemContent className="min-w-0">
                <ItemTitle className="truncate">{topic.label}</ItemTitle>
              </ItemContent>
              <Badge variant="neutral">{scopeLabel(topic.scope)}</Badge>
              {canWrite && (
                <ItemActions>
                  <RowAction label={`Edit ${topic.label}`} onClick={() => handleEdit(topic)}>
                    <Pencil aria-hidden />
                  </RowAction>
                  {mayDelete && (
                    <RowAction label={`Delete ${topic.label}`} danger onClick={() => handleDelete(topic)}>
                      <Trash2 aria-hidden />
                    </RowAction>
                  )}
                </ItemActions>
              )}
            </Item>
          ))}

          {/* Always last in the picker, and not a row anyone can edit — shown so the list here
              matches what an approver actually sees. */}
          <Item role="listitem" size="sm" variant="outline" className="border-dashed">
            <ItemContent className="min-w-0">
              <ItemTitle className="text-muted-foreground">{OTHER_TOPIC}</ItemTitle>
            </ItemContent>
            <ItemDescription className="text-xs">Always offered · the approver must type the question</ItemDescription>
          </Item>
        </ItemGroup>

        {topics.length === 0 && (
          <p className="m-0 text-center text-sm text-muted-foreground">
            No topics yet — every question will be filed under “{OTHER_TOPIC}”.
          </p>
        )}
      </div>
    </SettingsSection>
  );
}

export default QueryTopics;
