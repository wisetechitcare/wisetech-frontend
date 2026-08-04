import { FaqsBoard } from '@app/modules/faqs';
import { LOAN_KEY } from '@constants/configurations-key';
import { hasPermission } from '@utils/authAbac';
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from '@constants/statistics';

/**
 * Loans FAQ tab.
 *
 * Delegates to the single FAQ module. `LOAN_KEY` ('loan') is not a value of the
 * backend FaqType enum — the module maps it to a real section, which is why
 * this tab previously showed nothing and could never save a new question.
 */
const Faqs = ({ fromAdmin = false }: { fromAdmin?: boolean }) => {
    const canManage =
        fromAdmin &&
        hasPermission(resourceNameMapWithCamelCase.loan, permissionConstToUseWithHasPermission.editOthers);

    return <FaqsBoard type={LOAN_KEY} canManage={canManage} embedded />;
};

export default Faqs;
