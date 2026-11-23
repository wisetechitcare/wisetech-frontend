import type { ReactNode } from 'react'
import { AuthLayout } from '@/ds/patterns/auth-layout'
import { ThemeToggle } from '@/ds/patterns/theme-toggle'
import { useColorMode } from '@app/theme/ColorMode'
import {
  PLATFORM_CONSOLE_BRAND,
  PLATFORM_CONSOLE_HEADLINE,
  PLATFORM_CONSOLE_TAGLINE,
} from './platformCopy'

/** Same Auth Layout recipe as tenant sign-in; brand copy is KAIZNOVA platform. */
export function PlatformAuthScreen({
  title,
  description,
  children,
  footer,
}: {
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  const { mode, toggle } = useColorMode()
  return (
    <AuthLayout
      brandName={PLATFORM_CONSOLE_BRAND}
      logoSrc={null}
      headline={PLATFORM_CONSOLE_HEADLINE}
      tagline={PLATFORM_CONSOLE_TAGLINE}
      title={title}
      description={description}
      footer={footer}
      actions={<ThemeToggle mode={mode} onToggle={toggle} />}
    >
      {children}
    </AuthLayout>
  )
}
