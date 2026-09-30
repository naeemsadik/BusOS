import { storefrontServer } from "@/lib/storefront-server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  try {
    const site = await storefrontServer.site(slug);
    if (site.state !== "live")
      return new Response("Not found", { status: 404 });
    const root =
      process.env.NEXT_PUBLIC_STOREFRONT_ROOT_DOMAIN || "localhost:3000";
    const origin = `${root.includes("localhost") ? "http" : "https"}://${slug}.${root}`;
    const products = await storefrontServer.products(slug, "?limit=48");
    const paths = [
      "",
      "/products",
      ...(site.navigation || []).map((item) => `/pages/${item.slug}`),
      ...products.data.map((product) => `/products/${product.slug}`),
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${origin}${path}</loc></url>`).join("")}</urlset>`;
    return new Response(xml, {
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "cache-control": "public, max-age=60",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
