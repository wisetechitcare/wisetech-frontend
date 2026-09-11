import React from 'react';
import { AppIcon } from '@app/modules/common/components/ui/AppIcon';
import { C, FONT, SP } from './ConfigDesignSystem';

/**
 * The two fillers every configuration section reaches for: a responsive grid of small cards,
 * and the line that stands in for one when there are none yet.
 *
 * They lived as private consts inside ProjectConfigure until the Payment Plans section moved
 * out to be shared with the Tasks configuration. Copying twelve lines of markup into the new
 * home would have been the cheaper edit and the wrong one — two copies of an empty state drift
 * in wording first and in spacing second, and this module is where the rest of the
 * configuration furniture already lives.
 */

/** Small cards, as many per row as fit. Nothing configurable — a section that needs a
 *  different grid is not using this one. */
export const ChipGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: SP.sm,
        marginTop: SP.md,
    }}>
        {children}
    </div>
);

/** `label` is the plural noun, lower case: "payment plans", "stakeholders". The sentence is
 *  built here so every empty section in the product reads the same way. */
export const EmptyState: React.FC<{ label: string }> = ({ label }) => (
    <div style={{
        textAlign: 'center',
        padding: '28px 16px',
        color: C.textMuted,
        fontFamily: FONT.body,
        fontSize: '13px',
    }}>
        <AppIcon name="bi-inbox" className="fs-2qx" style={{ display: 'block', marginBottom: '8px', opacity: 0.4 }} />
        No {label} configured yet
    </div>
);
