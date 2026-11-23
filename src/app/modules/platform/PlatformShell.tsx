import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Building2, Headset, LogOut, Users } from 'lucide-react'
import { Button } from '@/ds/ui/button'
import { ThemeToggle } from '@/ds/patterns/theme-toggle'
import { useColorMode } from '@app/theme/ColorMode'
import { cn } from '@/ds/lib/utils'
import { PLATFORM_CONSOLE_BRAND } from './platformCopy'
import { usePlatformSession } from './PlatformSessionContext'

const NAV = [
  { to: '/platform/tenants', label: 'Tenants', icon: Building2, end: false },
  { to: '/platform/support', label: 'Support', icon: Headset, end: false },
  { to: '/platform', label: 'Operators', icon: Users, end: true },
] as const

/** Shared chrome for authenticated platform console pages. */
export function PlatformShell({
  title,
  description,
  actions,
  children,
}: {
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
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="heading-case text-xs font-medium text-muted-foreground">{PLATFORM_CONSOLE_BRAND}</p>
            <nav className="mt-2 flex flex-wrap gap-1" aria-label="Platform">
              {NAV.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    )
                  }
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {user ? (
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {user.displayName}
              </span>
            ) : null}
            <ThemeToggle mode={mode} onToggle={toggle} />
            {actions}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void signOut().then(() => navigate('/platform/login', { replace: true }))
              }}
            >
              <LogOut aria-hidden /> Sign Out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-1">
          <h1 className="heading-case text-2xl text-foreground">{title}</h1>
          {description ? <p className="max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {children}
      </main>
    </div>
  )
}
