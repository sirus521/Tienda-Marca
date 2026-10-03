import Link from "next/link";

import { LogoMark } from "@/components/brand/logo-mark";
import { buttonStyles } from "@/components/ui/button";
import { brand, establishedLabel } from "@/config/brand";

/**
 * Hero
 * ============================================================================
 * DECISIÓN TÉCNICA: este componente es de servidor y anima con CSS, no con
 * JavaScript. Es deliberado y tiene dos razones:
 *
 *  1. RENDIMIENTO. El titular es el elemento más grande de la página (LCP).
 *     Si su visibilidad dependiera de que cargue y ejecute un paquete de
 *     animación, el navegador mediría el LCP más tarde. Con CSS, el texto se
 *     pinta en el primer frame.
 *
 *  2. ROBUSTEZ. Si JavaScript falla o se bloquea, el hero sigue apareciendo.
 *     Además, con movimiento reducido la media query global completa las
 *     animaciones al instante en vez de congelarlas, así que el contenido
 *     nunca queda invisible.
 *
 * Los titulares usan máscara: el texto sube desde detrás de su propia línea.
 * El contenedor recorta (`overflow-hidden`) y el hijo arranca desplazado al
 * 105% de su altura.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      {/* Monograma gigante al fondo. A 3% de opacidad es textura, no adorno:
          da escala a la página sin robar atención al titular. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
      >
        <div className="w-[120rem] max-w-full opacity-[0.035]">
          <LogoMark className="w-full text-ink" />
        </div>
      </div>

      <div className="container-ac relative z-10 flex min-h-[88svh] flex-col justify-between py-section lg:py-[clamp(6rem,12vw,11rem)] lg:min-h-[92svh]">
        {/* ---------------- Bloque principal ---------------- */}
        <div className="max-w-5xl">
          <p className="eyebrow animate-fade-up">
            {establishedLabel} · {brand.contact.location.split(",")[0] ?? "México"}
          </p>

          <h1 className="mt-7">
            <span className="animate-fade-up block font-display text-display [animation-delay:80ms]">
              Playeras
            </span>
            {/* La palabra clave va al tamaño máximo: aquí está el golpe visual. */}
            <span className="block overflow-hidden">
              <span className="animate-mask-up block font-display text-hero text-ink [animation-delay:160ms]">
                OVERSIZE
              </span>
            </span>
            <span className="animate-fade-up block font-display text-display [animation-delay:320ms]">
              de peso pesado
            </span>
          </h1>
        </div>

        {/* ---------------- Cierre del hero ---------------- */}
        <div className="mt-10 flex flex-col gap-8 lg:mt-14 lg:flex-row lg:items-start lg:justify-between">
          <p className="animate-fade-up max-w-md text-lead text-ash [animation-delay:420ms]">
            {brand.identity.description}
          </p>

          <div className="animate-fade-up flex flex-wrap items-center gap-3 [animation-delay:520ms]">
            <Link href="/tienda" className={buttonStyles({ variant: "primary", size: "lg" })}>
              Ver la tienda
            </Link>
            {/* El botón secundario apuntaba a `/nosotros`, que todavía no
                existe. Se retira junto con los enlaces de `nav.ts` para no
                dejar un 404 en la primera pantalla; vuelve cuando la página
                de historia esté construida. */}
          </div>
        </div>
      </div>
    </section>
  );
}
