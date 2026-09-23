import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PublicStore } from '@/components/storefront/public-store'
import { localize, type Locale } from '@/lib/storefront-types'
import { StorefrontApiError, storefrontServer } from '@/lib/storefront-server'

type Props = { params: Promise<{ slug: string; path?: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> }
const allowed = new Set(['home', 'catalog', 'product', 'cart', 'checkout', 'confirmation'])
async function load(params: { slug: string; path?: string[] }, search: Record<string, string | string[] | undefined> = {}) {
  const raw = params.path || []; const locale: Locale = raw[0] === 'bn' ? 'bn' : 'en'; const path = locale === 'bn' ? raw.slice(1) : raw; const page = path[0] || 'home'
  if (!allowed.has(page) || (page === 'product' && !path[1]) || path.length > (page === 'product' ? 2 : 1)) notFound()
  const site = await storefrontServer.site(params.slug); if (locale === 'bn' && !site.enabledLocales.includes('bn')) notFound()
  let products: any[] = []; let product
  if (page === 'home') {
    const productSection = site.document?.sections.find(section => section.visible && section.type === 'productGrid')
    const query = new URLSearchParams({ limit: String(productSection?.content.productLimit || 24), sort: productSection?.content.productSort || 'newest' })
    products = (await storefrontServer.products(params.slug, `?${query}`)).data
  }
  if (page === 'catalog') { const query = new URLSearchParams({ page: String(search.page || 1), limit: '24', ...(typeof search.category === 'string' ? { category: search.category } : {}), ...(typeof search.search === 'string' ? { search: search.search } : {}) }); products = (await storefrontServer.products(params.slug, `?${query}`)).data }
  if (page === 'product') product = await storefrontServer.product(params.slug, path[1])
  return { site, products, product, locale, path }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try { const values = await params; const { site, locale, product } = await load(values); const root = process.env.NEXT_PUBLIC_STOREFRONT_ROOT_DOMAIN || 'localhost:3000'; const protocol = root.includes('localhost') ? 'http' : 'https'; const origin = `${protocol}://${site.slug}.${root}`; const suffix = locale === 'bn' ? '/bn' : ''; const title = product ? ((locale === 'bn' && product.nameBn) || product.name) : localize(site.seoSettings.title, locale) || site.name || site.slug; const description = product ? ((locale === 'bn' && product.descriptionBn) || product.description) : localize(site.seoSettings.description, locale); return { title, description, alternates: { canonical: `${origin}${suffix}`, languages: { en: origin, ...(site.enabledLocales.includes('bn') ? { bn: `${origin}/bn` } : {}) } }, openGraph: { title, description, images: site.seoSettings.socialImageUrl ? [site.seoSettings.socialImageUrl] : [] } } } catch { return { title: 'Store unavailable', robots: { index: false, follow: false } } }
}

export default async function StorePage({ params, searchParams }: Props) {
  try { const data = await load(await params, await searchParams); const structured = data.product ? { '@context': 'https://schema.org', '@type': 'Product', name: (data.locale === 'bn' && data.product.nameBn) || data.product.name, image: data.product.image, description: (data.locale === 'bn' && data.product.descriptionBn) || data.product.description, offers: { '@type': 'Offer', priceCurrency: 'BDT', price: data.product.price, availability: data.product.available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' } } : null; return <>{structured && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, '\\u003c') }} />}<PublicStore {...data} /></> }
  catch (error) { if (error instanceof StorefrontApiError && error.status === 503) { const brand = error.payload?.storefront; return <main className="grid min-h-screen place-content-center bg-slate-50 p-6 text-center"><h1 className="text-4xl font-black">{brand?.name || 'Store unavailable'}</h1><p className="mt-4 text-slate-600">This store is temporarily unavailable. Please try again later.</p></main> } notFound() }
}
