import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Marquee } from "@/components/ui/marquee";
import { brand, establishedLabel } from "@/config/brand";
import { getBrandConfig } from "@/lib/config/brand-runtime";
import { footerNav, mainNav } from "@/config/nav";
import { cn } from "@/lib/utils/cn";

/**
 * Footer.
 *
 * Cierra la página con la marca en grande y, sin adornos, deja los enlaces
 * que la gente realmente busca antes de comprar: envíos y devoluciones. En
 * México esos dos son los que deciden una compra; escondidos en un
 * desplegable generan desconfianza.
 *
 * Los datos de contacto se renderizan solo si existen. Mostrar un teléfono
 * vacío o un "wa.me/" roto es peor que no mostrar nada.
 *
 * Las columnas de enlaces se renderizan solo si tienen entradas. Una columna
 * con encabezado y cero enlaces —o un enlace a una página que aún no existe,
 * que además Next.js prefetchea y convierte en un 404 por carga— se lee como
 * una tienda rota.
 */
export async function Footer() {
  const year = new Date().getFullYear();
  const config = await getBrandConfig();
  const { whatsapp, email, instagram, location } = config.contact;
  const hasWhatsApp = whatsapp.trim().length >= 10;
  const hasFooterNav = footerNav.length > 0;

  return (
    <footer className="mt-section border-t border-line">
      {/* ---------------- Banda de marca ---------------- */}
      <div className="border-b border-line py-6">
        <Marquee duration={38}>
          <span className="flex items-center gap-8 pr-8 font-display text-title whitespace-nowrap text-ink">
            {brand.identity.name}
            <span className="font-mono text-xs tracking-[0.2em] text-bronze">
              {establishedLabel}
            </span>
          </span>
        </Marquee>
      </div>

      {/* ---------------- Columnas ----------------
          La columna "Ayuda" solo se pinta si `footerNav` tiene entradas. Con la
          lista vacía, una columna con encabezado y cero enlaces se lee como una
          tienda rota, y la rejilla además dejaría un hueco de una celda. */}
      <div
        className={cn(
          "container-ac grid gap-12 py-16 md:grid-cols-2",
          hasFooterNav ? "lg:grid-cols-4" : "lg:grid-cols-3",
        )}
      >
        <div className="flex flex-col gap-4">
          <Link href="/" aria-label={`${brand.identity.name} — inicio`} className="inline-flex">
            <Logo variant="lockup" size={44} decorative />
          </Link>
          <p className="max-w-xs text-sm leading-relaxed text-ash">{brand.identity.tagline}</p>
        </div>

        <nav aria-labelledby="footer-tienda">
          <h2 id="footer-tienda" className="mb-4 eyebrow">
            Tienda
          </h2>
          <ul className="flex flex-col gap-3">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="link-underline text-sm text-ink">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {hasFooterNav ? (
          <nav aria-labelledby="footer-ayuda">
            <h2 id="footer-ayuda" className="mb-4 eyebrow">
              Ayuda
            </h2>
            <ul className="flex flex-col gap-3">
              {footerNav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="link-underline text-sm text-ink">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        <div>
          <h2 className="mb-4 eyebrow">Contacto</h2>
          <ul className="flex flex-col gap-3 text-sm">
            {hasWhatsApp ? (
              <li>
                <a
                  href={`https://wa.me/${whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-underline text-ink"
                >
                  WhatsApp
                </a>
              </li>
            ) : null}
            {email ? (
              <li>
                <a href={`mailto:${email}`} className="link-underline text-ink">
                  {email}
                </a>
              </li>
            ) : null}
            {instagram ? (
              <li>
                <a
                  href={`https://instagram.com/${instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-underline text-ink"
                >
                  @{instagram}
                </a>
              </li>
            ) : null}
            <li className="text-ash">{location}</li>
          </ul>
        </div>
      </div>

      {/* ---------------- Legal ---------------- */}
      <div className="border-t border-line">
        <div className="container-ac flex flex-col gap-2 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="eyebrow">
            © {year} {brand.identity.legalName}
          </p>
          <p className="eyebrow">Hecho en {location.split(",")[0] ?? "México"}</p>
        </div>
      </div>
    </footer>
  );
}
