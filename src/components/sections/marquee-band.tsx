import { Marquee } from "@/components/ui/marquee";

/** Frases que se repiten en la banda. Separadas por el monograma. */
const PHRASES = [
  "Algodón pesado",
  "Corte boxy",
  "Producción corta",
  "Confeccionado en México",
  "Sin temporadas",
] as const;

/**
 * Banda en movimiento.
 *
 * Función: dar movimiento continuo a la página sin pedirle nada al usuario y
 * sin depender del scroll. Entre dos secciones estáticas, esta banda mantiene
 * la página viva mientras se lee.
 *
 * Sobre papel invertido (tinta) para partir visualmente la portada en tercios:
 * claro, oscuro, claro. Ese contraste duro es lo que hace que el diseño se
 * sienta intencional y no una sucesión de bloques iguales.
 *
 * La animación es CSS (`transform`), así que corre en la GPU y no cuesta
 * JavaScript. Detalle accesible: la segunda copia del contenido va con
 * `aria-hidden` para que el lector de pantalla no lea la lista dos veces.
 */
export function MarqueeBand() {
  return (
    <section
      aria-label="Características de nuestras prendas"
      className="border-y border-line-ink bg-ink py-6 text-bone"
    >
      <Marquee duration={44}>
        {PHRASES.map((phrase) => (
          <span key={phrase} className="flex items-center gap-8 px-8">
            <span className="font-display text-2xl whitespace-nowrap sm:text-3xl">{phrase}</span>
            {/* El separador es el monograma a tamaño pequeño. Refuerza marca
                sin convertirse en un adorno. */}
            <span aria-hidden="true" className="font-mono text-xs tracking-[0.2em] text-bronze-2">
              AC
            </span>
          </span>
        ))}
      </Marquee>
    </section>
  );
}