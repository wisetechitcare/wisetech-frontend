import type { ToneName } from '@app/modules/common/components/ui/tw/tokens';

/**
 * FAQ domain contract — THE single source of truth for the frontend.
 *
 * Before this module there were two parallel FAQ implementations with two
 * different data shapes, two section lists and two type vocabularies; screens
 * disagreed about what a "section" was and one of them sent type keys the
 * backend enum did not contain. Everything FAQ-related now derives from here.
 *
 * `FaqType` mirrors the Prisma `FaqType` enum and `FAQ_SECTIONS` mirrors
 * `FAQ_SECTION_TITLES` in the backend's handlers/company.ts. Those two lists
 * must stay in step — adding a section means editing both.
 */
export type FaqType = 'attendance' | 'leaves' | 'salary' | 'reimbursement' | 'general_rules' | 'loan';

export interface Faq {
    id: string;
    question: string;
    answer: string;
}

export interface FaqSection {
    id: FaqType;
    title: string;
    faqs: Faq[];
}

export interface FaqSectionMeta {
    id: FaqType;
    title: string;
    /** KTIcon (keenicons duotone) name — verified present in the icon font. */
    icon: string;
    tone: ToneName;
    /** Shown under the section heading; orients the reader before they scan. */
    blurb: string;
}

/**
 * Section order, titles, iconography and tone — rendered identically by every
 * FAQ surface. Order here is the order on screen.
 */
export const FAQ_SECTIONS: readonly FaqSectionMeta[] = [
    { id: 'attendance', title: 'Attendance', icon: 'time', tone: 'blue', blurb: 'Check-in, check-out, shifts and regularisation.' },
    { id: 'leaves', title: 'Leaves', icon: 'calendar', tone: 'green', blurb: 'Leave types, balances, applying and approvals.' },
    { id: 'salary', title: 'Salary', icon: 'dollar', tone: 'purple', blurb: 'Payslips, deductions, arrears and payout dates.' },
    { id: 'reimbursement', title: 'Reimbursement', icon: 'bill', tone: 'amber', blurb: 'Claims, receipts, limits and settlement.' },
    { id: 'loan', title: 'Loans', icon: 'wallet', tone: 'cyan', blurb: 'Eligibility, EMI deductions and repayment.' },
    { id: 'general_rules', title: 'General Rules', icon: 'shield-tick', tone: 'slate', blurb: 'Company-wide policies and code of conduct.' },
] as const;

/** O(1) section lookup — avoids a linear scan per rendered row. */
export const FAQ_SECTION_BY_ID: Readonly<Record<FaqType, FaqSectionMeta>> = Object.fromEntries(
    FAQ_SECTIONS.map((section) => [section.id, section]),
) as Record<FaqType, FaqSectionMeta>;

export const FAQ_TYPES: readonly FaqType[] = FAQ_SECTIONS.map((section) => section.id);

/** Narrows an arbitrary string (route param, legacy key, API value) to a FaqType. */
export const isFaqType = (value: unknown): value is FaqType =>
    typeof value === 'string' && Object.prototype.hasOwnProperty.call(FAQ_SECTION_BY_ID, value);

/**
 * Legacy type keys that predate this module and are NOT values of the backend
 * `FaqType` enum. Passing one through raised a Prisma validation error that
 * surfaced as a 500 on every load of the Attendance-Information tab, and a 400
 * on every create.
 *
 * `loan` used to live here too; it is now a real enum value and a real section
 * (migration 20260804120000), so it resolves directly. Mapping the remainder
 * here keeps every existing mount point working while the app speaks one
 * vocabulary. Remove an entry once its caller passes a real FaqType.
 */
const LEGACY_TYPE_ALIASES: Readonly<Record<string, FaqType>> = {
    leaveAttendance: 'attendance',
};

/**
 * Resolve any caller-supplied section key to a real FaqType.
 * Returns undefined for empty/unknown input, which means "all sections".
 */
export const resolveFaqType = (value: unknown): FaqType | undefined => {
    if (isFaqType(value)) return value;
    if (typeof value === 'string' && LEGACY_TYPE_ALIASES[value]) return LEGACY_TYPE_ALIASES[value];
    return undefined;
};

export const FAQ_QUESTION_MAX = 300;
export const FAQ_ANSWER_MAX = 4000;
