/**
 * Navegación de la tienda.
 * Se define aquí y no en los componentes para que el header, el footer y el
 * menú móvil consuman exactamente la misma fuente de verdad.
 */

export type NavItem = {
  label: string;
  href: string;
  /** Descripción corta, usada en el menú móvil y en el footer. */
  description?: string;
};

/**
 * Navegación principal — se mantiene deliberadamente corta.
 *
 * SOLO ENTRADAS CON PÁGINA REAL.
 * Un enlace a una ruta que no existe devuelve 404 y, peor, Next.js lo
 * prefetchea en cada navegación: la tienda gastaba una petición fallida por
 * enlace y por carga de página, y el visitante caía en una pantalla de error
 * desde el header y el footer. Las rutas que aún no existen van comentadas
 * abajo, con su etiqueta original, para reactivarlas el día que se construyan:
 * basta con descomentar la línea.
 */
export const mainNav: readonly NavItem[] = [
  { label: "Tienda", href: "/tienda", description: "Todas las playeras" },
  // { label: "Colecciones", href: "/colecciones", description: "Cápsulas y drops" },
  // { label: "Nosotros", href: "/nosotros", description: "Quiénes somos" },
  // { label: "Contacto", href: "/contacto", description: "Escríbenos" },
];

/**
 * Enlaces de servicio que aparecen en el footer.
 *
 * Vacía a propósito mientras no existan las páginas: el footer oculta la
 * columna "Ayuda" cuando esta lista no tiene entradas, en lugar de mostrar un
 * encabezado encima de nada.
 */
export const footerNav: readonly NavItem[] = [
  // { label: "Envíos", href: "/envios" },
  // { label: "Devoluciones", href: "/devoluciones" },
  // { label: "Guía de tallas", href: "/guia-de-tallas" },
  // { label: "Preguntas frecuentes", href: "/preguntas-frecuentes" },
  // { label: "Aviso de privacidad", href: "/aviso-de-privacidad" },
  // { label: "Términos y condiciones", href: "/terminos" },
];
