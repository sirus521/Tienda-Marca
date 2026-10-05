"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/* -------------------------------------------------------------------------
   ScrollFloat
   ===========================================================================
   Enhancer de motion-anything para títulos de sección: cada palabra flota
   hacia arriba y asienta al entrar en el viewport (una sola vez). El h2 se
   sirve con el texto plano desde el servidor (SEO/LCP intactos); al montarse
   client-side lo divide y, al hacer scroll, entra. Bajo reduced-motion —
   visible de inmediato.
   ------------------------------------------------------------------------- */

export function ScrollFloat({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const text = el.textContent ?? "";
    el.textContent = "";

    const parts = text.split(/(\s+)/);
    let i = 0;

    for (const p of parts) {
      if (p === "") continue;
      if (/^\s+$/.test(p)) {
        const sp = document.createElement("span");
        sp.className = "sf-sp";
        el.appendChild(sp);
        continue;
      }
      const w = document.createElement("span");
      w.className = "sf-w";
      w.textContent = p;
      w.style.setProperty("--sf-d", `${i * 70}ms`);
      el.appendChild(w);
      i++;
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      el.classList.add("in");
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            el.classList.add("in");
            io.unobserve(el);
          }
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);

    return () => io.disconnect();
  }, []);

  return (
    <h2 ref={ref} data-scroll-float="" className={cn(className)}>
      {children}
    </h2>
  );
}
