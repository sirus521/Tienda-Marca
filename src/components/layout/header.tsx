"use client";

import { AnimatePresence, m, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { LogoMark } from "@/components/brand/logo-mark";
import { brand } from "@/config/brand";
import { mainNav } from "@/config/nav";
import { easeOutExpo } from "@/lib/motion/tokens";
import { cartStore, useCartCount } from "@/lib/stores/cart-store";
import { cn } from "@/lib/utils/cn";

/**
 * Header
 * ============================================================================
 * Tres comportamientos combinados:
 *
 *  1. Se oculta al bajar y reaparece al subir. En móvil es el patrón que más
 *     superficie útil devuelve. Reaparece en cuanto el usuario sube, porque
 *     eso indica que busca navegar.
 *  2. Gana fondo y borde al separarse del tope: arriba es transparente para
 *     que el hero respire; al scrollear necesita delimitarse del contenido.
 *  3. Menú de pantalla completa en móvil, con items escalonados.
 *
 * Detalles que importan:
 *  · `position: sticky` y no `fixed`: la cabecera sigue ocupando su lugar en
 *    el flujo, así que al ocultarse no queda un hueco ni salta el contenido.
 *  · El menú se cierra al navegar y con la tecla Escape. Sin esto el usuario
 *    navega y queda atrapado con el panel abierto.
 *  · El fondo usa `backdrop-blur`: desenfoque, no glow. Difumina lo que pasa
 *    por debajo sin emitir luz, que es justo lo que la marca prohíbe.
 */
export function Header() {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    setScrolled(latest > 16);

    /* Con el menú abierto no se oculta: sería desconcertante. */
    if (menuOpen) return;

    /* El umbral de 140px evita que la cabecera parpadee con micro-scrolls. */
    if (latest > previous && latest > 140) {
      setHidden(true);
    } else {
      setHidden(false);
    }
  });

  /* ---------------------------------------------------------------------
     Cerrar el menú al cambiar de ruta.

     POR QUÉ NO ES UN `useEffect`
     La versión inicial usaba `useEffect(() => setMenuOpen(false), [pathname])`
     y ESLint lo marcó con razón (`react-hooks/set-state-in-effect`): llamar a
     `setState` de forma síncrona dentro de un efecto provoca un render en
     cascada —se pinta el estado viejo, luego el efecto, luego otro render— y
     además deja un cuadro visible con el menú abierto sobre la ruta nueva.

     El patrón correcto y documentado por React ("ajustar estado cuando cambia
     una prop") es comparar durante el render y reiniciar ahí mismo. React
     descarta el render en curso y vuelve a empezar con el estado nuevo, sin
     llegar a pintar el estado intermedio.
     --------------------------------------------------------------------- */
  const [lastPathname, setLastPathname] = useState(pathname);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMenuOpen(false);
  }

  /* Bloquear el scroll con el menú abierto, y cerrarlo con Escape. */
  useEffect(() => {
    const root = document.documentElement;

    if (menuOpen) {
      root.classList.add("no-scroll");
    } else {
      root.classList.remove("no-scroll");
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    if (menuOpen) window.addEventListener("keydown", onKeyDown);

    return () => {
      root.classList.remove("no-scroll");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const cartCount = useCartCount();
  const openCart = cartStore((state) => state.open);

  return (
    <m.header
      animate={{ y: hidden && !prefersReducedMotion ? "-100%" : "0%" }}
      transition={{ duration: 0.4, ease: easeOutExpo }}
      className={cn(
        "sticky top-0 z-40 w-full transition-colors duration-500",
        scrolled ? "border-b border-line bg-bone/85 backdrop-blur-md" : "border-b border-transparent",
      )}
    >
      <div className="container-ac">
        <div className="flex h-16 items-center justify-between gap-6 lg:h-20">
          {/* ---------------- Marca ---------------- */}
          <Link
            href="/"
            aria-label={`${brand.identity.name} — inicio`}
            className="flex shrink-0 items-center gap-2.5"
            onClick={() => setMenuOpen(false)}
          >
            <LogoMark className="w-8 text-ink lg:w-9" />
          </Link>

          {/* ---------------- Navegación de escritorio ---------------- */}
          <nav aria-label="Navegación principal" className="hidden lg:block">
            <ul className="flex items-center gap-9">
              {mainNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    data-active={isActive(item.href)}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className="link-underline font-mono text-label text-ink uppercase"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* ---------------- Acciones ---------------- */}
          <div className="flex items-center gap-1">
            {/*
              El disparador del drawer. Un botón y no un enlace porque su
              acción es abrir el panel, no navegar: si fuera un `<a>` habría
              que.preventDefault o fingir la navegación, y quien navega con
              teclado o lector de pantalla oiría "enlace" para algo que no
              lleva a otra página.

              El contador viene del store. Devuelve 0 antes de hidratar, así que
              el servidor y el primer render coinciden y no hay desajuste.

              La página completa de la bolsa sigue siendo alcanzable desde el
              pie del drawer ("Ir a la bolsa"), que es donde se espera encontrarla.
            */}
            <button
              type="button"
              onClick={openCart}
              className="inline-flex h-11 items-center gap-2 px-3 font-mono text-label text-ink uppercase transition-colors duration-300 hover:bg-bone-2"
            >
              Bolsa
              <span className="tabular-nums opacity-45">({cartCount})</span>
            </button>

            {/* Botón del menú móvil. Visible solo por debajo de lg. */}
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="menu-movil"
              className="-mr-1 inline-flex size-11 items-center justify-center lg:hidden"
            >
              <span className="sr-only">{menuOpen ? "Cerrar menú" : "Abrir menú"}</span>
              {/* Dos líneas que se cruzan al abrir: se lee como "cerrar". */}
              <span className="relative block h-4 w-6" aria-hidden="true">
                <span
                  className={cn(
                    "absolute left-0 block h-px w-6 bg-ink transition-transform duration-300 ease-out-expo",
                    menuOpen ? "top-1/2 rotate-45" : "top-[30%]",
                  )}
                />
                <span
                  className={cn(
                    "absolute left-0 block h-px w-6 bg-ink transition-transform duration-300 ease-out-expo",
                    menuOpen ? "top-1/2 -rotate-45" : "top-[70%]",
                  )}
                />
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ---------------- Menú móvil ---------------- */}
      <AnimatePresence>
        {menuOpen ? (
          <m.div
            id="menu-movil"
            key="menu-movil"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.28 }}
            className="fixed inset-0 top-16 z-30 bg-bone lg:hidden"
          >
            <nav aria-label="Navegación principal" className="container-ac pt-10 pb-16">
              <ul className="flex flex-col">
                {mainNav.map((item, index) => (
                  <m.li
                    key={item.href}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: prefersReducedMotion ? 0 : 0.5,
                      delay: prefersReducedMotion ? 0 : 0.04 * index,
                      ease: easeOutExpo,
                    }}
                    className="border-b border-line"
                  >
                    <Link
                      href={item.href}
                      className="flex items-baseline justify-between gap-4 py-5"
                      onClick={() => setMenuOpen(false)}
                    >
                      <span className="font-display text-heading">{item.label}</span>
                      <span className="eyebrow">
                        {String(index + 1).padStart(2, "0")} /{" "}
                        {String(mainNav.length).padStart(2, "0")}
                      </span>
                    </Link>
                  </m.li>
                ))}
              </ul>
            </nav>
          </m.div>
        ) : null}
      </AnimatePresence>
    </m.header>
  );
}