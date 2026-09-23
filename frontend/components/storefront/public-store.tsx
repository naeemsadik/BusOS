'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ProductGrid, StorefrontRenderer } from './storefront-renderer'
import { storefrontService } from '@/lib/storefront-service'
import type { Locale, StorefrontProduct, StorefrontReceipt, StorefrontSite } from '@/lib/storefront-types'

type StoredLine = { productId: string; quantity: number }
type CartLine = StoredLine & { product?: StorefrontProduct }
const cartKey = (slug: string) => `busos-cart:${slug}`
const baseFor = (locale: Locale) => locale === 'bn' ? '/bn' : ''

export function PublicStore({ site, products, product, locale, path }: { site: StorefrontSite; products: StorefrontProduct[]; product?: StorefrontProduct; locale: Locale; path: string[] }) {
  const router = useRouter(); const base = baseFor(locale); const page = path[0] || 'home'
  const [cart, setCart] = useState<CartLine[]>([])
  useEffect(() => {
    let stored: StoredLine[] = []; try { stored = JSON.parse(localStorage.getItem(cartKey(site.slug)) || '[]') } catch { /* empty */ }
    stored = stored.filter(line => typeof line.productId === 'string' && Number.isInteger(line.quantity) && line.quantity > 0 && line.quantity <= 100).slice(0, 50)
    Promise.all(stored.map(async line => {
      try {
        return { ...line, product: await storefrontService.product(site.slug, line.productId) }
      } catch {
        return null
      }
    })).then(lines => setCart(lines.filter(Boolean) as CartLine[]))
  }, [site.slug])
  const save = (next: CartLine[]) => { setCart(next); localStorage.setItem(cartKey(site.slug), JSON.stringify(next.map(({ productId, quantity }) => ({ productId, quantity })))) }
  const add = (item: StorefrontProduct) => { const existing = cart.find(line => line.productId === item.id); save(existing ? cart.map(line => line.productId === item.id ? { ...line, quantity: Math.min(100, line.quantity + 1) } : line) : [...cart, { productId: item.id, quantity: 1, product: item }]); router.push(`${base}/cart`) }
  if (page === 'home') return <StorefrontRenderer site={site} document={site.document!} products={products} locale={locale} />
  return <Shell site={site} locale={locale} count={cart.reduce((sum, line) => sum + line.quantity, 0)}>
    {page === 'catalog' && <ProductGrid title={locale === 'bn' ? 'সব পণ্য' : 'All products'} products={products} base={base} locale={locale} />}
    {page === 'product' && product && <ProductView product={product} locale={locale} add={() => add(product)} />}
    {page === 'cart' && <CartView cart={cart} save={save} base={base} locale={locale} />}
    {page === 'checkout' && <Checkout site={site} cart={cart} locale={locale} base={base} clear={() => save([])} />}
    {page === 'confirmation' && <Confirmation site={site} locale={locale} />}
  </Shell>
}

