import { revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  if (!process.env.STOREFRONT_REVALIDATE_SECRET || request.headers.get('x-revalidate-secret') !== process.env.STOREFRONT_REVALIDATE_SECRET) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null); const slug = body?.slug
  if (typeof slug !== 'string' || !/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/.test(slug)) return NextResponse.json({ message: 'Invalid slug' }, { status: 400 })
  revalidateTag(`storefront:${slug}`)
  return NextResponse.json({ revalidated: true })
}
