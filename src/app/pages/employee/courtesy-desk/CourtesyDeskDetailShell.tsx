import { PageTitle } from '@metronic/layout/core';
import { useEffect, type ReactNode } from 'react';
import { bootstrapCourtesyDeskFromApi } from './store/courtesyDeskStore';
import GiftManagementTabBar from './GiftManagementTabBar';
import { GIFT_MANAGEMENT_BASE } from './giftPaths';

export default function CourtesyDeskDetailShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    void bootstrapCourtesyDeskFromApi();
  }, []);

  const breadcrumbs = [
    { title: 'Home', path: '/dashboard', isSeparator: false, isActive: false },
    { title: '', path: '', isSeparator: true, isActive: false },
    { title: 'CRM', path: '/workspace/crm', isSeparator: false, isActive: false },
    { title: '', path: '', isSeparator: true, isActive: false },
    { title: 'Gift Managements', path: GIFT_MANAGEMENT_BASE, isSeparator: false, isActive: false },
    { title: '', path: '', isSeparator: true, isActive: false },
  ];

  return (
    <>
      <PageTitle breadcrumbs={breadcrumbs}>{title}</PageTitle>
      <GiftManagementTabBar />
      {children}
    </>
  );
}
