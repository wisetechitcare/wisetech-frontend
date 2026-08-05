import { TONE_NAMES, type ToneName } from '@app/modules/common/components/ui';

/**
 * FAQ domain contract.
 *
 * Sections are DATA, not code. They used to be a hardcoded list here mirroring
 * a Prisma enum, so renaming a section or adding one needed a migration and a
 * deploy. They are now rows in `faq_categories` that each tenant owns, fetched
 * with the FAQs themselves. Nothing in this module may hardcode a section again.
 *
 * The only constants left are presentation *defaults* — used when a category
 * has no icon or tone set — and the pickers' option lists.
 */

export interface Faq {
    id: string;
    question: string;
    answer: string;
}

/** A FAQ section as the API returns it, with its questions. */
export interface FaqSection {
    /** The stable slug. Kept as `id` for backward compatibility with older callers. */
    id: string;
    /** The real handle for writes, reordering and deletion. */
    categoryId: string;
    title: string;
    icon: string | null;
    tone: string | null;
    description: string | null;
    displayOrder: number;
    isSystem: boolean;
    faqs: Faq[];
}

/** A section as the management screen sees it — no questions, but a count and active flag. */
export interface FaqCategory {
    id: string;
    slug: string;
    name: string;
    icon: string | null;
    tone: string | null;
    description: string | null;
    displayOrder: number;
    isActive: boolean;
    /** Built-in sections: fully editable, but not deletable. */
    isSystem: boolean;
    faqCount: number;
}

export interface FaqCategoryInput {
    name: string;
    icon?: string | null;
    tone?: string | null;
    description?: string | null;
    isActive?: boolean;
}

/** Fallbacks for a section whose icon/tone the admin never set. */
export const DEFAULT_SECTION_ICON = 'questionnaire-tablet';
export const DEFAULT_SECTION_TONE: ToneName = 'slate';

/**
 * Icons offered by the section picker.
 *
 * Every name is verified present in the keenicons duotone font — an unlisted
 * name renders as an empty box, so this list is deliberately curated rather
 * than free text.
 */
export const FAQ_ICON_CHOICES: readonly string[] = [
    'questionnaire-tablet', 'time', 'calendar', 'dollar', 'wallet', 'bill',
    'shield-tick', 'book', 'note-2', 'briefcase', 'percentage', 'abstract-26',
    'information-5', 'filter', 'magnifier',
] as const;

/** The kit's full palette — derived, so adding a tone to TRIO reaches FAQs too. */
export const FAQ_TONE_CHOICES: readonly ToneName[] = TONE_NAMES;

export const isToneName = (value: unknown): value is ToneName =>
    typeof value === 'string' && (FAQ_TONE_CHOICES as readonly string[]).includes(value);

/** Resolve a category's tone to something the kit can actually style. */
export const resolveTone = (tone: string | null | undefined): ToneName =>
    isToneName(tone) ? tone : DEFAULT_SECTION_TONE;

export const resolveIcon = (icon: string | null | undefined): string =>
    icon && icon.trim() ? icon : DEFAULT_SECTION_ICON;

export const FAQ_QUESTION_MAX = 300;
export const FAQ_ANSWER_MAX = 4000;
export const FAQ_CATEGORY_NAME_MAX = 100;
export const FAQ_CATEGORY_DESCRIPTION_MAX = 255;

/**
 * Legacy section keys that predate the category model. They are matched against
 * a category `slug` server-side; `leaveAttendance` never was one, so it is
 * translated here. Everything else passes through untouched.
 */
const LEGACY_TYPE_ALIASES: Readonly<Record<string, string>> = {
    leaveAttendance: 'attendance',
};

/** Normalise a caller-supplied section key to a slug the API will recognise. */
export const resolveSectionKey = (value: unknown): string | undefined => {
    if (typeof value !== 'string' || !value.trim()) return undefined;
    const key = value.trim();
    return LEGACY_TYPE_ALIASES[key] ?? key;
};
