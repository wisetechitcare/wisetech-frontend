import { useEffect, useState, type ReactNode } from 'react'
import { AuthLayout } from '@/ds/patterns/auth-layout'
import { ThemeToggle } from '@/ds/patterns/theme-toggle'
import { useColorMode } from '@app/theme/ColorMode'
import { fetchCompanyLogo } from '@services/company'
import { DEFAULT_BRAND, SIGN_IN_HEADLINE, SIGN_IN_TAGLINE } from './signInCopy'

/**
 * The WiseTech emblem (the PWA icon, served by this app), shown until the organisation's own logo arrives from the
 * public endpoint — and if that fails. Local on purpose: both S3 defaults the old pages used have gone 404.
 */
const DEFAULT_LOGO = `${import.meta.env.BASE_URL}icons/pwa-512.png`

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
  description,
  children,
  footer,
}: {
  title: ReactNode
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
      description={description}
      footer={footer}
      actions={<ThemeToggle mode={mode} onToggle={toggle} />}
    >
      {children}
    </AuthLayout>
  )
}
