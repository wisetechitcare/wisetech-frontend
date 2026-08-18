export type Option = {
    label: string;
    value: string;
    /** Optional icon key, used by the reimbursement category picker. */
    icon?: string | null;
    /** Optional per-category spend cap, used for live limit feedback at entry. */
    amountLimit?: number | string | null;
    /** Whether this category collects From/To. Owned by the category config, not guessed. */
    requiresLocation?: boolean | null;
};