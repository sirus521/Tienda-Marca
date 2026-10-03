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
import { getPrimaryImage } from "@/lib/domain/catalog";

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

  return (
    <main className="bg-bone-1">
      <div className="container-ac pt-10 pb-section lg:pt-16">
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
