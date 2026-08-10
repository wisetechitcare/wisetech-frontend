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
 * Categories that actually involve travelling between two places.
 *
 * From/To used to be required for EVERY category, including meals and accommodation where they
 * are meaningless — so users typed junk to get past them, and that junk is now in the data.
 *
 * ponytail: hardcoded travel-category match; switch to `ReimbursementType.requiresLocation`
 * once Phase 8 Step 5 adds the column.
 */
const TRAVEL_CATEGORY_PATTERN = /travel|convey|mileage|cab|taxi|fuel|petrol|transport/i;

export const categoryRequiresLocation = (categoryName?: string | null): boolean =>
    !!categoryName && TRAVEL_CATEGORY_PATTERN.test(categoryName);

export interface ReimbursementSchemaOptions {
    /**
     * True when editing an existing record — the date and category are already set and are not
     * re-collected, so they are not re-required.
     */
    isEditing?: boolean;
    /**
     * Name of the selected category. Drives whether From/To are required at all.
     * Undefined means "not yet chosen", which cannot require location fields.
     */
    categoryName?: string | null;
}

export const getReimbursementSchema = ({
    isEditing = false,
    categoryName = null,
}: ReimbursementSchemaOptions = {}) => {
    const needsLocation = categoryRequiresLocation(categoryName);

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
        clientCompanyId: Yup.string().required('Company name is required').label('Company Name'),
        projectId: Yup.string().required('Project is required').label('Project'),
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
