import { Reveal } from "@/components/motion/reveal";

/** Secretos de diseño que no se explican en ningún otro lado. */
const SECRETS = [
  {
    index: "01",
    title: "Sin glow",
    body:
      "No hay neón, ni blur radiante, ni gradientes luminosos. La jerarquía visual se construye con tipografía, contraste, escala y movimiento. La elevación es una sombra de papel dura y contenida — una línea de 1px, una ligera translateY, nada de halos.",
  },
  {
    index: "02",
    title: "Tipografía única",
    body:
      "Slab serif para los titulares (eco del logo) y grotesca para el cuerpo. Dos familias, ninguna callada. El display tiene tracking negativo y escala fluida hasta ~16vw — ahí está el golpe visual, no en adornos.",
  },
  {
    index: "03",
    title: "Espacio como producto",
    body:
      "Los bloques de sección usan hasta 9rem de padding. No es espacio muerto, es composición: el blanco es el soporte de la mayor parte de la página, y cada sección respira antes y después del producto.",
  },
  {
    index: "04",
    title: "Esquinas duras",
    body:
      "Radios de 1–3px, deliberados. Nada de pill shapes. Estética editorial y directa que no pelea contra el contenido: la forma se queda fuera y la jerarquía se mantiene en el contenido.",
  },
  {
    index: "05",
    title: "El header se queda quieto",
    body:
      "Cuando el visitante baja, la cabecera se va: el contenido toma el espacio. Al subir, reaparece con fundido para que la navegación vuelva sin costo visual. Así la portada no se fragmenta en una lista de secciones.",
  },
  {
    index: "06",
    title: "Monocromo + un solo acento",
    body:
      "Ink, bone, ash y line son la banda base. A la tinta se superpone un solo acento — el bronce del \"EST. 2026\" — con uso quirúrgico. Resultado: atemporal, y cualquier color de producto se lee inmediatamente por contraste.",
  },
] as const;

/**
 * Secretos de diseño
 *
 * Contenido que explica lo que NO es obvio al mirar la tienda: cómo se
 * construye la estética y por qué se decidió que así. Sirve a dos públicos:
 * · quien anda buscando una marca con estilo coherente (le da confianza)
 * · quien quiere saber por qué la tienda se ve así y no de otra forma
 *
 * Por qué aparecer después de los valores y antes de los avisos:
 * · Valores = por qué la marca (contenido)
 * · Secretos = cómo la marca se ve (estilo)
 * · Avisos = lo que puedes hacer (acción)
 * El orden es intencional.
 */
export function DesignSecrets() {
  return (
    <section className="border-y border-line">
      <div className="container-ac py-section">
        <span className="eyebrow">04 / 04</span>

        <h2 className="mt-4 max-w-2xl text-title">Detalles de diseño</h2>

        <dl className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {SECRETS.map((secret) => (
            <Reveal as="div" key={secret.index} delay={0.05}>
              <div className="border-t border-line-strong">
                <span className="eyebrow">{secret.index}</span>
                <dt className="mt-4 text-heading">{secret.title}</dt>
                <dd className="mt-3 text-sm leading-relaxed text-ash">{secret.body}</dd>
              </div>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}