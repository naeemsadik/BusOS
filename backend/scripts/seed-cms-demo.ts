import dataSource from '../src/database/data-source';
import * as bcrypt from 'bcryptjs';
import {
  Category,
  Organization,
  Product,
  ProductStatus,
  StorefrontPage,
  StorefrontPageKind,
  StorefrontPageLifecycleStatus,
  StorefrontPageStatus,
  StorefrontPageType,
  StorefrontPublicationStatus,
  StorefrontSite,
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
  User,
  UserRole,
  UserStatus,
} from '../src/entities';
import { DEFAULT_SEO, DEFAULT_THEME } from '../src/storefront/storefront.types';
import { pageTemplate } from '../src/storefront/storefront-page.templates';

const DEMO_PASSWORD = 'DemoCMS!2026';

async function organization(name: string, phone: string) {
  const repository = dataSource.getRepository(Organization);
  let value = await repository.findOne({ where: { name }, relations: ['subscription'] });
  if (!value) value = await repository.save(repository.create({ name, phone, address: 'Dhanmondi, Dhaka', city: 'Dhaka', country: 'Bangladesh', isActive: true }));
  if (!value.subscription) {
    const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const subscriptionRepository = dataSource.getRepository(Subscription);
    const subscription = await subscriptionRepository.save(subscriptionRepository.create({ organization: value, plan: SubscriptionPlan.PREMIUM, status: SubscriptionStatus.ACTIVE, startDate: new Date(), endDate, trialEndDate: null, hasUsedTrial: true }));
    await repository.createQueryBuilder().relation(Organization, 'subscription').of(value).set(subscription);
    value.subscription = subscription;
  }
  return value;
}

async function owner(org: Organization, email: string, firstName: string) {
  const repository = dataSource.getRepository(User);
  let value = await repository.findOne({ where: { email } });
  if (!value) value = await repository.save(repository.create({ email, firstName, lastName: 'Owner', password: await bcrypt.hash(DEMO_PASSWORD, 12), role: UserRole.OWNER, status: UserStatus.ACTIVE, isEmailVerified: true, organization: org, organizationId: org.id, locale: 'en' }));
  return value;
}

