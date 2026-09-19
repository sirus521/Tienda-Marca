import { FeaturedProducts } from "@/components/sections/featured-products";
import { Hero } from "@/components/sections/hero";
import { MarqueeBand } from "@/components/sections/marquee-band";
import { NoticeList } from "@/components/sections/notice-list";
import { Story } from "@/components/sections/story";
import { Values } from "@/components/sections/values";

/**
 * Portada
 * ============================================================================
 * Componente de servidor. Ensambla las secciones y nada más: cada una es
 * responsable de sus propios datos y de su propia animación.
 *
 * ORDEN Y RITMO
 * La secuencia alterna fondos claros y oscuros para que la página tenga
 * cadencia en lugar de ser una lista uniforme de bloques:
 *
 *   Hero        papel  · impacto tipográfico, la promesa
 *   Destacados  papel  · el producto (lo que la persona vino a ver)
 *   Banda       tinta  · corte visual, respiro, movimiento continuo
 *   Story       papel  · por qué la marca, con scroll narrativo
 *   Valores     hueso  · los compromisos, en columnas cortas
 *   Avisos      papel  · cierre con acción
 *
 * El renderizado es estático con revalidación por tiempo (ISR). El catálogo
 * cambia poco, así que no tiene sentido consultar la base de datos en cada
 * visita: se sirve desde el borde y se regenera cada 5 minutos. Cuando el
 * panel de administración publique un producto, se invalidará esta ruta al
 * instante con `revalidatePath`, sin esperar a que expire.
 */
export const revalidate = 300;

export default function HomePage() {
  return (
    <>
      <Hero />
      <FeaturedProducts />
      <MarqueeBand />
      <Story />
      <Values />
      <NoticeList />
    </>
  );
}