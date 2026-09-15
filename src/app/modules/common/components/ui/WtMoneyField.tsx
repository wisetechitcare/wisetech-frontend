import React from 'react';
import { WtField, type WtFieldProps } from './WtField';
import { useCurrency } from '@hooks/useCurrency';
import { formatCurrency, getCurrencySymbol } from '@utils/currency';

/**
 * WtMoneyField — an amount of money, in a named currency.
 *
 * WHY IT EXISTS. Every money input in the app was a bare number box with the unit written in
 * its label or hint — "Min CTC (LPA)", "Lakhs per year" — so the unit was a convention the
 * person typing had to know, and the recruitment module ended up storing lakhs in some rows and
 * rupees in others of the same column. This field makes the unit impossible to miss:
 *
 *   - the currency sits INSIDE the frame, where the eye already is;
 *   - the hint reads the number back as money as you type — type `12` and it says `₹12 per
 *     year`, which is the moment someone who meant twelve lakh notices.
 *
 * It is WtField underneath, so label, hint, error, density and the focus ring are the ones
 * every other field on the form has.
 *
 * THE CURRENCY. Pass `currency` for an amount that belongs to a specific record — a
 * requisition's band, an offer — using the code the API resolved for that record. Omit it for
 * the viewer's own currency. Never pass a hardcoded code.
 *
 * RULES STAY WITH THE CALLER. The field knows money, not salaries: a rule such as "an annual
 * CTC is at least 1,000" is passed in through `validate` (see `annualAmountError` in
 * `utils/ctc`), so the same field serves an expense, a fee or a salary.
 *
 * @example
 * <WtMoneyField label="Offered CTC" per="year" currency={offer.currency}
 *     value={form.offeredCtc} onChange={(v) => setForm({ ...form, offeredCtc: v })}
 *     validate={(v) => annualAmountError('Offered CTC', v)} />
 */
export interface WtMoneyFieldProps
    extends Omit<WtFieldProps, 'value' | 'onChange' | 'options' | 'type' | 'searchable' | 'children' | 'prefix' | 'multiline' | 'minRows' | 'inputMode' | 'clearable'> {
    value: number | null | undefined;
    /** `null` when the field is emptied — never 0, which is a real amount. */
    onChange: (value: number | null) => void;
    /** ISO 4217 of the record this amount belongs to. Omit for the viewer's currency. */
    currency?: string;
    /** Completes the read-back: `₹12,00,000 per year`. */
    per?: 'year' | 'month';
    /**
     * A rule the amount must satisfy. Returns the message when it does not. An explicit
     * `error` takes precedence, so a server message is never hidden behind a local one.
     */
    validate?: (value: number | null) => string | undefined;
}

export const WtMoneyField: React.FC<WtMoneyFieldProps> = ({
    value, onChange, currency, per, validate, hint, error, min = 0, step, ...rest
}) => {
    const { code: viewerCurrency } = useCurrency();
    const code = currency || viewerCurrency;
    const amount = value == null || !Number.isFinite(Number(value)) ? null : Number(value);

    const message = error || validate?.(amount);
    const readBack = amount != null ? `${formatCurrency(amount, code)}${per ? ` per ${per}` : ''}` : null;

    return (
        <WtField
            {...rest}
            type="number"
            inputMode="decimal"
            min={min}
            step={step ?? 'any'}
            prefix={getCurrencySymbol(code)}
            value={amount ?? ''}
            onChange={(raw) => {
                if (raw === '') return onChange(null);
                const n = Number(raw);
                onChange(Number.isFinite(n) ? n : null);
            }}
            error={message}
            hint={readBack ?? hint}
        />
    );
};

export default WtMoneyField;
