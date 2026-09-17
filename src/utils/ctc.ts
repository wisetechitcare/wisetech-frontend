/**
 * Salary rules the API enforces, mirrored so a form can say so before it saves rather than
 * after, as a bare 422.
 *
 * THE BACKEND TWIN is `wisetech-backend/src/utils/ctc.ts`. The repos share no code, so the rule
 * is written twice; change both or neither, or a form will pass what the server refuses.
 *
 * A SALARY IS THE FULL ANNUAL AMOUNT, in the currency of the branch it belongs to. Recruitment
 * used to take "lakhs per annum" — an Indian shorthand where 12 means ₹12,00,000 — and the same
 * column ended up holding both units. So the one thing these rules refuse is the band a lakhs
 * figure lands in.
 */

/** Payroll's floor for an annual CTC. Nothing below it is a yearly salary in any currency. */
export const MIN_VALID_ANNUAL_CTC = 1000;

/**
 * Could this be a full annual salary? Zero counts — a fresher's current CTC is genuinely
 * nothing — and so does no answer. What fails is 0 < x < 1000: 12 typed to mean 12 lakh.
 */
export const isAnnualAmountOrZero = (value: number | null | undefined): boolean =>
    value == null || value === 0 || value >= MIN_VALID_ANNUAL_CTC;

/** The message for a salary that fails `isAnnualAmountOrZero` — the same words the API uses. */
export const annualAmountError = (label: string, value: number | null | undefined): string | undefined =>
    isAnnualAmountOrZero(value) ? undefined : `${label} is the full annual amount — for example 1200000, not 12`;