function Shell({ site, locale, count, children }: { site: StorefrontSite; locale: Locale; count: number; children: React.ReactNode }) { const base = baseFor(locale); return <div className="min-h-screen bg-white text-slate-950"><header className="flex items-center justify-between border-b px-5 py-4"><Link href={base || '/'} className="text-xl font-bold text-teal-700">{site.name || site.slug}</Link><nav aria-label="Store navigation" className="flex gap-4 text-sm"><Link href={`${base}/catalog`}>{locale === 'bn' ? 'পণ্য' : 'Catalog'}</Link><Link href={`${base}/cart`}>{locale === 'bn' ? 'কার্ট' : 'Cart'} ({count})</Link>{site.enabledLocales.includes('bn') && <Link href={locale === 'en' ? '/bn' : '/'}>{locale === 'en' ? 'বাংলা' : 'English'}</Link>}</nav></header>{children}</div> }
function ProductView({ product, locale, add }: { product: StorefrontProduct; locale: Locale; add: () => void }) { return <div className="mx-auto grid max-w-5xl gap-8 px-6 py-12 md:grid-cols-2"><div className="aspect-square bg-slate-100">{product.image && <img src={product.image} alt={(locale === 'bn' && product.imageAltTextBn) || product.imageAltText || product.name} className="h-full w-full object-cover" />}</div><div><p className="text-sm text-slate-500">{product.category}</p><h1 className="mt-2 text-4xl font-black">{(locale === 'bn' && product.nameBn) || product.name}</h1><p className="mt-4 text-2xl font-bold text-teal-700">৳{product.price.toFixed(2)}</p><p className="mt-5 whitespace-pre-line text-slate-600">{(locale === 'bn' && (product.longDescriptionBn || product.descriptionBn)) || product.longDescription || product.description}</p><button disabled={!product.available} onClick={add} className="mt-7 rounded-lg bg-teal-700 px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{product.available ? (locale === 'bn' ? 'কার্টে যোগ করুন' : 'Add to cart') : (locale === 'bn' ? 'স্টক নেই' : 'Unavailable')}</button></div></div> }
function CartView({ cart, save, base, locale }: { cart: CartLine[]; save: (cart: CartLine[]) => void; base: string; locale: Locale }) { const total = useMemo(() => cart.reduce((sum, line) => sum + (line.product?.price || 0) * line.quantity, 0), [cart]); return <div className="mx-auto max-w-3xl px-6 py-12"><h1 className="text-3xl font-black">{locale === 'bn' ? 'আপনার কার্ট' : 'Your cart'}</h1>{!cart.length ? <p className="mt-8 text-slate-500">{locale === 'bn' ? 'কার্ট খালি।' : 'Your cart is empty.'}</p> : <><div className="mt-8 divide-y">{cart.map(line => <div key={line.productId} className="flex items-center justify-between py-4"><div><p className="font-semibold">{line.product?.name}</p><p className="text-sm text-slate-500">৳{line.product?.price.toFixed(2)}</p></div><div className="flex items-center gap-3"><button aria-label="Decrease quantity" onClick={() => save(line.quantity === 1 ? cart.filter(item => item.productId !== line.productId) : cart.map(item => item.productId === line.productId ? { ...item, quantity: item.quantity - 1 } : item))} className="h-9 w-9 border">−</button><span>{line.quantity}</span><button aria-label="Increase quantity" onClick={() => save(cart.map(item => item.productId === line.productId ? { ...item, quantity: Math.min(100, item.quantity + 1) } : item))} className="h-9 w-9 border">+</button></div></div>)}</div><div className="mt-6 flex justify-between text-xl font-bold"><span>Total</span><span>৳{total.toFixed(2)}</span></div><Link href={`${base}/checkout`} className="mt-8 block rounded-lg bg-teal-700 px-5 py-3 text-center font-semibold text-white">{locale === 'bn' ? 'চেকআউট' : 'Checkout'}</Link></>}</div> }
function Checkout({ site, cart, locale, base, clear }: { site: StorefrontSite; cart: CartLine[]; locale: Locale; base: string; clear: () => void }) {
  const router = useRouter(); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (submitting) return; setSubmitting(true); setError(''); const form = new FormData(event.currentTarget); const keyName = `busos-checkout:${site.slug}`; let key = sessionStorage.getItem(keyName); if (!key) { key = crypto.randomUUID(); sessionStorage.setItem(keyName, key) } try { const receipt = await storefrontService.order(site.slug, { customerName: form.get('name'), customerPhone: form.get('phone'), customerEmail: form.get('email') || undefined, shippingAddress: form.get('address'), shippingCity: form.get('city') || undefined, notes: form.get('notes') || undefined, locale, items: cart.map(line => ({ productId: line.productId, quantity: line.quantity })) }, key); clear(); sessionStorage.removeItem(keyName); router.push(`${base}/confirmation?token=${encodeURIComponent(receipt.confirmationToken || '')}`) } catch (exception: any) { setError(exception.response?.data?.message || 'Could not place your order') } finally { setSubmitting(false) } }
  if (!cart.length) return <div className="p-12 text-center">Your cart is empty.</div>
  return <form onSubmit={submit} className="mx-auto max-w-xl space-y-5 px-6 py-12"><h1 className="text-3xl font-black">{locale === 'bn' ? 'চেকআউট' : 'Checkout'}</h1>{error && <p role="alert" className="rounded bg-red-50 p-3 text-red-800">{error}</p>}<Field name="name" label="Name" required /><Field name="phone" label="Phone" required /><Field name="email" label="Email" type="email" /><Field name="address" label="Delivery address" required /><Field name="city" label="City" /><label className="block text-sm font-medium">Notes<textarea name="notes" maxLength={500} className="mt-1 min-h-24 w-full rounded border p-3" /></label><p className="text-sm text-slate-500">Cash on delivery · Delivery ৳{site.orderSettings.deliveryFee.toFixed(2)}</p><button disabled={submitting} className="w-full rounded-lg bg-teal-700 px-5 py-3 font-semibold text-white disabled:opacity-50">{submitting ? 'Placing order…' : 'Place order'}</button></form>
}
function Confirmation({ site, locale }: { site: StorefrontSite; locale: Locale }) { const token = useSearchParams().get('token'); const [receipt, setReceipt] = useState<StorefrontReceipt | null>(); useEffect(() => { if (!token) { setReceipt(null); return } storefrontService.confirmation(site.slug, token).then(setReceipt).catch(() => setReceipt(null)) }, [site.slug, token]); if (receipt === undefined) return <div className="p-12 text-center">Loading…</div>; if (!receipt) return <div className="p-12 text-center">Confirmation not found or expired.</div>; return <div className="mx-auto max-w-xl px-6 py-24 text-center"><h1 className="text-4xl font-black">{locale === 'bn' ? 'অর্ডার গ্রহণ করা হয়েছে' : 'Order received'}</h1><p className="mt-4 text-slate-600">{locale === 'bn' ? 'নিশ্চিত করার জন্য আমরা শীঘ্রই যোগাযোগ করব।' : 'We will contact you shortly to confirm your order.'}</p><p className="mt-4 font-mono">{receipt.orderNumber}</p><p className="mt-2 text-xl font-bold">৳{receipt.total.toFixed(2)}</p></div> }
function Field({ name, label, type = 'text', required = false }: { name: string; label: string; type?: string; required?: boolean }) { return <label className="block text-sm font-medium">{label}<input name={name} type={type} required={required} maxLength={255} className="mt-1 h-11 w-full rounded border px-3" /></label> }
