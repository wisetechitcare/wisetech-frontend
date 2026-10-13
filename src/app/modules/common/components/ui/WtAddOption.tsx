import React from 'react';
import { Box } from '@mui/material';

/**
 * The one “+ Add …” contract for labelled selects.
 *
 * Features pass this shape into `WtField` / `WtFieldFormik` / adapters — never invent
 * a second Add button beside a dropdown.
 */
export type WtAddOptionPlacement = 'menu' | 'label';

export interface WtAddOption {
    /** Opens create UI (dialog, parent modal, etc.). */
    onAdd: () => void;
    /** Shown as `+ {label}`. Default `Add New`. */
    label?: string;
    /**
     * `menu` (default) — first row inside the open list (Autocomplete / WtSelect).
     * `label` — text button on the label row (legacy DropdownInput / LocationDropdown).
     */
    placement?: WtAddOptionPlacement;
}

export const DEFAULT_ADD_OPTION_LABEL = 'Add New';

/** Shared text control for `placement: 'label'`. Sized to the label line so columns stay aligned. */
export function WtAddOptionButton({
    label = DEFAULT_ADD_OPTION_LABEL,
    onAdd,
    disabled,
}: {
    label?: string;
    onAdd: () => void;
    disabled?: boolean;
}) {
    return (
        <Box
            component="button"
            type="button"
            disabled={disabled}
            onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                if (!disabled) onAdd();
            }}
            sx={{
                flexShrink: 0,
                border: 0,
                background: 'none',
                p: 0,
                fontSize: 12,
                fontWeight: 600,
                lineHeight: 1.2,
                color: 'primary.main',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                '&:hover': disabled ? undefined : { textDecoration: 'underline' },
            }}
        >
            + {label}
        </Box>
    );
}

/** Resolve the canonical object from either `addOption` or legacy flat props. */
export function resolveWtAddOption(
    addOption?: WtAddOption,
    onAddOption?: () => void,
    addOptionLabel?: string,
): WtAddOption | undefined {
    if (addOption) {
        return {
            onAdd: addOption.onAdd,
            label: addOption.label ?? DEFAULT_ADD_OPTION_LABEL,
            placement: addOption.placement ?? 'menu',
        };
    }
    if (onAddOption) {
        return {
            onAdd: onAddOption,
            label: addOptionLabel ?? DEFAULT_ADD_OPTION_LABEL,
            placement: 'menu',
        };
    }
    return undefined;
}
