import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Tabs as KitTabs, TabsList, TabsTrigger } from '@/ds/ui/tabs';

/** Sibling pages under Company: the kit Tabs (`line`), one tab per route. The route IS the selection. */
const PAGES = [
  { path: '/company/organization-profile', label: 'Organization Profile' },
  { path: '/company/branding', label: 'Branding' },
];

const Tabs: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const current = PAGES.find((p) => p.path === location.pathname)?.path ?? null;

  return (
    <KitTabs value={current} onValueChange={(path) => navigate(String(path))}>
      <TabsList variant="line" aria-label="Company pages" className="max-w-full overflow-x-auto">
        {PAGES.map((p) => (
          <TabsTrigger key={p.path} value={p.path}>{p.label}</TabsTrigger>
        ))}
      </TabsList>
    </KitTabs>
  );
};

export default Tabs;
