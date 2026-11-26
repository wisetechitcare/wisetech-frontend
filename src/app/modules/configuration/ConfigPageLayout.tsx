import React from 'react';
import { KEYFRAMES } from './ConfigDesignSystem';
import { cn } from '@/ds/lib/utils';
import { Badge } from '@/ds/ui/badge';
import { IconSlot, type IconSource } from '@/ds/ui/dynamic-icon';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ds/ui/tabs';

export interface ConfigTab {
  id: string;
  label: string;
  icon: IconSource;
  badge?: number;
}

export interface ConfigBreadcrumb {
  label: string;
  href?: string;
}

/**
 * No title band: the page title already sits in the app header and the module tab strip,
 * so a second navy "X Configuration" banner only pushed the settings down the screen.
 */
export interface ConfigPageLayoutProps {
  breadcrumbs?: ConfigBreadcrumb[];
  tabs?: ConfigTab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  actions?: React.ReactNode;
  statsBar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * The frame around a configuration page: an optional actions row, an optional stats bar, an
 * optional tab bar, and the body.
 *
 * The tab bar WAS eleven hand-built `<button role="tab">`s carrying ~20 inline style properties
 * each, with MUI's `useTheme()` supplying their colours and a hover tracked in React state. It is
 * now the kit's Tabs in its `line` variant, which owns the selected and hover treatments, the
 * keyboard model and the focus ring. The body moved inside a `TabsContent`, so the bar finally
 * has a panel to point at — it used to be a `tablist` whose tabs controlled nothing, which is
 * invalid ARIA however correct it looked.
 *
 * `<style>{KEYFRAMES}</style>` STAYS, for now. It is not MUI, and it is not this file's to drop:
 * `.cfg-fade-in` and the `.cfg-tab-btn` focus rules are injected by ~18 files (Departments.tsx
 * explicitly deleted its own copy because this one was already there), so removing it here would
 * quietly take the fade off pages that rely on this layout for it. Retiring all 18 copies is one
 * job, logged in FUTURE_ENHANCEMENTS.
 */
const ConfigPageLayout: React.FC<ConfigPageLayoutProps> = ({
  tabs,
  activeTab,
  onTabChange,
  actions,
  statsBar,
  children,
  className = '',
}) => {
  const shown = tabs ?? [];
  const hasTabs = shown.length > 0;
  const hasHeader = hasTabs || !!actions || !!statsBar;
  // A controlled bar needs a value even before the page has chosen one.
  const selected = activeTab ?? shown[0]?.id ?? '';

  const header = hasHeader && (
    <div
      className={cn(
        'relative overflow-hidden border border-border bg-card shadow-sm',
        hasTabs ? 'rounded-t-2xl border-b-0' : 'rounded-2xl',
      )}
    >
      {actions && <div className="flex flex-wrap items-center justify-end gap-2 px-8 py-4">{actions}</div>}
      {statsBar && <div className="px-8 py-4">{statsBar}</div>}
      {hasTabs && (
        <TabsList
          variant="line"
          className="h-auto w-full justify-start gap-1 rounded-none border-b-2 border-border px-8 pt-4 pb-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {shown.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="shrink-0 gap-[7px] text-[13.5px] whitespace-nowrap">
              {tab.icon && <IconSlot icon={tab.icon} className="size-4" />}
              {tab.label}
              {tab.badge !== undefined && <Badge variant="neutral">{tab.badge}</Badge>}
            </TabsTrigger>
          ))}
        </TabsList>
      )}
    </div>
  );

  const body = (
    <div
      className={cn(
        'cfg-fade-in cfg-body-wrap',
        hasTabs
          ? 'rounded-b-2xl border border-t-0 border-border bg-card p-8 shadow-sm'
          // With no header above, the body starts flush — the gap was only ever there to
          // separate it from the title band.
          : hasHeader ? 'py-6' : 'pb-6',
      )}
    >
      {children}
    </div>
  );

  return (
    <div className={cn('cfg-layout min-h-screen bg-background', className)}>
      <style>{KEYFRAMES}</style>
      {hasTabs ? (
        <Tabs value={selected} onValueChange={(value) => onTabChange?.(String(value))}>
          {header}
          <TabsContent value={selected}>{body}</TabsContent>
        </Tabs>
      ) : (
        <>
          {header}
          {body}
        </>
      )}
    </div>
  );
};

export default ConfigPageLayout;
