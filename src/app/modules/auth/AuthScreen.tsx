import { useEffect, useState, type ReactNode } from 'react'
import { AuthLayout } from '@/ds/patterns/auth-layout'
import type { TitleTone } from '@/ds/patterns/auth-layout'
import { ThemeToggle } from '@/ds/patterns/theme-toggle'
import { useColorMode } from '@app/theme/ColorMode'
import { fetchCompanyLogo } from '@services/company'
import { DEFAULT_BRAND, SIGN_IN_HEADLINE, SIGN_IN_TAGLINE } from './signInCopy'

/**
 * The WiseTech lockup (served by this app), shown until the organisation's own logo arrives from the public
 * endpoint — and if that fails. Local on purpose: no S3 round-trip, and one of the old S3 logos has gone 404.
 */
const DEFAULT_LOGO = `${import.meta.env.BASE_URL}media/brand/wisetech-logo.png`

/**
 * The sign-in illustration (the original page's): a 27 KB still paints first; the 3.6 MB GIF loads in the
 * background on desktop only, plays with the headline (4.47s loops) and rests on the still. Its 800px frame
 * carries transparent margins — the crop shows only the drawing.
 */
const ILLUSTRATION = {
  still: `${import.meta.env.BASE_URL}media/login/wtgif-still.webp`,
  animated: `${import.meta.env.BASE_URL}media/login/WTgif.gif`,
  loopMs: 4470,
  crop: { width: 800, height: 800, x: 71, y: 186, w: 658, h: 517 },
}

/** The organisation's name and logo for the sign-in pages (public endpoint); defaults until it answers or if it fails. */
function useAuthBrand() {
  const [brand, setBrand] = useState({ name: DEFAULT_BRAND, logo: DEFAULT_LOGO })
  useEffect(() => {
    let cancelled = false
    fetchCompanyLogo()
      .then((res: { data?: { name?: string; logo?: string } }) => {
        if (cancelled) return
        setBrand((prev) => ({ name: res?.data?.name || prev.name, logo: res?.data?.logo || prev.logo }))
      })
      .catch(() => { /* keep the defaults */ })
    return () => { cancelled = true }
  }, [])
  return brand
}

/**
 * Every sign-in page (Sign In, Forgot / Reset Password, Account Inactive) in one frame: the kit's Auth Layout with
 * the organisation's brand, the product headline and the light/dark switch. Pages pass only their title and form.
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
  const brand = useAuthBrand()
  const { mode, toggle } = useColorMode()
  return (
    <AuthLayout
      brandName={brand.name}
      logoSrc={brand.logo}
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
