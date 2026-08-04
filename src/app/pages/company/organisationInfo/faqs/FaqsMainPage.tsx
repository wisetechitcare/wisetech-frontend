import { FaqsBoard } from '@app/modules/faqs';

/**
 * Organisation Info → FAQs page, and the FAQ tab on the attendance views.
 *
 * Delegates to the single FAQ module. This file previously carried a 543-line
 * bespoke implementation: a hand-rolled rAF scroll-spy that called
 * getBoundingClientRect on every section on every scroll event, a resize
 * listener driving ~20 `isMobile` ternaries, manual smooth-scroll maths, and
 * inline hex colours that made the page unreadable in dark mode.
 *
 * `hideEditButton` is kept for API parity with existing call sites — note it
 * was only ever a client-side hint. Management actions are gated server-side
 * by `authorize('settings.manage.all')` plus tenant scoping on every write.
 */
const FaqsMainPage = ({ hideEditButton }: { hideEditButton?: boolean }) => (
    <FaqsBoard canManage={!hideEditButton} />
);

export default FaqsMainPage;
