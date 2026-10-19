import { PageTitle } from '@metronic/layout/core';
import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import SensitiveDataProvider, {
  SensitiveDataHeaderToggle,
} from '@app/modules/common/components/SensitiveData';
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
  const location = useLocation();
  // Drive detail shows amounts; people-group editor does not.
  const eyeOn =
    location.pathname.includes('/drives/') ||
    location.pathname.includes('/gift-runs/');

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
      <SensitiveDataProvider disabled={!eyeOn}>
        <GiftManagementTabBar
          headerAction={eyeOn ? <SensitiveDataHeaderToggle /> : undefined}
        />
        {children}
      </SensitiveDataProvider>
    </>
  );
}
