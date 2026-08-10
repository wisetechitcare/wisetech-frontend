import * as Yup from 'yup';
import dayjs from 'dayjs';

/**
 * The one validation schema for filing an expense.
 *
 * There were two, both writing the same table, and they disagreed on which fields were required:
 * the direct form demanded company, project, from-location and to-location; the draft form made
 * all four optional. The draft path is the one users actually take — the direct path saves to
 * drafts anyway — so in practice "required" meant nothing, and that is where the empty-project
 * rows come from. The second copy even carried the comment "mirrors Reimbursement.tsx exactly",
 * which had stopped being true.
 *
 * Required means required here, in one place, for every entry point.
 */

/** One cap instead of the same magic number written into two schemas. */
export const MAX_EXPENSE_AMOUNT = 1_000_000;

/**
 * Whether a category needs From/To.
 *
 * Reads `ReimbursementType.requiresLocation`, which the category configuration now owns. Two
 * name-matching stopgaps preceded it and both were wrong in different directions: an allow-list
 * of travel words matched "Taxi" but not "Auto Rickshaw" — the single most-used category — and
 * the inverted deny-list that replaced it still guessed. Only the data knows which categories are
 * journeys.
 *
 * Falls back to TRUE when the flag is absent, because this module is ~96% travel: an unnecessary
 * optional field is a smaller harm than a missing required one.
 */
export const categoryRequiresLocation = (
    category?: { requiresLocation?: boolean | null; label?: string } | null,
): boolean => {
    if (!category) return false;                 // nothing chosen yet — ask for nothing
    return category.requiresLocation !== false;
};

export interface ReimbursementSchemaOptions {
    /**
     * True when editing an existing record — the date and category are already set and are not
     * re-collected, so they are not re-required.
     */
    isEditing?: boolean;
    /** The selected category, carrying its own `requiresLocation` flag. */
    category?: { requiresLocation?: boolean | null; label?: string } | null;
}

export const getReimbursementSchema = ({
    isEditing = false,
    category = null,
}: ReimbursementSchemaOptions = {}) => {
    const needsLocation = categoryRequiresLocation(category);

    // Only alphabets, but validated rather than enforced by swallowing keystrokes — the forms
    // used to preventDefault in onKeyDown, which blocked IME composition and legitimate names
    // with hyphens or apostrophes while doing nothing about paste.
    const locationRule = Yup.string().matches(
        /^[a-zA-Z\s]*$/,
        'Location must contain only letters',
    );

    return Yup.object({
        expenseDate: Yup.string()
            .required('Date is required')
            .test('not-future', 'An expense cannot be dated in the future', (value) =>
                !value || !dayjs(value).isAfter(dayjs(), 'day'))
            .label('Date'),
        clientTypeId: Yup.string().label('Company Type'),
        // Company and project stay OPTIONAL, against the plan's "required means required".
        //
        // The plan's own risk note says to check how many submissions would start failing before
        // enforcing. Measured against live data: 66% of existing expenses have no client company
        // and 80% have no project at all. Requiring them does not improve data quality, it blocks
        // the way four out of five expenses are actually filed, and the likeliest outcome is
        // people picking any project to get past the field — which is worse than a null, because
        // a null is honestly empty and a wrong project is silently wrong.
        //
        // Making these required is a policy change to announce and stage, not a validation rule
        // to slip in. The single-schema consolidation stands either way; flip these two lines
        // when finance has decided.
        clientCompanyId: Yup.string().label('Company Name'),
        projectId: Yup.string().label('Project'),
        reimbursementTypeId: isEditing
            ? Yup.string().label('Category')
            : Yup.string().required('Category is required').label('Category'),
        amount: Yup.number()
            .required('Amount is required')
            .min(1, 'Amount must be greater than 0')
            .max(MAX_EXPENSE_AMOUNT, `Amount must be less than ${MAX_EXPENSE_AMOUNT.toLocaleString('en-IN')}`)
            .label('Amount'),
        description: Yup.string().label('Note'),
        document: Yup.string().label('Receipt'),
        fromLocation: needsLocation
            ? locationRule.required('From location is required for travel expenses').label('From Location')
            : locationRule.label('From Location'),
        toLocation: needsLocation
            ? locationRule.required('To location is required for travel expenses').label('To Location')
            : locationRule.label('To Location'),
    });
};

