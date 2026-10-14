import React from 'react';
import { components } from 'react-select';
import { Box, useTheme } from '@mui/material';
import { LEGACY_UIKIT as T } from '@app/theme/tokens';
import {
    DEFAULT_ADD_OPTION_LABEL,
    type WtAddOption,
} from '@app/modules/common/components/ui/WtAddOption';

export type { WtAddOption };

export interface CreateAddOptionMenuListParams {
    onAdd: () => void;
    addLabel?: string;
}

/**
 * react-select MenuList with a kit-styled "+ Add …" row (WtAddOption `placement: 'menu'`).
 * Prefer `WtField addOption` for flat lists; use this only for grouped WtSelect adapters.
 */
export function createAddOptionMenuList({
    onAdd,
    addLabel = DEFAULT_ADD_OPTION_LABEL,
}: CreateAddOptionMenuListParams) {
    return function AddOptionMenuList(props: React.ComponentProps<typeof components.MenuList>) {
        const dark = useTheme().palette.mode === 'dark';
        const borderColor = dark ? '#30363D' : T.color.line;

        const handleAddNew = (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            onAdd();
        };

        const handleKeyDown = (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onAdd();
            }
        };

        return (
            <components.MenuList {...props}>
                <Box
                    role="button"
                    tabIndex={0}
                    onClick={handleAddNew}
                    onKeyDown={handleKeyDown}
                    sx={{
                        px: 1.5,
                        py: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        cursor: 'pointer',
                        borderBottom: `1px solid ${borderColor}`,
                        color: T.color.brand,
                        fontSize: 14,
                        fontWeight: 600,
                        '&:hover': { bgcolor: dark ? '#21262D' : T.color.panel },
                    }}
                >
                    <Box component="span" sx={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>+</Box>
                    <Box component="span">{addLabel}</Box>
                </Box>
                {props.children}
            </components.MenuList>
        );
    };
}

/** Build a MenuList override from the canonical `WtAddOption` object. */
export function createAddOptionMenuListFromProp(addOption: WtAddOption) {
    return createAddOptionMenuList({
        onAdd: addOption.onAdd,
        addLabel: addOption.label ?? DEFAULT_ADD_OPTION_LABEL,
    });
}