async function main() {
  await dataSource.initialize();
  const demoOrg = await organization('BusOS CMS Demo Shop', '01710000001');
  const isolationOrg = await organization('BusOS CMS Isolation Shop', '01710000002');
  const demoOwner = await owner(demoOrg, 'cms.demo.owner@busos.local', 'Demo');
  await owner(isolationOrg, 'cms.isolation.owner@busos.local', 'Isolation');

  const categoryRepository = dataSource.getRepository(Category);
  const categoryNames = ['Groceries', 'Home care', 'Snacks'];
  for (const [index, name] of categoryNames.entries()) {
    const exists = await categoryRepository.createQueryBuilder('category').where('category.organizationId = :organizationId', { organizationId: demoOrg.id }).andWhere('category.name = :name', { name }).getExists();
    if (!exists) await categoryRepository.save(categoryRepository.create({ name, description: `${name} demo products`, isActive: true, sortOrder: index, organization: demoOrg }));
  }

  const productRepository = dataSource.getRepository(Product);
  const products = [
    ['Premium Rice 5kg', 'প্রিমিয়াম চাল ৫ কেজি', 'Groceries'], ['Red Lentils 1kg', 'মসুর ডাল ১ কেজি', 'Groceries'],
    ['Soybean Oil 2L', 'সয়াবিন তেল ২ লিটার', 'Groceries'], ['Fine Flour 2kg', 'ময়দা ২ কেজি', 'Groceries'],
    ['Iodized Salt 1kg', 'আয়োডিনযুক্ত লবণ', 'Groceries'], ['Dishwashing Liquid', 'থালা ধোয়ার তরল', 'Home care'],
    ['Laundry Powder', 'কাপড় ধোয়ার পাউডার', 'Home care'], ['Floor Cleaner', 'মেঝে পরিষ্কারক', 'Home care'],
    ['Tissue Box', 'টিস্যু বক্স', 'Home care'], ['Potato Chips', 'আলুর চিপস', 'Snacks'],
    ['Chocolate Biscuits', 'চকলেট বিস্কুট', 'Snacks'], ['Mango Juice', 'আমের জুস', 'Snacks'],
    ['Mineral Water', 'মিনারেল পানি', 'Snacks'], ['Demo No Image', null, 'Snacks'], ['Demo Sold Out', null, 'Groceries'],
  ] as const;
  for (const [index, [name, nameBn, category]] of products.entries()) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const exists = await productRepository.createQueryBuilder('product').where('product.organizationId = :organizationId', { organizationId: demoOrg.id }).andWhere('product.slug = :slug', { slug }).getOne();
    if (exists) continue;
    await productRepository.save(productRepository.create({ organization: demoOrg, name, nameBn, slug, sku: `CMS-DEMO-${String(index + 1).padStart(3, '0')}`, description: `Demo description for ${name}.`, descriptionBn: nameBn ? `${nameBn} এর ডেমো বিবরণ।` : null, longDescription: `A seeded storefront product used only for local CMS verification.`, longDescriptionBn: nameBn ? `স্থানীয় সিএমএস যাচাইয়ের জন্য ডেমো পণ্য।` : null, storefrontVisible: true, image: index >= 13 ? undefined : '/placeholder.jpg', imageAltText: name, imageAltTextBn: nameBn, category, price: 50 + index * 25, cost: 25 + index * 10, stock: index === 14 ? 0 : 20 + index, minStock: 3, maxStock: 100, status: ProductStatus.ACTIVE, trackStock: true, allowBackorder: false }));
  }

  const siteRepository = dataSource.getRepository(StorefrontSite);
  let site = await siteRepository.findOne({ where: { organizationId: demoOrg.id } });
  const document = pageTemplate('home', 'template');
  const settings = { brand: { name: { en: 'BusOS Demo Shop', bn: 'বাসওএস ডেমো শপ' }, logoAssetId: null, faviconAssetId: null }, theme: { ...DEFAULT_THEME, background: '#ffffff', text: '#0f172a' }, contact: { phone: demoOrg.phone, address: { en: demoOrg.address, bn: 'ধানমন্ডি, ঢাকা' }, city: 'Dhaka', country: 'Bangladesh' }, header: { showSearch: true, showLanguageSwitcher: true }, footer: { text: { en: 'Thank you for visiting.', bn: 'আমাদের দোকান দেখার জন্য ধন্যবাদ।' }, showContact: true }, seo: DEFAULT_SEO, orders: { deliveryEnabled: true, pickupEnabled: true, deliveryFee: 60, freeDeliveryOver: 1000, minOrderAmount: 100, maxQtyPerLine: 20, maxLines: 30, noteEnabled: true } };
  if (!site) site = await siteRepository.save(siteRepository.create({ organizationId: demoOrg.id, slug: 'demo', status: StorefrontPublicationStatus.PUBLISHED, enabledLocales: ['en', 'bn'], defaultLocale: 'en', themeTokens: DEFAULT_THEME, seoSettings: DEFAULT_SEO, orderSettings: { deliveryFee: 60, phone: demoOrg.phone, address: { en: demoOrg.address } }, orderingEnabled: true, orderingPausedMessage: { en: 'Ordering is paused.', bn: 'অর্ডার সাময়িকভাবে বন্ধ।' }, draftSettings: settings, publishedSettings: settings, settingsVersion: 1, shopProfile: { category: 'general-store', city: 'Dhaka' }, setupProgress: { slug: true, basics: true, products: true, template: true, published: true }, draftDocument: document, publishedDocument: document, draftVersion: 1, publishedVersion: 1, publishedAt: new Date(), firstPublishedAt: new Date(), lastPublishedAt: new Date() }));

  const pageRepository = dataSource.getRepository(StorefrontPage);
  const homeExists = await pageRepository.findOne({ where: { organizationId: demoOrg.id, siteId: site.id, kind: StorefrontPageKind.HOME } });
  if (!homeExists) await pageRepository.save(pageRepository.create({ organizationId: demoOrg.id, siteId: site.id, title: 'Home', localizedTitle: { en: 'Home', bn: 'হোম' }, slug: 'home', pageType: StorefrontPageType.HOME, status: StorefrontPageStatus.PUBLISHED, kind: StorefrontPageKind.HOME, lifecycleStatus: StorefrontPageLifecycleStatus.PUBLISHED, isHomePage: true, includeInNavigation: false, showInMenu: false, navigationLabel: { en: 'Home', bn: 'হোম' }, navigationOrder: 0, menuOrder: 0, enabledLocales: ['en', 'bn'], seoSettings: DEFAULT_SEO, draftDocument: document, publishedDocument: document, draftVersion: 1, publishedVersion: 1, publishedAt: new Date(), createdBy: demoOwner.id, updatedBy: demoOwner.id }));

  console.log('CMS demo seed ready: demo storefront and isolated second organization.');
  console.log('Demo owner: cms.demo.owner@busos.local / DemoCMS!2026');
  console.log('Isolation owner: cms.isolation.owner@busos.local / DemoCMS!2026');
  await dataSource.destroy();
}

main().catch(async (error) => { console.error(error instanceof Error ? error.stack : error); if (dataSource.isInitialized) await dataSource.destroy(); process.exitCode = 1; });
