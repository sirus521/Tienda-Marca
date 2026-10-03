import { redirect } from "next/navigation";

import { getAdminSessionFromRequest } from "@/lib/server/admin-session";

/**
 * Login
 * ============================================================================
 * Página pública del panel. Si ya hay sesión válida, va directa al panel:
 * que alguien que ya está dentro vuelva a ver el formulario es ruido.
 */
export const metadata = {
  title: "Entrar",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const session = await getAdminSessionFromRequest();

  if (session) {
    redirect(typeof next === "string" ? next : "/admin");
  }

  /* Lazy import para que el formulario —que es cliente— no empuje el código de
     la página al bundle de login si nunca se carga. */
  const { LoginForm } = await import("@/components/auth/login-form");

  return (
    <div className="container-ac pt-16 pb-section lg:pt-20">
      <header className="pb-10">
        <span className="eyebrow">AC · Panel</span>
        <h1 className="mt-5 text-display">Entrar</h1>
        <p className="mt-4 max-w-md text-lead text-ash">
          Acceso para quien opera la tienda. Si no tienes cuenta, pide el alta a quien administra el
          sitio.
        </p>
      </header>

      <div className="max-w-md">
        <LoginForm next={typeof next === "string" ? next : undefined} />
      </div>
    </div>
  );
}
