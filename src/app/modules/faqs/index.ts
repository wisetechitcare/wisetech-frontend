/**
 * FAQ module — the single source of truth for FAQ data, contract and UI.
 * Every FAQ screen in the app renders `FaqsBoard`; nothing else fetches FAQs.
 */
export { FaqsBoard, default as default } from './FaqsBoard';
export { FaqAccordionItem } from './FaqAccordionItem';
export { FaqEditorDialog } from './FaqEditorDialog';
export { useFaqs, FAQS_QUERY_KEY } from './useFaqs';
export {
    FAQ_SECTIONS,
    FAQ_SECTION_BY_ID,
    FAQ_TYPES,
    FAQ_QUESTION_MAX,
    FAQ_ANSWER_MAX,
    isFaqType,
    resolveFaqType,
} from './types';
export type { Faq, FaqSection, FaqSectionMeta, FaqType } from './types';
