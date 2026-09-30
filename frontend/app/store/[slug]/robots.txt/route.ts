import { storefrontServer } from "@/lib/storefront-server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  try {
    const site = await storefrontServer.site(slug);
    if (site.state !== "live")
      return new Response("User-agent: *\nDisallow: /\n", {
        headers: { "content-type": "text/plain" },
      });
    const root =
      process.env.NEXT_PUBLIC_STOREFRONT_ROOT_DOMAIN || "localhost:3000";
    const origin = `${root.includes("localhost") ? "http" : "https"}://${slug}.${root}`;
    return new Response(
      `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`,
      {
        headers: {
          "content-type": "text/plain",
          "cache-control": "public, max-age=60",
        },
      },
    );
  } catch {
    return new Response("User-agent: *\nDisallow: /\n", {
      headers: { "content-type": "text/plain" },
    });
  }
}
