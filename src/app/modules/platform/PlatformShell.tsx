import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Building2, Headset, LogOut, Settings, Users } from 'lucide-react'
import { Button } from '@/ds/ui/button'
import { ThemeToggle } from '@/ds/patterns/theme-toggle'
import { PageHeader } from '@/ds/patterns/page-header'
import { useColorMode } from '@app/theme/ColorMode'
import { cn } from '@/ds/lib/utils'
import { PLATFORM_CONSOLE_BRAND } from './platformCopy'
import { usePlatformSession } from './PlatformSessionContext'

const NAV = [
  { to: '/platform/tenants', label: 'Tenants', icon: Building2, end: false },
  { to: '/platform/support', label: 'Support', icon: Headset, end: false },
  { to: '/platform/settings', label: 'Settings', icon: Settings, end: false },
  { to: '/platform', label: 'Operators', icon: Users, end: true },
] as const

/** Shared chrome for authenticated platform console pages — kit PageHeader + thin nav. */
export function PlatformShell({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
}) {
  const navigate = useNavigate()
  const { user, signOut } = usePlatformSession()
  const { mode, toggle } = useColorMode()

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex w-full max-w-[100rem] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-wrap items-center gap-4 sm:gap-6">
            <p className="heading-case shrink-0 text-xs font-semibold tracking-wide text-foreground">
              {PLATFORM_CONSOLE_BRAND}
            </p>
            <nav className="flex flex-wrap gap-1" aria-label="Platform">
              {NAV.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-foreground shadow-[inset_0_-2px_0_0_var(--color-primary)]'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    )
                  }
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {user ? (
              <span className="hidden max-w-[12rem] truncate text-sm text-muted-foreground sm:inline">
                {user.displayName}
              </span>
            ) : null}
            <ThemeToggle mode={mode} onToggle={toggle} />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                void signOut().then(() => navigate('/platform/login', { replace: true }))
              }}
            >
              <LogOut aria-hidden /> Sign Out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[100rem] flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-8">
        <PageHeader eyebrow={eyebrow} title={title} description={description} actions={actions} />
        {children}
      </main>
    </div>
  )
}
