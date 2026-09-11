import React from 'react';
import { useCurrency } from '@hooks/useCurrency';

/**
 * The active currency's glyph — `₹`, `$`, `د.إ` — resolved from the branch, never typed in.
 *
 * WHY THIS IS A COMPONENT AND NOT A STRING IN EACH SCREEN. The recruitment overview's
 * "Offers Out" tile showed a `$` because the icon font has a `dollar` glyph and no rupee, so
 * `$` was the nearest available shape. Every money tile in the app had the same problem and
 * would have been fixed the same wrong way, one file at a time, each with its own idea of
 * where the currency comes from. One component means one answer and one place to change it.
 *
 * DELIBERATELY MUI-FREE. It renders a bare `<span>` so it works in the MUI kit AND in the
 * Tailwind twin (`ui/tw`), which imports no MUI by design. Half the surfaces that need a
 * currency glyph — the leave and balance screens — are on the twin, and a component that
 * only worked in one kit would have sent them back to hardcoding the symbol.
 *
 * It is decorative: `aria-hidden`, because the label beside it ("Offers Out") is what a
 * screen reader should say, not "rupee sign". A figure that IS money should be rendered with
 * `format()` from the same hook, which puts the symbol in the accessible text where it
 * belongs.
 *
 * @example
 * <StatTile label="Offers Out" value={n} trio={TRIO.amber} icon={<CurrencySymbol />} />
 */
export const CurrencySymbol: React.FC<{ className?: string }> = ({ className }) => {
    const { symbol } = useCurrency();
    return (
        <span aria-hidden="true" className={className} style={{ lineHeight: 1 }}>
            {symbol}
        </span>
    );
};

export default CurrencySymbol;
