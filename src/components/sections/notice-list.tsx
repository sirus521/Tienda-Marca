"use client";

import { useState } from "react";
import { z } from "zod";

import { buttonStyles } from "@/components/ui/button";
import { brand, isContactConfigured } from "@/config/brand";
import { cn } from "@/lib/utils/cn";

/**
 * Valida el teléfono mexicano.
 * Acepta 10 dígitos, con o sin lada de país, ignorando espacios, guiones y
 * paréntesis — porque así lo escribe la gente.
 */
const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[^\d]/g, ""))
  .refine((digits) => digits.length === 10 || (digits.length === 12 && digits.startsWith("52")), {
    message: "Escribe tu teléfono a 10 dígitos.",
  });

type Status = { kind: "idle" } | { kind: "error"; message: string } | { kind: "done" };

/**
 * Lista de avisos
 * ============================================================================
 * DECISIÓN DE PRODUCTO
 * No hay campo de correo. En una marca de ropa que vende por WhatsApp, un
 * número de teléfono vale mucho más que un email: es el canal por el que
 * realmente se cierra la venta y por el que se avisa de un nuevo lote.
 *
 * POR QUÉ NO GUARDA EN UNA BASE DE DATOS
 * Todavía no existe. Fingir un registro que se pierde en el vacío sería peor
 * que no tenerlo: el usuario creería que quedó suscrito y no recibiría nada.
 * Así que el envío abre directamente una conversación de WhatsApp con el
 * número ya escrito. Funciona hoy, sin backend, y el dueño recibe el contacto
 * de verdad.
 *
 * Cuando la Fase 4 conecte D1, esta sección puede ganar un campo de correo y
 * guardar en la tabla `newsletter_subscribers` sin cambiar el diseño.
 */
export function NoticeList() {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const configured = isContactConfigured();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = phoneSchema.safeParse(phone);
    if (!parsed.success) {
      setStatus({ kind: "error", message: parsed.error.issues[0]?.message ?? "Teléfono inválido." });
      return;
    }

    const message = [
      `¡Hola ${brand.identity.name}!`,
      "",
      "Quiero entrar a la lista de avisos de nuevos lotes.",
      `Mi teléfono es ${parsed.data}.`,
    ].join("\n");

    window.open(
      `https://wa.me/${brand.contact.whatsapp}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
    setStatus({ kind: "done" });
  }

  return (
    <section className="border-b border-line">
      <div className="container-ac py-section">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-24">
          <div>
            <span className="eyebrow">04 / 04</span>
            <h2 className="mt-4 text-title">Avisos de nuevos lotes</h2>
            <p className="mt-5 max-w-md text-ash">
              Se produce poco y se repone sin calendario. Déjanos tu teléfono y te avisamos cuando
              entre un lote nuevo, antes de que salga a la tienda.
            </p>
          </div>

          <div className="lg:pt-10">
            {configured ? (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex-1">
                  <label htmlFor="telefono-avisos" className="eyebrow block">
                    Teléfono
                  </label>
                  <input
                    id="telefono-avisos"
                    name="telefono"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="81 1234 5678"
                    value={phone}
                    onChange={(event) => {
                      setPhone(event.target.value);
                      if (status.kind !== "idle") setStatus({ kind: "idle" });
                    }}
                    /* `aria-invalid` + `aria-describedby` conectan el error con
                       el campo para quien usa lector de pantalla. Sin esto el
                       error es visible pero no audible. */
                    aria-invalid={status.kind === "error"}
                    aria-describedby="estado-avisos"
                    className={cn(
                      "mt-3 h-11 w-full rounded-sm border bg-transparent px-3 text-base",
                      "transition-colors duration-300 placeholder:text-ash-2",
                      status.kind === "error" ? "border-danger" : "border-line-strong",
                    )}
                  />
                </div>

                <button type="submit" className={cn(buttonStyles({ size: "lg" }), "sm:mt-8")}>
                  Avisarme
                </button>
              </form>
            ) : (
              /* Configuración pendiente. Se avisa en pantalla en lugar de
                 mostrar un formulario que no lleva a ningún lado. Mismo
                 criterio que el checkout. */
              <p className="rounded-sm border border-line-strong bg-bone-2/60 p-5 text-sm text-ash">
                Falta configurar el número de WhatsApp de la marca para activar esta sección. Se
                define en <code className="font-mono text-xs">src/config/brand.ts</code> o desde
                Ajustes en el panel.
              </p>
            )}

            {/* Región de estado: se anuncia sola al cambiar, sin mover el foco. */}
            <p
              id="estado-avisos"
              role="status"
              aria-live="polite"
              className={cn(
                "mt-4 min-h-5 font-mono text-xs tracking-[0.14em] uppercase",
                status.kind === "error" ? "text-danger" : "text-ash",
              )}
            >
              {status.kind === "error" ? status.message : null}
              {status.kind === "done" ? "Listo — se abrió WhatsApp" : null}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}