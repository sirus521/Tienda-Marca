import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ProductDetail } from "@/components/product/product-detail";
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

  return {
    title: product.seo.title,
    description: product.seo.description,
    openGraph: {
      locale: "es_MX",
      url: `https://tienda.ac/producto/${product.slug}`,
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
  const primary = getPrimaryImage(product);

  return (
    <main className="bg-bone-1">
      <ProductDetail product={product} primaryImage={primary} related={related} />
    </main>
  );
}
