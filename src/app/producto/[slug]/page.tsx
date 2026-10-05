import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ProductDetail } from "@/components/product/product-detail";
import { ProductInfo } from "@/components/product/product-info";
import { RelatedProducts } from "@/components/product/related-products";
import { site } from "@/config/site";
import {
  getProductBySlug,
  listProductSlugs,
  listRelatedProducts,
} from "@/lib/data/catalog-repository";
import { getMaxPrice, getMinPrice, getPrimaryImage, getTotalStock } from "@/lib/domain/catalog";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";

/** Revalida cada 5 min (ISR). Baja al build cuando se publique algo. */
export const revalidate = 300;

export async function generateStaticParams() {
  return (await listProductSlugs()).map((slug) => ({ slug }));
}

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) return {};

  const primary = getPrimaryImage(product);
  const path = `/producto/${product.slug}`;

  return {
    title: product.seo.title,
    description: product.seo.description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "es_MX",
      /* Se arma con `site.url` y no con un dominio fijo. `metadataBase` de
         `app/layout.tsx:57` ya resuelve las rutas relativas, pero Open Graph
         necesita la URL absoluta: escribirla a mano dejaba el preview
         apuntando a un dominio que no era el de producción. */
      url: `${site.url}${path}`,
      title: product.seo.title,
      description: product.seo.description,
      images: primary ? [{ url: primary.url, width: primary.width, height: primary.height }] : [],
    },
  };
}

export default async function ProductoPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  const related = await listRelatedProducts(product, 3);
  const images = product.images.map((image) =>
    image.url.startsWith("http") ? image.url : `${site.url}${image.url}`,
  );

  const productJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.variants[0]?.sku,
    image: images,
    brand: { "@type": "Brand", name: "Access" },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "MXN",
      lowPrice: (getMinPrice(product) / 100).toFixed(2),
      highPrice: (getMaxPrice(product) / 100).toFixed(2),
      availability:
        getTotalStock(product) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  const breadcrumbJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: site.url },
      { "@type": "ListItem", position: 2, name: "Tienda", item: `${site.url}/tienda` },
      {
        "@type": "ListItem",
        position: 3,
        name: product.name,
        item: `${site.url}/producto/${product.slug}`,
      },
    ],
  };

  return (
    <main className="bg-bone-1">
      <div className="container-ac pt-10">
        <Breadcrumbs
          items={[
            { label: "Inicio", href: "/" },
            { label: "Tienda", href: "/tienda" },
            { label: product.name },
          ]}
        />
      </div>
      <JsonLd data={productJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <div className="container-ac pt-6 pb-section lg:pt-16">
        {/* ---------------- Compra ----------------
            Solo la galería y el panel de tallas son interactivos. Todo lo
            demás se queda en el servidor. */}
        <ProductDetail product={product} />

        {/* ---------------- Ficha ---------------- */}
        <ProductInfo product={product} className="mt-20" />
      </div>

      {/* ---------------- Relacionados ---------------- */}
      <RelatedProducts products={related} />
    </main>
  );
}
