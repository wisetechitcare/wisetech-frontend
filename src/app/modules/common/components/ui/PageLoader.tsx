import React from 'react';
import { Box, CircularProgress } from '@mui/material';

export interface PageLoaderProps {
    /** Viewport placeholder height. Default `600` matches legacy Bootstrap Loader. */
    minHeight?: number | string;
    /** Spinner diameter in px. Default `36`. */
    size?: number;
    /** Accessible name. */
    label?: string;
}

/**
 * Full-block loading placeholder for page / section fetches.
 * Prefer this (or the legacy path `@app/modules/common/utils/Loader`) over
 * Bootstrap `spinner-border` / `react-bootstrap` Spinner.
 *
 * Inline / button spinners stay as MUI `CircularProgress` size={14–18} at the call site.
 */
export function PageLoader({
    minHeight = 600,
    size = 36,
    label = 'Loading',
}: PageLoaderProps) {
    return (
        <Box
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label={label}
            sx={{
                width: 1,
                minHeight,
                my: 2,
                px: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            <CircularProgress size={size} color="primary" />
        </Box>
    );
}

export default PageLoader;
