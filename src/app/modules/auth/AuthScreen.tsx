import type { ReactNode } from 'react'
import { AuthLayout } from '@/ds/patterns/auth-layout'
import type { TitleTone } from '@/ds/patterns/auth-layout'
import { ThemeToggle } from '@/ds/patterns/theme-toggle'
import { useColorMode } from '@app/theme/ColorMode'
import { PLATFORM_BRAND, SIGN_IN_HEADLINE, SIGN_IN_TAGLINE } from './signInCopy'

/**
 * The KAIZNOVA logo file, once supplied (drop it in public/media/brand/ and point this at it). Until then the
 * Auth Layout shows the brand's initials — its designed no-logo state (Auth Layout story "Broken Logo").
 */
const PLATFORM_LOGO: string | null = null

/**
 * The sign-in illustration (the original page's): a 27 KB still paints first; the 3.6 MB GIF loads in the
 * background on desktop only and loops while the page is open (user decision 2026-11-16). Its 800px frame
 * carries transparent margins — the crop shows only the drawing.
 */
const ILLUSTRATION = {
  still: `${import.meta.env.BASE_URL}media/login/wtgif-still.webp`,
  animated: `${import.meta.env.BASE_URL}media/login/WTgif.gif`,
  loopMs: 4470,
  crop: { width: 800, height: 800, x: 71, y: 186, w: 658, h: 517 },
}

/**
 * Every sign-in page (Sign In, Forgot / Reset Password, Account Inactive) in one frame: the kit's Auth Layout with
 * the platform brand, the product headline and the light/dark switch. Pages pass only their title and form.
 */
export function AuthScreen({
  title,
  titleTone,
  description,
  children,
  footer,
}: {
  title: ReactNode
  /** The title's colour (default: the brand blue). */
  titleTone?: TitleTone
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  const { mode, toggle } = useColorMode()
  return (
    <AuthLayout
      brandName={PLATFORM_BRAND}
      logoSrc={PLATFORM_LOGO}
      headline={SIGN_IN_HEADLINE}
      tagline={SIGN_IN_TAGLINE}
      title={title}
      titleTone={titleTone}
      description={description}
      footer={footer}
      actions={<ThemeToggle mode={mode} onToggle={toggle} />}
      illustration={ILLUSTRATION}
    >
      {children}
    </AuthLayout>
  )
}
