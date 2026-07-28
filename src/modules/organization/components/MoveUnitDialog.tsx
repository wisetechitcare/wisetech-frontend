import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  MenuItem, TextField, Typography,
} from '@mui/material';
import { useMoveUnit } from '../hooks/useOrganization';
import { errorMessage, humanizeType } from '../utils/format';
import { collectSubtreeIds, flattenTree } from '../utils/tree';
import type { TreeNode } from '../types';

export interface MoveUnitTarget {
  id: string;
  name: string;
  parentId: string | null;
}

interface MoveUnitDialogProps {
  open: boolean;
  onClose: () => void;
  unit: MoveUnitTarget | null;
  /** The full tenant tree — the source of valid destinations. */
  tree: TreeNode[];
}

const ROOT_VALUE = '__root__';

/**
 * Move a unit to a new parent. The unit's own subtree is excluded from the
 * destination list, so an invalid (cycle-creating) move can never be chosen.
 */
export const MoveUnitDialog = ({ open, onClose, unit, tree }: MoveUnitDialogProps) => {
  const [target, setTarget] = useState<string>(ROOT_VALUE);
  const move = useMoveUnit();

  useEffect(() => {
    if (open) {
      setTarget(unit?.parentId ?? ROOT_VALUE);
      move.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, unit]);

  // Destinations = every node EXCEPT the unit and its descendants, plus the root.
  const options = useMemo(() => {
    if (!unit) return [];
    const excluded = collectSubtreeIds(tree, unit.id);
    return flattenTree(tree)
      .filter(({ node }) => !excluded.has(node.id))
      .map(({ node, depth }) => ({ id: node.id, name: node.name, type: node.type, depth }));
  }, [tree, unit]);

  const currentParentId = unit?.parentId ?? ROOT_VALUE;
  const isNoop = target === currentParentId;
  const canSubmit = !!unit && !isNoop && !move.isPending;

  const submit = async () => {
    if (!canSubmit || !unit) return;
    try {
      await move.mutateAsync({
        id: unit.id,
        payload: { parentId: target === ROOT_VALUE ? null : target },
      });
      onClose();
    } catch {
      // surfaced inline below
    }
  };

  return (
    <Dialog open={open} onClose={move.isPending ? undefined : onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Move {unit ? `“${unit.name}”` : 'unit'}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Choose a new parent. The unit and everything under it are excluded so the
          hierarchy stays valid.
        </Typography>

        {move.isError && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{errorMessage(move.error)}</Alert>
        )}

        <TextField
          select label="New parent" fullWidth value={target}
          onChange={(e) => setTarget(e.target.value)}
          inputProps={{ 'aria-label': 'New parent unit' }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        >
          <MenuItem value={ROOT_VALUE}>
            <Box component="span" sx={{ fontWeight: 600 }}>Tenant root (top level)</Box>
          </MenuItem>
          {options.map((o) => (
            <MenuItem key={o.id} value={o.id}>
              <Box component="span" sx={{ pl: o.depth * 1.5, display: 'inline-flex', gap: 1, alignItems: 'baseline' }}>
                <span>{o.name}</span>
                <Typography component="span" variant="caption" color="text.secondary">
                  {humanizeType(o.type)}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </TextField>

        {isNoop && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            This is the unit's current location — pick a different parent to move it.
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={move.isPending} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button onClick={submit} variant="contained" disabled={!canSubmit}
          sx={{ textTransform: 'none', borderRadius: 2 }}>
          {move.isPending ? 'Moving…' : 'Move unit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MoveUnitDialog;
