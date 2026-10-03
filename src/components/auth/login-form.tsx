"use client";

import { useActionState } from "react";

import { loginAction } from "@/app/admin/login/actions";
import { initialLoginState } from "@/app/admin/login/state";
import { Button } from "@/components/ui/button-client";
import { TextField } from "@/components/ui/field";

/**
 * Formulario de entrada
 * ============================================================================
 * Client Component porque usa `useActionState`, que es el que permite mostrar
 * el error sin perder lo que se escribió en el otro campo y deshabilitar el
 * botón mientras el servidor responde.
 */
export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, isPending] = useActionState(loginAction, initialLoginState);

  const fieldError = (field: string) => state.fieldErrors?.[field];

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {state.status === "error" && state.message ? (
        <p role="alert" className="border border-danger px-4 py-3 text-sm text-danger">
          {state.message}
        </p>
      ) : null}

      <TextField
        label="Correo"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={fieldError("email")}
        placeholder="admin@ac.mx"
      />

      <TextField
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={fieldError("password")}
      />

      <Button type="submit" fullWidth disabled={isPending}>
        {isPending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
