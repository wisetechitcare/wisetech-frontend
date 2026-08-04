import { FaqsBoard } from '@app/modules/faqs';

/**
 * Attendance → Information FAQ tab.
 *
 * Delegates to the single FAQ module. This file previously owned its own fetch,
 * modal, validation and state; it also read `data.faqs` from a response that
 * only ever carries `data.sections`, and passed the type key `leaveAttendance`
 * which is not a value of the backend FaqType enum — so it 500'd on load and
 * 400'd on create. Both are handled inside the module now.
 */
const Faqs = ({ fromAdmin = false, typeKey = '' }: { fromAdmin?: boolean; typeKey: string }) => (
    <FaqsBoard type={typeKey} canManage={fromAdmin} embedded />
);

export default Faqs;
