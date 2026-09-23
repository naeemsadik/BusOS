'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Eye, EyeOff, ImageIcon, Loader2, Plus, Save, Send, Trash2, Upload } from 'lucide-react'
import { StorefrontRenderer } from '@/components/storefront/storefront-renderer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { inventoryService } from '@/lib/inventory-service'
import { storefrontService } from '@/lib/storefront-service'
import type { Locale, SectionType, StorefrontAsset, StorefrontDocument, StorefrontProduct, StorefrontSection, StorefrontSite } from '@/lib/storefront-types'

const names: Record<SectionType, string> = { announcement: 'Announcement', hero: 'Hero', categoryNavigation: 'Category navigation', productGrid: 'Product grid', promotionalBanner: 'Promotional banner', imageText: 'Image & text', contactHours: 'Contact & hours' }
const createSection = (type: SectionType): StorefrontSection => ({ id: `${type}-${crypto.randomUUID()}`, type, visible: true, content: { title: { en: names[type] }, body: { en: '' }, ...(type === 'productGrid' ? { productLimit: 8, productSort: 'newest' as const } : {}), ...(type === 'categoryNavigation' ? { categories: [] } : {}) } })

export function WebsiteBuilder() {
  const { toast } = useToast()
  const [site, setSite] = useState<StorefrontSite | null | undefined>()
  const [document, setDocument] = useState<StorefrontDocument | null>(null)
  const [assets, setAssets] = useState<StorefrontAsset[]>([])
  const [products, setProducts] = useState<StorefrontProduct[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [locale, setLocale] = useState<Locale>('en')
  const [viewport, setViewport] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')
  const [slug, setSlug] = useState('')
  const [busy, setBusy] = useState<'save' | 'publish' | null>(null)
  const [dirty, setDirty] = useState(false)
  const [conflict, setConflict] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      storefrontService.getCms(),
      storefrontService.assets().catch(() => []),
      inventoryService.getProducts({ status: 'active', limit: 100, sortBy: 'createdAt', sortOrder: 'DESC' }).catch(() => null),
    ]).then(([value, media, inventory]) => {
      setSite(value)
      setDocument(value?.draftDocument || null)
      setAssets(media)
      setProducts((inventory?.data || []).filter(product => product.storefrontVisible !== false).map(product => ({
        id: product.id, slug: product.slug || product.id, name: product.name, nameBn: product.nameBn,
        description: product.description, descriptionBn: product.descriptionBn,
        longDescription: product.longDescription, longDescriptionBn: product.longDescriptionBn,
        category: product.category, price: Number(product.price), image: product.image,
        imageAltText: product.imageAltText, imageAltTextBn: product.imageAltTextBn,
        available: !product.trackStock || product.allowBackorder || product.stock > 0,
        createdAt: product.createdAt,
      })))
    }).catch(() => setSite(null))
  }, [])
  useEffect(() => { const handler = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault() }; window.addEventListener('beforeunload', handler); return () => window.removeEventListener('beforeunload', handler) }, [dirty])
  const section = document?.sections.find(item => item.id === selected)
  const previewSite = useMemo(() => site ? { ...site, name: site.name || site.slug } : null, [site])
  const changeSite = (next: StorefrontSite) => { setSite(next); setDirty(true) }
  const changeDocument = (next: StorefrontDocument) => { setDocument(next); setDirty(true); setConflict(null) }

  async function setup() {
    try { const check = await storefrontService.slugAvailability(slug); if (!check.available) throw new Error('That address is already reserved'); const created = await storefrontService.create(slug); setSite(created); setDocument(created.draftDocument!); toast({ title: 'Storefront reserved' }) }
    catch (error: any) { toast({ title: 'Could not reserve address', description: error.response?.data?.message || error.message, variant: 'destructive' }) }
  }
  async function save() {
    if (!site || !document) return null; setBusy('save'); setConflict(null)
    try { const saved = await storefrontService.save(site, document); setSite(saved); setDirty(false); toast({ title: 'Draft saved' }); return saved }
    catch (error: any) { const message = error.response?.status === 409 ? 'Another session changed this draft. Reload before overwriting it.' : error.response?.data?.message || 'Could not save the draft'; setConflict(message); toast({ title: 'Save failed', description: message, variant: 'destructive' }); return null }
    finally { setBusy(null) }
  }
  async function publish() {
    setBusy('publish'); setConflict(null)
    try { if (dirty && !(await save())) return; const published = await storefrontService.publish(); setSite(published); toast({ title: 'Storefront published', description: 'Your public website is now available.' }) }
    catch (error: any) { const message = error.response?.data?.message || error.message || 'Could not publish the storefront'; setConflict(message); toast({ title: 'Publish failed', description: message, variant: 'destructive' }) } finally { setBusy(null) }
  }
  function updateSection(change: (value: StorefrontSection) => StorefrontSection) { if (!document || !section) return; changeDocument({ ...document, sections: document.sections.map(item => item.id === section.id ? change(item) : item) }) }
  function move(index: number, offset: number) { if (!document) return; const target = index + offset; if (target < 0 || target >= document.sections.length) return; const sections = [...document.sections]; [sections[index], sections[target]] = [sections[target], sections[index]]; changeDocument({ ...document, sections }) }

  if (site === undefined) return <div className="grid min-h-96 place-content-center"><Loader2 className="animate-spin" aria-label="Loading website builder" /></div>
  if (!site) return <Setup slug={slug} setSlug={setSlug} setup={setup} />
  if (!document || !previewSite) return null
  return <div className="space-y-5 pb-10">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-bold">Website builder</h1><p className="text-sm text-muted-foreground">{site.slug} · {dirty ? 'Unsaved changes' : site.status === 'published' ? 'Published' : 'Draft'}</p>{conflict && <p role="alert" className="text-sm text-destructive">{conflict}</p>}</div><div className="flex gap-2">{site.status === 'published' && <Button asChild variant="outline"><a href={`/store/${site.slug}`} target="_blank" rel="noreferrer">View site</a></Button>}<Button variant="outline" onClick={save} disabled={!dirty || !!busy}><Save className="mr-2 h-4 w-4" />Save draft</Button><Button onClick={publish} disabled={!!busy}><Send className="mr-2 h-4 w-4" />Publish</Button></div></div>
    <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_340px]">
      <Card><CardHeader><CardTitle className="text-lg">Sections</CardTitle></CardHeader><CardContent className="space-y-3"><Button type="button" variant={selected === null ? 'default' : 'outline'} className="w-full" onClick={() => setSelected(null)}>Store settings</Button><Select onValueChange={value => { const next = createSection(value as SectionType); changeDocument({ ...document, sections: [...document.sections, next] }); setSelected(next.id) }}><SelectTrigger><SelectValue placeholder="Add a section" /></SelectTrigger><SelectContent>{Object.entries(names).map(([type, name]) => <SelectItem key={type} value={type}>{name}</SelectItem>)}</SelectContent></Select>{document.sections.map((item, index) => <div key={item.id} draggable onDragStart={event => event.dataTransfer.setData('index', String(index))} onDragOver={event => event.preventDefault()} onDrop={event => { const from = Number(event.dataTransfer.getData('index')); if (Number.isInteger(from)) move(from, index - from) }} className={`flex items-center gap-1 rounded border p-2 ${selected === item.id ? 'border-primary bg-primary/5' : ''}`}><button className="flex-1 truncate text-left text-sm" onClick={() => setSelected(item.id)}>{names[item.type]}</button><Button size="icon" variant="ghost" aria-label="Move section up" disabled={!index} onClick={() => move(index, -1)}><ArrowUp className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label="Move section down" disabled={index === document.sections.length - 1} onClick={() => move(index, 1)}><ArrowDown className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label={item.visible ? 'Hide section' : 'Show section'} onClick={() => { setSelected(item.id); updateSection(value => ({ ...value, visible: !value.visible })) }}>{item.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</Button></div>)}</CardContent></Card>
      <div><div className="mb-3 flex justify-center gap-2">{(['mobile', 'tablet', 'desktop'] as const).map((item, index) => <Button key={item} size="sm" variant={viewport === item ? 'default' : 'outline'} onClick={() => setViewport(item)}>{[360, 768, 1440][index]}</Button>)}</div><div className={`mx-auto overflow-hidden rounded-xl border bg-white shadow-sm ${viewport === 'mobile' ? 'max-w-[360px]' : viewport === 'tablet' ? 'max-w-[768px]' : 'max-w-full'}`}><StorefrontRenderer site={previewSite} document={document} products={products} locale={locale} preview /></div></div>
      <Card><CardHeader><CardTitle className="text-lg">{section ? `Edit ${names[section.type]}` : 'Theme & settings'}</CardTitle></CardHeader><CardContent>{section ? <SectionEditor section={section} locale={locale} setLocale={setLocale} assets={assets} update={updateSection} remove={() => { changeDocument({ ...document, sections: document.sections.filter(item => item.id !== section.id) }); setSelected(null) }} /> : <Settings site={site} change={changeSite} assets={assets} setAssets={setAssets} />}</CardContent></Card>
    </div>
  </div>
}

