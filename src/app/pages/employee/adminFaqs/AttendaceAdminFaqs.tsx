import { FaqsBoard } from '@app/modules/faqs';

/**
 * Admin FAQ management board.
 *
 * Delegates to the single FAQ module. This file previously owned a second,
 * parallel FAQ implementation — its own fetch, grouping, alphabetical re-sort
 * (which disagreed with every other screen's ordering), modal, and a
 * self-subscribing eventBus whose only listener was the component that emitted
 * it. All of that now lives in one place and is realtime across clients.
 */
const AttendanceAdminFaqs = () => <FaqsBoard canManage />;

export default AttendanceAdminFaqs;
