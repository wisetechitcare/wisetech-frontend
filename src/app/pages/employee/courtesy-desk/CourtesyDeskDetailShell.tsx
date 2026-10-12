import { PageTitle } from '@metronic/layout/core';
import type { ReactNode } from 'react';

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
    { title: 'Courtesy Desk', path: '/courtesy-desk', isSeparator: false, isActive: false },
    { title: '', path: '', isSeparator: true, isActive: false },
    { title, path: '', isSeparator: false, isActive: true },
  ];

  return (
    <>
      <PageTitle breadcrumbs={breadcrumbs}>{title}</PageTitle>
      {children}
    </>
  );
}
