/**
 * Mirror of BE `PLATFORM_CONSOLE_ENABLED`.
 * Unset / anything other than false|0|off|no → console routes available.
 * Set `VITE_PLATFORM_CONSOLE_ENABLED=false` and rebuild to hide `/platform`.
 */
export function isPlatformConsoleEnabled(): boolean {
  const raw = (import.meta.env.VITE_PLATFORM_CONSOLE_ENABLED ?? '').trim().toLowerCase()
  if (raw === '') return true
  return raw !== 'false' && raw !== '0' && raw !== 'off' && raw !== 'no'
}
