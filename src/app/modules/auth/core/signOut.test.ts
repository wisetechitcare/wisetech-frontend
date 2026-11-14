// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const logoutApi = vi.fn()
vi.mock('@services/auth', () => ({ logout: (...args: unknown[]) => logoutApi(...args) }))

import { signOut } from './signOut'
import { logoutUser } from '@redux/slices/auth'

/**
 * Sign out — the one implementation (/logout and the idle timeout). Above all: it must never strand the user —
 * even when the server call fails, local state is cleared and the browser leaves for the sign-in page.
 */
describe('signOut', () => {
  const realLocation = window.location
  let dispatch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    logoutApi.mockReset()
    dispatch = vi.fn()
    Object.defineProperty(window, 'location', { configurable: true, value: { href: '/dashboard' } })
    localStorage.setItem('wise_tech_login', JSON.stringify({ id: 'u1', token: 'tok' }))
    localStorage.setItem('selectedCompany', 'c1')
    localStorage.setItem('selectedBranch', 'b1')
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: realLocation })
    localStorage.clear()
  })

  const expectSignedOut = () => {
    expect(localStorage.getItem('wise_tech_login')).toBeNull()
    expect(localStorage.getItem('selectedCompany')).toBeNull()
    expect(localStorage.getItem('selectedBranch')).toBeNull()
    expect(dispatch).toHaveBeenCalledWith(logoutUser())
    expect(window.location.href).toBe('/auth')
  }

  it('revokes the session on the server with the stored token, then clears everything and leaves', async () => {
    logoutApi.mockResolvedValue({})
    await signOut(dispatch as never)
    expect(logoutApi).toHaveBeenCalledWith('tok', 'u1')
    expectSignedOut()
  })

  it('still clears everything and leaves when the server call fails', async () => {
    logoutApi.mockRejectedValue(new Error('network down'))
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    await signOut(dispatch as never)
    expectSignedOut()
    error.mockRestore()
  })

  it('works for a cookie session with no token in storage (the server reads the cookie)', async () => {
    localStorage.setItem('wise_tech_login', JSON.stringify({ id: 'u1' }))
    logoutApi.mockResolvedValue({})
    await signOut(dispatch as never)
    expect(logoutApi).toHaveBeenCalledWith(undefined, 'u1')
    expectSignedOut()
  })
})
