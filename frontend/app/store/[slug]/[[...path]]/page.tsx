import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { PublicStore } from "@/components/storefront/public-store";
import { localize, type Locale } from "@/lib/storefront-types";
import { StorefrontApiError, storefrontServer } from "@/lib/storefront-server";

type Props = {
  params: Promise<{ slug: string; path?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
const allowed = new Set([
  "home",
  "products",
  "pages",
  "cart",
  "checkout",
  "order",
  "catalog",
  "product",
  "confirmation",
]);
async function load(
  params: { slug: string; path?: string[] },
  search: Record<string, string | string[] | undefined> = {},
) {
  const raw = params.path || [];
  const locale: Locale = raw[0] === "bn" ? "bn" : "en";
  const path = locale === "bn" ? raw.slice(1) : raw;
  const page = path[0] || "home";
  const site = await storefrontServer.site(params.slug);
  if (site.state === "redirect") {
    const root = process.env.NEXT_PUBLIC_STOREFRONT_ROOT_DOMAIN || "localhost:3000";
    const protocol = root.includes("localhost") ? "http" : "https";
    permanentRedirect(`${protocol}://${site.slug}.${root}/${raw.join("/")}`);
  }
  if (site.state && site.state !== "live")
    return { site, products: [], locale, path };
  if (locale === "bn" && !site.enabledLocales.includes("bn")) notFound();
  let products: any[] = [];
  let product;
  let customPage;
  if (page === "pages") {
    if (path.length !== 2) notFound();
    customPage = await storefrontServer.page(params.slug, path[1]);
    if (customPage.redirectTo)
      redirect(`${locale === "bn" ? "/bn" : ""}/${customPage.redirectTo}`);
    if (
      !customPage.document ||
      (locale === "bn" && !customPage.enabledLocales?.includes("bn"))
    )
      notFound();
  } else if (!allowed.has(page)) notFound();
  const productRoute = page === "product" || (page === "products" && !!path[1]);
  const catalogRoute = page === "catalog" || (page === "products" && !path[1]);
  if (
    (productRoute && !path[1]) ||
    path.length > (productRoute || page === "order" ? 2 : 1)
  )
    notFound();
  if (page === "home" || customPage) {
    const productSection = (
      customPage?.document || site.document
    )?.sections.find(
      (section) => section.visible && section.type === "productGrid",
    );
    const query = new URLSearchParams({
      limit: String(productSection?.content.productLimit || 24),
      sort: productSection?.content.productSort || "newest",
    });
    products = (await storefrontServer.products(params.slug, `?${query}`)).data;
  }
  if (catalogRoute) {
    const query = new URLSearchParams({
      page: String(search.page || 1),
      limit: "24",
      ...(typeof search.category === "string"
        ? { category: search.category }
        : {}),
      ...(typeof search.query === "string" ? { search: search.query } : {}),
      ...(typeof search.sort === "string" ? { sort: search.sort } : {}),
    });
    products = (await storefrontServer.products(params.slug, `?${query}`)).data;
  }
  if (productRoute)
    product = await storefrontServer.product(params.slug, path[1]);
  return {
    site,
    products,
    product,
    locale,
    path: catalogRoute
      ? ["products"]
      : productRoute
        ? ["products", path[1]]
        : path,
    customDocument: customPage?.document,
    customPage,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const values = await params;
    const { site, locale, product, customPage, path } = await load(values);
    const root =
      process.env.NEXT_PUBLIC_STOREFRONT_ROOT_DOMAIN || "localhost:3000";
    const protocol = root.includes("localhost") ? "http" : "https";
    const origin = `${protocol}://${site.slug}.${root}`;
    const suffix = locale === "bn" ? "/bn" : "";
    const seo = customPage?.seoSettings || site.seoSettings;
    const title = product
      ? (locale === "bn" && product.nameBn) || product.name
      : localize(seo.title, locale) ||
        customPage?.title ||
        site.name ||
        site.slug;
    const description = product
      ? (locale === "bn" && product.descriptionBn) || product.description
      : localize(seo.description, locale);
    const pagePath = path[0] && path[0] !== "home" ? `/${path[0]}` : "";
    return {
      title,
      description,
      alternates: {
        canonical: `${origin}${suffix}${pagePath}`,
        languages: {
          en: `${origin}${pagePath}`,
          ...(site.enabledLocales.includes("bn")
            ? { bn: `${origin}/bn${pagePath}` }
            : {}),
        },
      },
      openGraph: {
        title,
        description,
        images: seo.socialImageUrl ? [seo.socialImageUrl] : [],
      },
    };
  } catch {
    return {
      title: "Store unavailable",
      robots: { index: false, follow: false },
    };
  }
}

export default async function StorePage({ params, searchParams }: Props) {
  try {
    const data = await load(await params, await searchParams);
    if (data.site.state && data.site.state !== "live")
      return <StoreState state={data.site.state} />;
    const structured = data.product
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          name:
            (data.locale === "bn" && data.product.nameBn) || data.product.name,
          image: data.product.image,
          description:
            (data.locale === "bn" && data.product.descriptionBn) ||
            data.product.description,
          offers: {
            "@type": "Offer",
            priceCurrency: "BDT",
            price: data.product.price,
            availability: data.product.available
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          },
        }
      : null;
    return (
      <>
        {structured && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(structured).replace(/</g, "\\u003c"),
            }}
          />
        )}
        <PublicStore {...(data as any)} />
      </>
    );
  } catch (error) {
    if (error instanceof StorefrontApiError && error.status === 503) {
      const brand = error.payload?.storefront;
      return (
        <main className="grid min-h-screen place-content-center bg-slate-50 p-6 text-center">
          <h1 className="text-4xl font-black">
            {brand?.name || "Store unavailable"}
          </h1>
          <p className="mt-4 text-slate-600">
            This store is temporarily unavailable. Please try again later.
          </p>
        </main>
      );
    }
    notFound();
  }
}

function StoreState({ state }: { state?: string }) {
  const copy =
    state === "coming_soon"
      ? ["Coming soon", "This shop is getting ready to open online."]
      : state === "closed"
        ? ["Shop temporarily closed", "Please check back later."]
        : state === "suspended"
          ? ["Shop unavailable", "This storefront is temporarily unavailable."]
          : ["Storefront not found", "Check the address and try again."];
  return (
    <main className="grid min-h-screen place-content-center bg-slate-50 p-6 text-center">
      <h1 className="text-4xl font-black">{copy[0]}</h1>
      <p className="mt-4 text-slate-600">{copy[1]}</p>
    </main>
  );
}
