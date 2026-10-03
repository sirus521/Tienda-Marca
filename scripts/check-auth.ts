/**
 * Comprobación de la autenticación
 * ============================================================================
 * Ejecuta el roundtrip de scrypt, la forma de los tokens y las guardas de
 * validación. Sin runner de tests en el proyecto, así que es un script.
 *
 *   pnpm check:auth
 *
 * Existe porque `verifyPassword` devolvió `false` para todos los hashes durante
 * un rato por un `split("$")` desplazado, y ningún typecheck ni lint lo detecta:
 * un hash mal leído sigue siendo un `string`. Este script es lo que lo cazó, y
 * es la clase de error que más caro sale en autenticación —un panel que no
 * deja entrar a nadie parece un problema de configuración y se depura tarde.
 *
 * Importa por ruta relativa a propósito: corre con `node --experimental-strip-types`
 * como `db:seed`, que no resuelve el alias `@/*`.
 */

import {
  generateSessionToken,
  hashPassword,
  hashSessionToken,
  isSessionExpired,
  isValidEmail,
  normalizeEmail,
  sessionExpiry,
  validatePassword,
  verifyPassword,
} from "../src/lib/domain/auth.ts";

let failures = 0;

function check(label: string, condition: boolean): void {
  if (!condition) failures += 1;
  console.log(`${condition ? "  ok  " : " FALLA"} ${label}`);
}

async function checkPasswords(): Promise<void> {
  console.log("\nContraseñas");
  const password = "una-clave-larga-de-prueba-1234";
  const hash = await hashPassword(password);

  check("el formato incluye los parámetros", hash.startsWith("scrypt$16384$8$1$"));
  check("la contraseña correcta verifica", await verifyPassword(password, hash));
  check("la incorrecta no verifica", !(await verifyPassword("otra-cosa-distinta-999", hash)));

  /* Estas cuatro pruebas pasan "por casualidad" si `verifyPassword` devuelve
     `false` siempre, que es exactamente el bug que motivó el script. Por eso
     la del roundtrip va antes: si esa falla, las demás no significan nada. */
  check("otra cadena vacía no verifica", !(await verifyPassword("", hash)));
  check("un hash que no es hash no lanza", (await verifyPassword("x", "basura")) === false);
  check(
    "N que no es potencia de dos se rechaza",
    (await verifyPassword("x", "scrypt$3$8$1$QUFBQQ==$QUFBQQ==")) === false,
  );
  check(
    "un hash sin partes suficientes se rechaza",
    (await verifyPassword("x", "scrypt$16384$8$1$")) === false,
  );

  const [otherHash] = await Promise.all([hashPassword(password), hashPassword(password)]);
  check("misma contraseña, sales distintos", otherHash !== hash);
}

function checkTokens(): void {
  console.log("\nTokens de sesión");
  const token = generateSessionToken();

  check("son 43 caracteres base64url", token.length === 43 && !/[+/=]/.test(token));
  check("dos tokens nunca coinciden", token !== generateSessionToken());
  check("el hash guardado son 64 hex", /^[0-9a-f]{64}$/.test(hashSessionToken(token)));
  check("el hash es determinista", hashSessionToken(token) === hashSessionToken(token));
  check("el token nunca se guarda en claro", hashSessionToken(token) !== token);
}

function checkExpiry(): void {
  console.log("\nExpiración");
  const expiresAt = sessionExpiry(new Date("2026-01-01T00:00:00Z"));

  check("la sesión dura 12 horas", expiresAt === "2026-01-01T12:00:00.000Z");
  check("expirada en el pasado", isSessionExpired(expiresAt, new Date("2026-01-02T00:00:00Z")));
  check("viva en el futuro", !isSessionExpired(expiresAt, new Date("2026-01-01T06:00:00Z")));
  check("una fecha ilegible cuenta como expirada", isSessionExpired("no-es-fecha"));
}

function checkValidation(): void {
  console.log("\nValidación de entrada");
  check("normaliza correo y espacios", normalizeEmail("  Admin@AC.mx ") === "admin@ac.mx");
  check("acepta un correo válido", isValidEmail("admin@ac.mx"));
  check(
    "rechaza correo sin arroba, con espacio o vacío",
    !isValidEmail("admin@") && !isValidEmail("a b@c.mx") && !isValidEmail(""),
  );
  check("rechaza contraseña corta", validatePassword("corta123") !== null);
  check("acepta contraseña larga", validatePassword("esta-es-buena-1234") === null);
}

await checkPasswords();
checkTokens();
checkExpiry();
checkValidation();

console.log(failures === 0 ? "\nTodo correcto.\n" : `\n${failures} comprobación(es) fallida(s).\n`);
process.exit(failures === 0 ? 0 : 1);
