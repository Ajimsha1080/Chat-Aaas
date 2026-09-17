import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APIClient } from '../api/apiClient'

describe('Authentication & Signup API Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    APIClient.setAuth(null, '')
    APIClient.setAdminAuth(null)
  })

  it('successfully authenticates with valid credentials and sets token', async () => {
    const mockResponse = {
      status: 200,
      token: 'jwt-test-access-token',
      refreshToken: 'jwt-test-refresh-token',
      companyId: 'comp-test-auth',
      role: 'owner'
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    } as any)

    const res = await APIClient.login('user@company.com', 'SecurePass123!')
    expect(res).toBeDefined()
    expect(res.token).toBe('jwt-test-access-token')
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/auth/login'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'user@company.com', password: 'SecurePass123!' })
      })
    )
  })

  it('handles invalid password / locked account errors gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Invalid email or password.' })
    } as any)

    await expect(APIClient.login('user@company.com', 'WrongPassword')).rejects.toThrow(
      'Invalid email or password.'
    )
  })

  it('sets admin token when logging in as super_admin role', async () => {
    const mockAdminResponse = {
      status: 200,
      token: 'admin-jwt-super-secret',
      companyId: 'comp-platform',
      role: 'super_admin'
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockAdminResponse
    } as any)

    const res = await APIClient.login('admin@chataaas.internal', 'SuperAdmin123!')
    expect(res.role).toBe('super_admin')
    expect(res.token).toBe('admin-jwt-super-secret')
  })
})