"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/* -------------------------------------------------------------------------
   KineticHeadline
   ===========================================================================
   Enhancer de motion-anything. En servidores el h1 muestra el texto normal
   (LCP, SEO y "sin JS" lo ven de inmediato). Al montarse, divide cada
   `[data-kinetic]` en palabras o letras (`data-kinetic="letters"`) y las
   hace entrar escalonadas con el preset elegido en `data-kinetic-anim`.
   Bajo prefers-reduced-motion el texto queda visible de una vez.
   ------------------------------------------------------------------------- */

export function KineticHeadline({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const els = Array.from(root.querySelectorAll<HTMLElement>("[data-kinetic]"));
    if (els.length === 0) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    for (const el of els) {
      const mode = el.getAttribute("data-kinetic") ?? "words";
      const anim = el.getAttribute("data-kinetic-anim") ?? "rise";
      el.classList.add(`k-anim-${anim}`);

      const step = mode === "letters" ? 40 : 70;
      const text = el.textContent ?? "";
      el.textContent = "";

      const units = mode === "letters" ? text.split("") : text.split(/(\s+)/);
      let i = 0;

      for (const u of units) {
        if (u === "") continue;
        if (/^\s+$/.test(u)) {
          const sp = document.createElement("span");
          sp.className = "k-space";
          el.appendChild(sp);
          continue;
        }
        const s = document.createElement("span");
        s.className = "k-unit";
        s.textContent = u;
        s.style.setProperty("--k-delay", `${i * step}ms`);
        el.appendChild(s);
        i++;
      }
    }

    if (reduce) {
      for (const el of els) el.classList.add("is-in");
      return;
    }

    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        for (const el of els) el.classList.add("is-in");
      }),
    );

    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  );
}
