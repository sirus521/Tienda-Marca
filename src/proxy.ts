import { NextRequest, NextResponse } from "next/server";

/**
 * Protección de rutas del panel
 * ============================================================================
 * Next.js 16 renombró `middleware` a `proxy`. La función vive en `src/proxy.ts`
 * y corre en el "middleware function" de OpenNext, separado del Worker principal.
 *
 * LO QUE ESTE ARCHIVO HACE Y LO QUE NO
 * Aquí se comprueba solo que exista la cookie de sesión. No se valida contra D1:
 * el middleware function no recibe los bindings de Cloudflare de forma fiable, y
 * consultar la base en cada navegación tiraría abajo la mitad del tiempo de
 * respuesta. La validación real ocurre en el layout del panel y en cada Server
 * Action que toca datos.
 *
 * POR QUÉ NO DEJARLO SIN ESTO
 * Sin este filtro, cualquier ruta bajo `/admin` se renderizaría y luego fallaría
 * el layout con un 500 en vez de mandar a la pantalla de login. Además de peor
 * experiencia, eso es más código para depurar que un filtro explícito.
 */

/** Mismo nombre que `SESSION_COOKIE` en `src/lib/domain/auth.ts`. */
const SESSION_COOKIE = "ac_admin_session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /* El login tiene que ser accesible sin sesión: si se protegiera, el redirect
     que él mismo manda produciría un bucle infinito. */
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
