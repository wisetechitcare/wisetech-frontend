/**
 * Billing’s title block — thin alias of the shared {@link EntityPageHeader}
 * so Billing pages and App Settings cannot drift on spacing / type scale.
 */
import type { ReactNode } from 'react';
import { EntityPageHeader, TRIO, type Trio } from '@app/modules/common/components/ui';

const BillingPageHeader = ({
  title,
  description,
  icon,
  trio = TRIO.blue,
  action,
}: {
  title: string;
  description?: string;
  icon: string;
  trio?: Trio;
  action?: ReactNode;
}) => (
  <EntityPageHeader title={title} description={description} icon={icon} trio={trio} action={action} />
);

export default BillingPageHeader;
