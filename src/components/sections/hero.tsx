import Link from "next/link";

import { GlassCard } from "@/components/glass/glass-card";
import { KineticHeadline } from "@/components/motion/recipes/kinetic-headline";
import { Magnetic } from "@/components/motion/recipes/magnetic-button";
import { Dither } from "@/components/motion/recipes/dither";
import { Noise } from "@/components/motion/recipes/noise";
import { LogoMark } from "@/components/brand/logo-mark";
import { buttonStyles } from "@/components/ui/button";
import { brand, establishedLabel } from "@/config/brand";

/**
 * Hero
 * ============================================================================
 * Telón de fondo animado con `dither` (halftone de tinta, GPU, monocromo) +
 * grano `noise`. Encima, el titular entra palabra a palabra (`KineticHeadline`)
 * y el CTA responde al cursor (`Magnetic`) con `buttonStyles` intacto.
 *
 * El texto del h1 se sirve en el HTML (LCP/SEO y no-JS intactos): los
 * componentes cliente lo "mejoran" tras hidratar. Bajo reduced-motion todo
 * queda estático y el h1 se ve de una vez.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line-ink bg-ink">
      <Dither className="absolute inset-0" fallback="#0e0e0c" />
      <Noise className="absolute inset-0" />

      {/* Monograma fantasma sobre la onda de tinta, a propósito sutil. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center"
      >
        <div className="w-[120rem] max-w-full opacity-[0.05]">
          <LogoMark className="w-full text-bone" />
        </div>
      </div>

      <div className="relative z-10 container-ac flex min-h-[88svh] flex-col justify-between py-section lg:min-h-[92svh] lg:py-[clamp(6rem,12vw,11rem)]">
        {/* ---------------- Bloque principal ---------------- */}
        <div className="max-w-5xl">
          <p className="animate-fade-up font-mono text-label leading-none font-medium tracking-[0.18em] text-bone/60 uppercase">
            {establishedLabel} · {brand.contact.location.split(",")[0] ?? "México"}
          </p>

          <KineticHeadline className="mt-7">
            <h1 className="text-bone">
              <span
                data-kinetic
                data-kinetic-anim="rise"
                className="block font-display text-display"
              >
                Playeras
              </span>
              {/* La palabra clave va al tamaño máximo: aquí está el golpe visual. */}
              <span
                data-kinetic="letters"
                data-kinetic-anim="rise"
                className="block font-display text-hero"
              >
                OVERSIZE
              </span>
              <span
                data-kinetic
                data-kinetic-anim="rise"
                className="block font-display text-display"
              >
                de peso pesado
              </span>
            </h1>
          </KineticHeadline>
        </div>

        {/* ---------------- Cierre del hero ---------------- */}
        <div className="mt-10 animate-fade-up [animation-delay:420ms] lg:mt-14">
          <GlassCard
            className="max-w-3xl"
            contentClassName="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between"
          >
            <p className="max-w-md text-lead text-ink-2">{brand.identity.description}</p>

            <div className="flex flex-wrap items-center gap-3">
              <Magnetic>
                <Link href="/tienda" className={buttonStyles({ variant: "primary", size: "lg" })}>
                  Ver la tienda
                </Link>
              </Magnetic>
              {/* El botón secundario apuntaba a `/nosotros`, que todavía no
                  existe. Se retira junto con los enlaces de `nav.ts` para no
                  dejar un 404 en la primera pantalla; vuelve cuando la página
                  de historia esté construida. */}
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}
