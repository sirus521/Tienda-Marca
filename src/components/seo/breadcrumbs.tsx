import Link from "next/link";

type Crumb = { label: string; href?: string };

/**
 * Migas de pan visibles. Cada crumb sin `href` es el actual (no enlaza).
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Ruta" className="font-mono text-[11px] tracking-[0.14em] text-ash uppercase">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((crumb, index) => (
          <li key={`${crumb.label}-${index}`} className="flex items-center gap-2">
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-ink">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-ink">{crumb.label}</span>
            )}
            {index < items.length - 1 ? <span aria-hidden="true">/</span> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
