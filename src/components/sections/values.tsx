import { Reveal } from "@/components/motion/reveal";

/** Los cuatro compromisos. Cortos a propósito: una promesa larga no se lee. */
const VALUES = [
  {
    index: "01",
    title: "Algodón pesado",
    body: "240 g/m² hacia arriba. La tela sostiene la forma y no se transparenta a contraluz.",
  },
  {
    index: "02",
    title: "Corte boxy",
    body: "Recto y ancho, con hombro caído. Cae sin pegarse al cuerpo ni hacer bolsa.",
  },
  {
    index: "03",
    title: "Lotes cortos",
    body: "Se corta poco y se repone solo lo que funciona. Sin liquidaciones ni temporadas.",
  },
  {
    index: "04",
    title: "Hecho en México",
    body: "Confeccionado en talleres locales. Revisamos costura y cuello pieza por pieza.",
  },
] as const;

/**
 * Compromisos de marca.
 *
 * Por qué existe esta sección: en una tienda de ropa el visitante no puede
 * tocar la tela. Estas cuatro líneas son lo que responde "¿por qué debería
 * confiar en esta marca?" antes de que vea el precio. Es contenido que
 * reduce devoluciones, no relleno.
 *
 * El `Reveal` va con desfase por índice, pero menor que en los destacados
 * (70 ms): son bloques de texto cortos y una cascada lenta se siente pesada.
 */
export function Values() {
  return (
    <section className="border-y border-line bg-bone-2/60">
      <div className="container-ac py-section">
        <span className="eyebrow">03 / 04</span>

        <h2 className="mt-4 max-w-3xl text-title">Cuatro cosas que no negociamos</h2>

        <ul className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((value, index) => (
            <Reveal as="li" key={value.index} delay={index * 0.07}>
              <div className="border-t border-line-strong pt-5">
                {/* La numeración en mono es el hilo visual que conecta esta
                    sección con el resto del sitio. */}
                <span className="eyebrow">{value.index}</span>
                <h3 className="mt-4 text-lg font-medium">{value.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ash">{value.body}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}