function Setup({ slug, setSlug, setup }: { slug: string; setSlug: (value: string) => void; setup: () => void }) { return <Card className="mx-auto mt-12 max-w-xl"><CardHeader><CardTitle>Reserve your storefront address</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">Use 3–63 lowercase letters, numbers, and hyphens. The address is permanent.</p><div className="flex items-center gap-2"><Input value={slug} onChange={event => setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} /><span>.{process.env.NEXT_PUBLIC_STOREFRONT_ROOT_DOMAIN || 'localhost'}</span></div><Button onClick={setup} disabled={!/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/.test(slug)}>Reserve address</Button></CardContent></Card> }

function SectionEditor({ section, locale, setLocale, assets, update, remove }: { section: StorefrontSection; locale: Locale; setLocale: (value: Locale) => void; assets: StorefrontAsset[]; update: (change: (value: StorefrontSection) => StorefrontSection) => void; remove: () => void }) {
  const content = section.content; const field = (key: 'title' | 'body' | 'ctaLabel' | 'imageAlt' | 'hours', value: string) => update(item => ({ ...item, content: { ...item.content, [key]: { en: item.content[key]?.en || '', ...item.content[key], [locale]: value } } }))
  return <div className="space-y-4"><div className="flex gap-2"><Button size="sm" variant={locale === 'en' ? 'default' : 'outline'} onClick={() => setLocale('en')}>English</Button><Button size="sm" variant={locale === 'bn' ? 'default' : 'outline'} onClick={() => setLocale('bn')}>বাংলা</Button></div><Label>Title<Input value={content.title?.[locale] || ''} onChange={event => field('title', event.target.value)} /></Label><Label>Body<Textarea rows={5} value={content.body?.[locale] || ''} onChange={event => field('body', event.target.value)} /></Label>{locale === 'bn' && (!content.title?.bn || !content.body?.bn) && <p className="text-xs text-amber-700">Empty Bangla fields fall back to English.</p>}{['hero', 'promotionalBanner'].includes(section.type) && <><Label>Button label<Input value={content.ctaLabel?.[locale] || ''} onChange={event => field('ctaLabel', event.target.value)} /></Label><Label>Button link<Input value={content.ctaHref || ''} onChange={event => update(item => ({ ...item, content: { ...item.content, ctaHref: event.target.value } }))} /></Label></>}{['hero', 'promotionalBanner', 'imageText'].includes(section.type) && <><Label>Image<Select value={content.imageUrl || 'none'} onValueChange={value => update(item => ({ ...item, content: { ...item.content, imageUrl: value === 'none' ? undefined : value } }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No image</SelectItem>{assets.map(asset => <SelectItem key={asset.id} value={asset.url}>{asset.altTextEn}</SelectItem>)}</SelectContent></Select></Label><Label>Image alternative text<Input value={content.imageAlt?.[locale] || ''} onChange={event => field('imageAlt', event.target.value)} /></Label></>}{section.type === 'categoryNavigation' && <Label>Categories, comma separated<Input value={(content.categories || []).join(', ')} onChange={event => update(item => ({ ...item, content: { ...item.content, categories: event.target.value.split(',').map(value => value.trim()).filter(Boolean) } }))} /></Label>}{section.type === 'productGrid' && <><p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">Products are added automatically from active inventory items marked for storefront display.</p><Label>Product limit<Input type="number" min="1" max="24" value={content.productLimit || 8} onChange={event => update(item => ({ ...item, content: { ...item.content, productLimit: Number(event.target.value) } }))} /></Label><Label>Product order<Select value={content.productSort || 'newest'} onValueChange={value => update(item => ({ ...item, content: { ...item.content, productSort: value as StorefrontSection['content']['productSort'] } }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest">Newest first</SelectItem><SelectItem value="name">Name</SelectItem><SelectItem value="priceAsc">Price: low to high</SelectItem><SelectItem value="priceDesc">Price: high to low</SelectItem></SelectContent></Select></Label></>}{section.type === 'contactHours' && <Label>Opening hours<Textarea value={content.hours?.[locale] || ''} onChange={event => field('hours', event.target.value)} /></Label>}<Button variant="destructive" size="sm" onClick={remove}><Trash2 className="mr-2 h-4 w-4" />Remove section</Button></div>
}

function Settings({ site, change, assets, setAssets }: { site: StorefrontSite; change: (value: StorefrontSite) => void; assets: StorefrontAsset[]; setAssets: (value: StorefrontAsset[]) => void }) {
  const { toast } = useToast(); const [alt, setAlt] = useState(''); const theme = (key: keyof StorefrontSite['themeTokens'], value: string) => change({ ...site, themeTokens: { ...site.themeTokens, [key]: value } })
  async function upload(file?: File) { if (!file || !alt.trim()) return; try { const asset = await storefrontService.upload(file, alt.trim()); setAssets([...assets, asset]); setAlt(''); toast({ title: 'Image uploaded' }) } catch (error: any) { toast({ title: 'Upload failed', description: error.response?.data?.message, variant: 'destructive' }) } }
  return <div className="space-y-4"><Label>Primary color<Input type="color" value={site.themeTokens.primary} onChange={event => theme('primary', event.target.value)} /></Label><Label>Accent color<Input type="color" value={site.themeTokens.accent} onChange={event => theme('accent', event.target.value)} /></Label><Label>Font<Select value={site.themeTokens.font} onValueChange={value => theme('font', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="manrope">Manrope</SelectItem><SelectItem value="noto-sans-bengali">Noto Sans Bengali</SelectItem><SelectItem value="system">System</SelectItem></SelectContent></Select></Label><Label>Corner radius<Select value={site.themeTokens.radius} onValueChange={value => theme('radius', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['0px', '8px', '12px', '16px'].map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></Label><Label>Delivery fee<Input type="number" min="0" step="0.01" value={site.orderSettings.deliveryFee} onChange={event => change({ ...site, orderSettings: { ...site.orderSettings, deliveryFee: Number(event.target.value) } })} /></Label><Label>Contact phone<Input value={site.orderSettings.phone} onChange={event => change({ ...site, orderSettings: { ...site.orderSettings, phone: event.target.value } })} /></Label><Label>SEO title<Input value={site.seoSettings.title.en} onChange={event => change({ ...site, seoSettings: { ...site.seoSettings, title: { ...site.seoSettings.title, en: event.target.value } } })} /></Label><Label>SEO description<Textarea value={site.seoSettings.description.en} onChange={event => change({ ...site, seoSettings: { ...site.seoSettings, description: { ...site.seoSettings.description, en: event.target.value } } })} /></Label><div className="flex items-center justify-between"><Label htmlFor="bangla">Enable Bangla</Label><Switch id="bangla" checked={site.enabledLocales.includes('bn')} onCheckedChange={checked => change({ ...site, enabledLocales: checked ? ['en', 'bn'] : ['en'], defaultLocale: 'en' })} /></div><div className="space-y-2 border-t pt-4"><Label>Asset alternative text<Input value={alt} onChange={event => setAlt(event.target.value)} /></Label><Label className="flex cursor-pointer items-center justify-center gap-2 rounded border p-3"><Upload className="h-4 w-4" />Upload image<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => upload(event.target.files?.[0])} /></Label><div className="grid grid-cols-3 gap-2">{assets.map(asset => <div key={asset.id} className="relative aspect-square overflow-hidden rounded border"><img src={asset.url} alt={asset.altTextEn} className="h-full w-full object-cover" /><ImageIcon className="absolute bottom-1 right-1 h-4 w-4 text-white" /></div>)}</div></div></div>
}
