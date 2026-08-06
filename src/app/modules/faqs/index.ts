/**
 * FAQ module — the single source of truth for FAQ data, contract and UI.
 * Every FAQ screen in the app renders `FaqsBoard`; nothing else fetches FAQs.
 */
export { FaqsBoard, default as default } from './FaqsBoard';
export { FaqAccordionItem } from './FaqAccordionItem';
export { FaqEditorDialog } from './FaqEditorDialog';
export { useFaqs, FAQS_QUERY_KEY } from './useFaqs';
export { FaqSectionManagerDialog } from './FaqSectionManagerDialog';
export { useFaqCategories, FAQ_CATEGORIES_QUERY_KEY } from './useFaqCategories';
export {
    FAQ_ICON_CHOICES,
    FAQ_TONE_CHOICES,
    FAQ_QUESTION_MAX,
    FAQ_ANSWER_MAX,
    resolveIcon,
    resolveTone,
    resolveSectionKey,
} from './types';
export type { Faq, FaqSection, FaqCategory, FaqCategoryInput } from './types';
