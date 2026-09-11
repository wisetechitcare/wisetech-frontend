import React from 'react';
import { Box } from '@mui/material';
import { useCurrency } from '@hooks/useCurrency';

/**
 * The active currency's glyph — `₹`, `$`, `د.إ` — resolved from the branch, never typed in.
 *
 * WHY THIS IS A COMPONENT AND NOT A STRING IN EACH SCREEN. The recruitment overview's
 * "Offers Out" tile showed a `$` because the icon font has a `dollar` glyph and no rupee,
 * so `$` was the nearest available shape. Every money tile in the app had the same problem
 * and would have been fixed the same wrong way, one file at a time, each with its own idea
 * of where the currency comes from. One component means there is one answer and one place
 * to change it.
 *
 * It is decorative — `aria-hidden`, because the label beside it ("Offers Out") is what a
 * screen reader should say, not "rupee sign". A figure that IS money should be rendered
 * with `format()` from the same hook, which puts the symbol in the accessible text where it
 * belongs.
 *
 * @example
 * <StatTile label="Offers Out" value={n} trio={TRIO.amber} icon={<CurrencySymbol />} />
 */
export const CurrencySymbol: React.FC<{ className?: string }> = ({ className }) => {
    const { symbol } = useCurrency();
    return (
        <Box component="span" aria-hidden="true" className={className} sx={{ lineHeight: 1 }}>
            {symbol}
        </Box>
    );
};

export default CurrencySymbol;
