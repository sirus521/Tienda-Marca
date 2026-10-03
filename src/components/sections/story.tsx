"use client";

import Image from "next/image";
import { m, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";

import { brand } from "@/config/brand";

/** Párrafos que se revelan palabra por palabra conforme baja el scroll. */
const PARAGRAPHS = [
  "Empezamos con una sola pieza porque no queríamos surtir un catálogo, queríamos resolver una playera.",
  "Algodón de 240 gramos. Corte boxy que cae recto sin pegarse al cuerpo. Cuello reforzado para que no se vence al tercer lavado.",
  "Se corta en lotes pequeños. Si una talla se agota, tarda en volver: preferimos eso a llenar el almacén de lo que nadie compra.",
] as const;

/**
 * Storytelling
 * ============================================================================
 * Dos mecanismos de scroll, cada uno con una razón:
 *
 *  1. REVELADO PALABRA POR PALABRA (columna de texto)
 *     Cada palabra tiene su propio rango dentro del progreso de la sección, y
 *     su opacidad va de 0.18 a 1 dentro de ese rango. El efecto es que el
 *     texto "se lee solo" al ritmo del scroll.
 *
 *     Detalle de implementación: cada palabra es su propio componente `Word`,
 *     así cada una puede llamar a `useTransform`. Llamar a un hook dentro de
 *     un `.map()` rompería las reglas de los hooks de React; una instancia por
 *     palabra no. Por eso no se puede simplificar a un bucle inline.
 *
 *  2. IMAGEN PEGAJOSA CON PARALAJE (columna derecha)
 *     `position: sticky` mantiene la imagen fija mientras el texto pasa. El
 *     desplazamiento interno va de -3% a 3%: sutil, suficiente para dar
 *     profundidad sin que la imagen parezca desprenderse del bloque.
 *
 * Por qué el rango es 0.18 y no 0: si las palabras empiezan invisibles, el
 * párrafo aparece vacío al entrar en pantalla. Arrancando en 0.18 siempre hay
 * texto legible y el movimiento se percibe como énfasis, no como aparición.
 */
export function Story() {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();

  /* Rango de progreso: arranca cuando el inicio de la sección toca el fondo
     del viewport y termina cuando su final llega al centro. Es el tramo en el
     que la sección está realmente en pantalla. */
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 0.85", "end 0.45"],
  });

  /* Paraleje de la imagen: se mueve menos que el scroll, no más. */
  const imageY = useTransform(scrollYProgress, [0, 1], ["-3%", "3%"]);

  /* Con movimiento reducido se omite el mecanismo de scroll y se renderiza el
     contenido completo. No se esconde nada: se muestra y ya. */
  if (prefersReducedMotion) {
    return (
      <section ref={sectionRef} className="container-ac py-section section-divider">
        <span className="eyebrow">02 / 04</span>
        <div className="mt-10 grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
          <div className="flex flex-col gap-8">
            {PARAGRAPHS.map((paragraph) => (
              <p key={paragraph} className="text-heading text-balance">
                {paragraph}
              </p>
            ))}
          </div>
          <div className="relative aspect-4/5 overflow-hidden bg-bone-2">
            <Image
              src="/placeholder/tee-ink.svg"
              alt="Detalle de la playera oversize"
              fill
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="container-ac py-section section-divider">
      <span className="eyebrow">02 / 04</span>

      <div className="mt-10 grid gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
        {/* ---------------- Texto que se revela ---------------- */}
        <div className="flex flex-col gap-10 lg:gap-16">
          {PARAGRAPHS.map((paragraph) => (
            <RevealWords key={paragraph} text={paragraph} progress={scrollYProgress} />
          ))}

          <div className="border-t border-line pt-6">
            <p className="font-mono text-xs tracking-[0.16em] text-ash uppercase">
              {brand.identity.name} · {brand.contact.location.split(",")[0]}
            </p>
          </div>
        </div>

        {/* ---------------- Imagen pegajosa ---------------- */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="relative aspect-4/5 overflow-hidden bg-bone-2">
            {/* El contenedor mide 112% de alto y se desplaza dentro: es lo que
                permite mover la imagen sin que asomen los bordes. */}
            <m.div style={{ y: imageY }} className="absolute inset-x-0 -top-[6%] h-[112%]">
              <Image
                src="/placeholder/tee-ink.svg"
                alt="Detalle de la playera oversize"
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
              />
            </m.div>
          </div>
          <p className="mt-4 font-mono text-xs tracking-[0.16em] text-ash-2 uppercase">
            Lote 001 · Algodón 240 g
          </p>
        </div>
      </div>
    </section>
  );
}

/** Párrafo cuya opacidad avanza palabra por palabra con el scroll. */
function RevealWords({ text, progress }: { text: string; progress: MotionValue<number> }) {
  const words = text.split(" ");

  return (
    <p className="text-heading text-balance">
      {words.map((word, index) => {
        /* Cada palabra recibe su franja dentro del progreso global. La primera
           empieza en 0 y la última termina en 1, sin dejar huecos. */
        const start = index / words.length;
        const end = start + 1 / words.length;

        return (
          <Word key={`${word}-${index}`} progress={progress} range={[start, end]}>
            {word}
          </Word>
        );
      })}
    </p>
  );
}

/** Una palabra. Componente propio para poder usar hooks en cada instancia. */
function Word({
  children,
  progress,
  range,
}: {
  children: string;
  progress: MotionValue<number>;
  range: [number, number];
}) {
  const opacity = useTransform(progress, range, [0.18, 1]);

  return (
    /* `inline-block` + margen en lugar de un espacio literal: así el navegador
       nunca colapsa el espacio entre palabras y el salto de línea sigue
       funcionando con normalidad. */
    <span className="mr-[0.24em] inline-block">
      <m.span style={{ opacity }} className="inline-block">
        {children}
      </m.span>
    </span>
  );
}