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

/** Navegación principal — se mantiene deliberadamente corta. */
export const mainNav: readonly NavItem[] = [
  { label: "Tienda", href: "/tienda", description: "Todas las playeras" },
  { label: "Colecciones", href: "/colecciones", description: "Cápsulas y drops" },
  { label: "Nosotros", href: "/nosotros", description: "Quiénes somos" },
  { label: "Contacto", href: "/contacto", description: "Escríbenos" },
];

/** Enlaces de servicio que aparecen en el footer. */
export const footerNav: readonly NavItem[] = [
  { label: "Envíos", href: "/envios" },
  { label: "Devoluciones", href: "/devoluciones" },
  { label: "Guía de tallas", href: "/guia-de-tallas" },
  { label: "Preguntas frecuentes", href: "/preguntas-frecuentes" },
  { label: "Aviso de privacidad", href: "/aviso-de-privacidad" },
  { label: "Términos y condiciones", href: "/terminos" },
];