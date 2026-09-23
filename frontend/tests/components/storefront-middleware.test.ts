import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'
import { middleware } from '@/middleware'

describe('storefront subdomain middleware', () => {
  it('allows backend asset requests to continue to the configured proxy', async () => {
    const request = new NextRequest('http://rudra.localhost:3000/backend-api/storefront/assets/public/asset-id', {
      headers: { host: 'rudra.localhost:3000' },
    })
    const response = await middleware(request)
    expect(response.status).toBe(200)
    expect(response.headers.get('x-middleware-next')).toBe('1')
  })

  it('rewrites storefront pages to their slug route', async () => {
    const request = new NextRequest('http://rudra.localhost:3000/catalog', {
      headers: { host: 'rudra.localhost:3000' },
    })
    const response = await middleware(request)
    expect(response.headers.get('x-middleware-rewrite')).toContain('/store/rudra/catalog')
  })
})
