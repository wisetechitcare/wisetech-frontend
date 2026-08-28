import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Box, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material';
import type { RootState } from '@redux/store';
import { ConfigSectionCard } from '@app/modules/configuration';
import { ToneChip, WtButton } from '@app/modules/common/components/ui';
import { deleteConfirmation, errorConfirmation, successConfirmation } from '@utils/modal';
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
  { value: 'REQUEST', label: 'One expense', hint: 'a question about a single line' },
  { value: 'BATCH', label: 'Whole submission', hint: 'a question about the batch' },
];

const scopeLabel = (scope: TopicScope) => SCOPES.find((s) => s.value === scope)?.label ?? 'Both';

function QueryTopics() {
  const isAdmin = useSelector((state: RootState) => state.auth.currentUser.isAdmin);

  const [topics, setTopics] = useState<QueryTopic[]>([]);
  const [label, setLabel] = useState('');
  const [scope, setScope] = useState<TopicScope>('BOTH');
  const [editing, setEditing] = useState<QueryTopic | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetchQueryTopics().then(setTopics).catch(() => setTopics([]));
  }, []);

  useEffect(() => { load(); }, [load]);

  const reset = () => { setEditing(null); setLabel(''); setScope('BOTH'); };

  const handleSave = async () => {
    const trimmed = label.trim();
    if (!trimmed) return;
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
    <ConfigSectionCard
      title="Question Topics"
      description='The "What is this about?" list an approver picks from when asking an employee a question.'
      icon="bi-question-circle"
      iconColor="primary"
    >
      {isAdmin && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          gap={1}
          alignItems={{ xs: 'stretch', sm: 'flex-start' }}
          sx={{ mb: 2 }}
        >
          <TextField
            size="small"
            fullWidth
            label="Topic name"
            placeholder="e.g. Missing approval mail"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            disabled={saving}
            sx={{ flex: 1, minWidth: 0 }}
          />
          <TextField
            select size="small" label="Applies to"
            value={scope}
            onChange={(e) => setScope(e.target.value as TopicScope)}
            disabled={saving}
            sx={{ minWidth: { sm: 190 } }}
          >
            {SCOPES.map((s) => (
              <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
            ))}
          </TextField>
          <Stack direction="row" gap={1} sx={{ flexShrink: 0 }}>
            <WtButton onClick={handleSave} disabled={saving || !label.trim()}>
              {editing ? 'Save' : 'Add topic'}
            </WtButton>
            {editing && <WtButton ghost onClick={reset} disabled={saving}>Cancel</WtButton>}
          </Stack>
        </Stack>
      )}

      <Stack gap={0.75}>
        {topics.map((topic) => (
          <Stack
            key={topic.id}
            direction="row"
            alignItems="center"
            gap={1}
            sx={{
              px: 1.5, py: 1,
              borderRadius: '10px',
              border: '1px solid',
              borderColor: editing?.id === topic.id ? 'primary.main' : 'divider',
              bgcolor: 'background.paper',
              minWidth: 0,
            }}
          >
            <Typography sx={{ fontSize: 13.5, fontWeight: 600, flex: 1, minWidth: 0 }}>
              {topic.label}
            </Typography>
            <ToneChip tone="neutral" size="small" label={scopeLabel(topic.scope)} />
            {isAdmin && (
              <>
                <IconButton size="small" onClick={() => handleEdit(topic)} aria-label={`Edit ${topic.label}`}>
                  <i className="bi bi-pencil" style={{ fontSize: 12 }} />
                </IconButton>
                <IconButton size="small" color="error" onClick={() => handleDelete(topic)} aria-label={`Delete ${topic.label}`}>
                  <i className="bi bi-trash" style={{ fontSize: 12 }} />
                </IconButton>
              </>
            )}
          </Stack>
        ))}

        {/* Always last in the picker, and not a row anyone can edit — shown so the list here
            matches what an approver actually sees. */}
        <Stack
          direction="row"
          alignItems="center"
          gap={1}
          sx={{
            px: 1.5, py: 1,
            borderRadius: '10px',
            border: '1px dashed',
            borderColor: 'divider',
            minWidth: 0,
          }}
        >
          <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: 'text.secondary', flex: 1, minWidth: 0 }}>
            {OTHER_TOPIC}
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
            always offered · the approver must type the question
          </Typography>
        </Stack>
      </Stack>

      {topics.length === 0 && (
        <Box sx={{ pt: 1.5, textAlign: 'center', color: 'text.secondary', fontSize: 13 }}>
          No topics yet — every question will be filed under “{OTHER_TOPIC}”.
        </Box>
      )}
    </ConfigSectionCard>
  );
}

export default QueryTopics;
