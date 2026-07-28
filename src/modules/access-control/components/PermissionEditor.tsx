import { useMemo } from 'react';
import { Alert, Box, Skeleton, Typography } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { usePermissionEditor } from '../hooks/usePermissionEditor';
import { ModuleCard } from './ModuleCard';
import { PermissionToolbar } from './PermissionToolbar';
import { UnsavedChangesBanner } from './UnsavedChangesBanner';
import { ValidationMessage } from './ValidationMessage';
import { ErrorState } from './ErrorState';
import type { EditorModule } from '../types';

const EditorSkeleton = () => (
  <Box aria-busy="true" aria-label="Loading access settings">
    {Array.from({ length: 5 }).map((_, i) => (
      <Skeleton key={i} variant="rounded" height={84} sx={{ mb: 1.5, borderRadius: 3 }} />
    ))}
  </Box>
);

/**
 * Permission Editor — Simple Mode (Phase 5.2).
 *
 * Business language throughout: the component tree never sees, stores, or
 * composes a permission key. It renders the normalized grid the backend returns
 * and sends back the same shape.
 */
export const PermissionEditor = ({ roleId }: { roleId: string }) => {
  const editor = usePermissionEditor(roleId);

  // Group module cards by business category for scannability.
  const grouped = useMemo(() => {
    const groups = new Map<string, EditorModule[]>();
    for (const module of Object.values(editor.modules)) {
      const list = groups.get(module.category) ?? [];
      list.push(module);
      groups.set(module.category, list);
    }
    return Array.from(groups.entries());
  }, [editor.modules]);

  if (editor.isLoading || !editor.hydrated) return <EditorSkeleton />;

  if (editor.isError) {
    return (
      <ErrorState
        title="We couldn't load this role's access"
        description="There was a problem reaching the server. Please try again."
        onRetry={() => editor.refetch()}
      />
    );
  }

  const readOnly = !editor.editable;

  // Per-section reach exclusions. "Own" is meaningless for list/directory sections
  // (there's no "directory of just me"), so it's hidden ONLY for those sections —
  // currently the Employees ('users') section. Every other section keeps the full
  // reach set. We tighten one section at a time as each is validated.
  const OWN_HIDDEN_MODULES = new Set<string>(['users']);
  const reachOptionsFor = (moduleKey: string) =>
    OWN_HIDDEN_MODULES.has(moduleKey)
      ? editor.reachOptions.filter((r) => r !== 'own')
      : editor.reachOptions;

  return (
    <Box>
      {readOnly && (
        <Alert severity="info" icon={<LockOutlinedIcon />} sx={{ borderRadius: 2, mb: 2 }}>
          {editor.lockedReason ?? "This role's access can't be changed."}
        </Alert>
      )}

      <ValidationMessage issues={editor.issues} error={editor.saveError} />

      {editor.isDirty && !readOnly && (
        <UnsavedChangesBanner
          count={editor.dirtyKeys.length}
          onSave={editor.commit}
          onDiscard={editor.discard}
          disabled={editor.isSaving}
        />
      )}

      {grouped.map(([category, modules]) => (
        <Box key={category} sx={{ mb: 3 }}>
          <Typography
            variant="overline"
            sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: 0.6 }}
          >
            {category}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 0.5 }}>
            {modules.map((module) => (
              <ModuleCard
                key={module.key}
                module={module}
                reachOptions={reachOptionsFor(module.key)}
                dirty={editor.isModuleDirty(module.key)}
                disabled={readOnly || editor.isSaving}
                onCapabilityChange={editor.setCapability}
                onLevelChange={editor.setLevel}
              />
            ))}
          </Box>
        </Box>
      ))}

      {!readOnly && (
        <PermissionToolbar
          dirtyCount={editor.dirtyKeys.length}
          isDirty={editor.isDirty}
          isSaving={editor.isSaving}
          onSave={editor.commit}
          onDiscard={editor.discard}
        />
      )}
    </Box>
  );
};

export default PermissionEditor;
