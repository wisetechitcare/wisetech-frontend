/**
 * Host-based split between tenant HRMS and KAIZNOVA platform console.
 *
 * Unset `VITE_PLATFORM_HOST` → combined (dev / pre-cutover): `/auth` and `/platform` on any host.
 * Set to `platform.kaiznova.com` in the Amplify build → that hostname is ops-only; all other
 * hostnames are tenant-only (block `/platform`).
 *
 * Cross-host deep links (view-as, End Session, invites) use optional absolute origins:
 *   VITE_TENANT_APP_ORIGIN=https://app.kaiznova.com
 *   VITE_PLATFORM_APP_ORIGIN=https://platform.kaiznova.com
 *
 * Runbook: summary/plans/2026-11-16-kaiznova-domain-cutover-runbook.md § Phase 4
 */

export type AppHostMode = 'combined' | 'platform' | 'tenant'

function trimHost(value: string): string {
  return value.trim().toLowerCase().replace(/\.$/, '')
}

/** Build-time platform-only hostname (no scheme). Empty → combined mode. */
export function configuredPlatformHost(): string {
  return trimHost(import.meta.env.VITE_PLATFORM_HOST ?? '')
}

export function resolveAppHostMode(
  hostname: string = typeof window !== 'undefined' ? window.location.hostname : '',
): AppHostMode {
  const platformHost = configuredPlatformHost()
  if (!platformHost) return 'combined'
  return trimHost(hostname) === platformHost ? 'platform' : 'tenant'
}

function originEnv(raw: string | undefined): string {
  return (raw ?? '').trim().replace(/\/+$/, '')
}

function withPath(origin: string, path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return origin ? `${origin}${p}` : p
}

/** Tenant HRMS URL — absolute when leaving the platform host (view-as). */
export function tenantAppHref(path: string = '/dashboard'): string {
  const origin = originEnv(import.meta.env.VITE_TENANT_APP_ORIGIN)
  if (resolveAppHostMode() === 'platform' && origin) return withPath(origin, path)
  return path.startsWith('/') ? path : `/${path}`
}

/** Platform console URL — absolute when leaving the tenant host (end support session). */
export function platformConsoleHref(path: string = '/platform'): string {
  const origin = originEnv(import.meta.env.VITE_PLATFORM_APP_ORIGIN)
  if (resolveAppHostMode() === 'tenant' && origin) return withPath(origin, path)
  return path.startsWith('/') ? path : `/${path}`
}
