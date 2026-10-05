import { NextResponse } from "next/server";

import { getAdminSessionFromRequest } from "@/lib/server/admin-session";
import { listOrders } from "@/lib/data/admin-order-repository";
import { listAdminProducts } from "@/lib/data/admin-catalog-repository";

export const dynamic = "force-dynamic";

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCSV(rows: (string | number | null)[][]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

export async function GET(request: Request): Promise<Response> {
  const session = await getAdminSessionFromRequest();
  if (!session) {
    return new NextResponse("No autorizado.", { status: 401 });
  }

  const url = new URL(request.url);
  const resource = url.searchParams.get("resource") ?? "orders";
  const q = url.searchParams.get("q") ?? undefined;

  if (resource === "products") {
    const products = await listAdminProducts({ q });
    const rows: (string | number | null)[][] = [
      ["id", "nombre", "slug", "estado", "categoria", "variantes", "precio_min", "stock_total"],
    ];
    for (const product of products) {
      const prices = product.variants.map((variant) => variant.priceCents);
      const stock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
      rows.push([
        product.id,
        product.name,
        product.slug,
        product.status,
        product.category ?? "",
        product.variants.length,
        prices.length > 0 ? (Math.min(...prices) / 100).toFixed(2) : "",
        stock,
      ]);
    }
    return new NextResponse(toCSV(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="catalogo.csv"',
      },
    });
  }

  /* Por defecto: pedidos */
  const orders = await listOrders({ q, limit: 5000 });
  const rows: (string | number | null)[][] = [
    ["id", "folio", "estado", "cliente", "telefono", "articulos", "total", "creado_en"],
  ];
  for (const order of orders) {
    rows.push([
      order.id,
      order.folio,
      order.status,
      order.customerFullName,
      order.customerPhone,
      order.itemCount,
      (order.totalCents / 100).toFixed(2),
      order.createdAt,
    ]);
  }
  return new NextResponse(toCSV(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="pedidos.csv"',
    },
  });
}
