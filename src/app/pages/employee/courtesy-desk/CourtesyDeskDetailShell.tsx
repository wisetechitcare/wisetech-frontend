import { PageTitle } from '@metronic/layout/core';
import type { ReactNode } from 'react';
import GiftManagementTabBar from './GiftManagementTabBar';
import { GIFT_MANAGEMENT_BASE } from './giftPaths';

export default function CourtesyDeskDetailShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const breadcrumbs = [
    { title: 'Home', path: '/dashboard', isSeparator: false, isActive: false },
    { title: '', path: '', isSeparator: true, isActive: false },
    { title: 'CRM', path: '/workspace/crm', isSeparator: false, isActive: false },
    { title: '', path: '', isSeparator: true, isActive: false },
    { title: 'Gift Managements', path: GIFT_MANAGEMENT_BASE, isSeparator: false, isActive: false },
    { title: '', path: '', isSeparator: true, isActive: false },
    { title, path: '', isSeparator: false, isActive: true },
  ];

  return (
    <>
      <PageTitle breadcrumbs={breadcrumbs}>Gift Managements</PageTitle>
      <GiftManagementTabBar />
      {children}
    </>
  );
}
