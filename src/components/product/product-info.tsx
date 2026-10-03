import type { Product } from "@/lib/domain/types";

import { Accordion, type AccordionItem } from "@/components/ui/accordion";
import { cn } from "@/lib/utils/cn";

/**
 * Ficha informativa del producto
 * ============================================================================
 * Descripción, ficha técnica, guía de medidas y cuidados.
 *
 * POR QUÉ ESTO ES UN COMPONENTE DE SERVIDOR
 * No hay nada aquí que dependa de estado: los datos vienen del producto y no
 * cambian sin recargar. Por eso se renderiza en el servidor y no viaja
 * JavaScript para nada. El acordeón es `<details>` nativo, así que abre y cierra
 * sin una sola línea de script (`components/ui/accordion.tsx:21`).
 *
 * POR QUÉ LA DESCRIPCIÓN NO VA DENTRO DEL ACORDEÓN
 * Es el texto que responde "¿qué es esto y para quién es?". Es contenido de
 * venta, no documentación: esconderlo detrás de un clic es perder la venta y,
 * de paso, queda fuera de la lectura de los buscadores. Los datos técnicos sí
 * van plegados, porque son consulta, no descubrimiento.
 */
export function ProductInfo({ product, className }: { product: Product; className?: string }) {
  const description = product.description.trim();
  const items = buildAccordionItems(product);

  if (!description && items.length === 0) return null;

  return (
    <section className={cn("border-t border-line pt-8", className)} aria-labelledby="ficha-info">
      <h2 id="ficha-info" className="sr-only">
        Detalles del producto
      </h2>

      {description ? (
        <div className="max-w-2xl">
          {description.split(/\n{2,}/).map((paragraph, index) => (
            <p key={index} className="text-lead leading-relaxed text-ash">
              {paragraph}
            </p>
          ))}
        </div>
      ) : null}

      {items.length > 0 ? <Accordion className="mt-10" items={items} /> : null}
    </section>
  );
}

/**
 * Arma los apartados plegables, omitting los que el producto no tenga.
 *
 * Un acordeón con un apartado "Guía de medidas" vacío es peor que no tenerlo:
 * invita a hacer clic y encuentra nada.
 */
function buildAccordionItems(product: Product): AccordionItem[] {
  const items: AccordionItem[] = [];

  if (product.details.length > 0) {
    items.push({
      id: "ficha-tecnica",
      title: "Ficha técnica",
      content: (
        <dl className="divide-y divide-line border-t border-line">
          {product.details.map((detail) => (
            <div key={detail.label} className="flex items-baseline justify-between gap-6 py-3">
              <dt className="text-ink">{detail.label}</dt>
              <dd className="text-right font-mono text-sm text-ash">{detail.value}</dd>
            </div>
          ))}
        </dl>
      ),
    });
  }

  if (product.measurements.length > 0) {
    items.push({
      id: "guia-de-medidas",
      title: "Guía de medidas",
      content: <Measurements product={product} />,
    });
  }

  if (product.careInstructions.length > 0) {
    items.push({
      id: "cuidados",
      title: "Cuidados",
      content: (
        <ul className="flex flex-col gap-2.5">
          {product.careInstructions.map((instruction) => (
            <li key={instruction} className="flex gap-3">
              <span aria-hidden="true" className="mt-2 block h-px w-3 shrink-0 bg-ash-2" />
              <span>{instruction}</span>
            </li>
          ))}
        </ul>
      ),
    });
  }

  return items;
}

/**
 * Guía de medidas.
 *
 * Las columnas se derivan de los datos, no de una constante: cada tipo de prenda
 * mide cosas distintas (una playera, pecho/largo/hombro; una sudadera, además
 * largo de manga). Si el panel admin guarda otras claves, la tabla las
 * recoge sola sin que haya que tocar este archivo.
 *
 * Las unidades van en la cabecera porque el tipo solo guarda números
 * (`MeasurementRow.values` es `Record<string, number>`); poner "cm" una vez por
 * columna evita repetirlo en cada celda.
 */
function Measurements({ product }: { product: Product }) {
  const columns = collectMeasurementKeys(product);

  if (columns.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line">
            <th
              scope="col"
              className="py-2 pr-4 text-left font-mono text-label tracking-[0.16em] uppercase"
            >
              Talla
            </th>
            {columns.map((key) => (
              <th
                key={key}
                scope="col"
                className="py-2 pr-4 text-left font-mono text-label tracking-[0.16em] uppercase"
              >
                {capitalize(key)}
                <span className="ml-1 text-ash-2">cm</span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {product.measurements.map((row) => (
            <tr key={row.size} className="border-b border-line/60">
              <th scope="row" className="py-3 pr-4 text-left font-mono font-medium text-ink">
                {row.size}
              </th>
              {columns.map((key) => (
                <td key={key} className="py-3 pr-4 font-mono text-ash tabular-nums">
                  {row.values[key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Claves de medición en el orden en que aparecen por primera vez.
 *
 * El orden importa: si se usara `Object.keys` de la última fila, una prenda con
 * medidas desiguales mostraría las columnas desordenadas entre sí.
 */
function collectMeasurementKeys(product: Product): string[] {
  const keys: string[] = [];

  for (const row of product.measurements) {
    for (const key of Object.keys(row.values)) {
      if (!keys.includes(key)) keys.push(key);
    }
  }

  return keys;
}

/** "pecho" -> "Pecho". Las claves llegan en minúsculas desde los datos. */
function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