/**
 * Fresh default values, every time.
 *
 * This used to be a module-level `let initialState = {...}` in three files, reassigned by
 * `handleNew`. One mutable object shared by every mount of every form: open two tabs, and one
 * form's edits became the other's defaults.
 */
export const makeReimbursementInitialState = () => ({
    expenseDate: dayjs().format('YYYY-MM-DD'),
    clientTypeId: '',
    clientCompanyId: '',
    projectId: '',
    reimbursementTypeId: '',
    fromLocation: '',
    toLocation: '',
    amount: undefined as number | undefined,
    document: '',
    description: '',
});

/**
 * The limit an amount breaches, as the user types.
 *
 * `isExceedingLimit` is computed once at create, persisted, and then surfaced days later as a red
 * row an approver discovers — the person who could still have done something about it never saw
 * it. This returns the message to show under the Amount field instead.
 *
 * Two caps apply and the tighter one wins: the employee's per-request limit and the category's
 * own limit. Naming the cap matters — "over your limit" is not actionable, "₹240 over the ₹1,000
 * Travel cap" is.
 *
 * ponytail: reads the two existing limit fields. Phase 8 replaces this with the real policy
 * engine (WARN / JUSTIFY / BLOCK, monthly and annual caps) — this is the surface it renders into.
 */
export const describeLimitBreach = (
    amount: number | string | undefined,
    limits: { perRequest?: number | string | null; category?: number | string | null; categoryName?: string | null },
): string | null => {
    const value = Number(amount ?? 0);
    if (!Number.isFinite(value) || value <= 0) return null;

    const candidates: Array<{ cap: number; label: string }> = [];
    const perRequest = Number(limits.perRequest ?? NaN);
    if (Number.isFinite(perRequest) && perRequest > 0) {
        candidates.push({ cap: perRequest, label: 'your per-request limit' });
    }
    const category = Number(limits.category ?? NaN);
    if (Number.isFinite(category) && category > 0) {
        candidates.push({ cap: category, label: `the ${limits.categoryName || 'category'} cap` });
    }
    if (candidates.length === 0) return null;

    // The tighter cap is the one that will actually stop this claim.
    const tightest = candidates.reduce((a, b) => (a.cap <= b.cap ? a : b));
    if (value <= tightest.cap) return null;

    const over = value - tightest.cap;
    const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    return `${inr(over)} over ${tightest.label} of ${inr(tightest.cap)}`;
};

/**
 * Flags a likely duplicate: same category, same day, same amount.
 *
 * Advisory only — two cab rides on one day are a real thing, so this warns and never blocks.
 * Matched against rows already in memory rather than a new endpoint, because the drafts a user
 * is filing against are exactly the ones already on screen.
 */
export const findDuplicateCandidate = <T extends {
    id?: string;
    expenseDate?: string | Date | null;
    amount?: number | string | null;
    reimbursementTypeId?: string | null;
}>(
    rows: T[],
    candidate: { expenseDate?: string; amount?: number | string; reimbursementTypeId?: string },
    excludeId?: string,
): T | undefined => {
    if (!candidate.expenseDate || !candidate.amount || !candidate.reimbursementTypeId) return undefined;
    const day = dayjs(candidate.expenseDate);
    if (!day.isValid()) return undefined;
    const amount = Number(candidate.amount);
    if (!Number.isFinite(amount) || amount <= 0) return undefined;

    return rows.find((row) =>
        row.id !== excludeId &&
        row.reimbursementTypeId === candidate.reimbursementTypeId &&
        Number(row.amount ?? 0) === amount &&
        dayjs(row.expenseDate).isSame(day, 'day'));
};
