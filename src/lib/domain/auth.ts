import { Buffer } from "node:buffer";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Autenticación del panel
 * ============================================================================
 * Lógica pura: sin D1, sin cookies, sin Next. Hash y verificación de contraseñas,
 * generación de tokens de sesión y normalización de correo.
 *
 * POR QUÉ NO UNA LIBRERÍA
 * `session_tokens` ya tiene las columnas que hacen falta —`token`, `expires_at`,
 * `ip_address`, `user_agent`— así que un panel de administración no obliga a
 * migrar nada. Lo que faltaba era escribir unas 160 líneas que se puedan leer
 * enteras, y esa es exactamente la propiedad que se pierde al añadir una capa
 * de conceptos ajenos.
 *
 * POR QUÉ SCRYPT Y NO PBKDF2
 * scrypt es *memory-hard*: obliga al atacante a gastar RAM además de CPU, así
 * que el coste de adivinar una contraseña no baja aunque el atacante tenga
 * mejor hardware. Por precio de CPU, además, sale más barato que PBKDF2 con
 * las iteraciones necesarias para igualar su seguridad.
 *
 * WebCrypto no sirve aquí: `crypto.subtle` no implementa scrypt, solo PBKDF2 y
 * HKDF. Por eso se usa `node:crypto`, que sí está disponible porque
 * `wrangler.jsonc` declara `compatibility_flags: ["nodejs_compat"]`.
 *
 * `Buffer` se importa explícitamente de `node:buffer` y no del global, y no es
 * cosmético: `@cloudflare/workers-types` declara un `Buffer` global cuyo
 * `toString()` **no acepta encoding**, así que sin este import
 * `buffer.toString("base64")` no compila.
 *
 * COSTE EN WORKERS —leer antes de tocar esto
 * scrypt con N=16384 consume del orden de 30-60 ms de CPU por login. El plan
 * gratuito de Workers da 10 ms de CPU por invocación, así que **en el plan
 * gratuito el login puede morirse por límite de CPU**. Con plan de pago (30 s)
 * no hay problema. Se mide una vez en producción real y se ajusta `SCRYPT_N` si
 * hiciera falta.
 */

const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
) => Promise<Buffer>;

/**
 * Parámetros de scrypt.
 *
 * `N=16384, r=8, p=1` es el default de Node, no un número arbitrario.
 * Memoria usada: 128·N·r = 16 MiB por login, tolerable para un panel donde el
 * tráfico es de personas, no de bots.
 */
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;
const SALT_BYTES = 16;

/**
 * Cómo vive el formato de un hash almacenado:
 * `scrypt$N$r$p$saltBase64$hashBase64`
 *
 * Los parámetros van dentro del string a propósito. Subirlos a futuro no obliga
 * a rehashear nada: al verificar se leen del hash guardado, así que las
 * contraseñas viejas siguen entrando y se pueden migrar en el login siguiente.
 */
const HASH_PREFIX = "scrypt";

/**
 * Nombre de la cookie de sesión.
 *
 * Sin prefijo `__Host-` a propósito: ese prefijo obliga a `Secure` y `Path=/`
 * en todos los entornos, y en `http://localhost` el navegador rechaza cookies
 * `Secure`, lo que rompería el login en desarrollo. Como el panel solo existe
 * bajo HTTPS en producción, el nombre explícito y los flags correctos bastan.
 */
export const SESSION_COOKIE = "ac_admin_session";

/** Duración de una sesión: 12 horas. */
export const SESSION_TTL_HOURS = 12;

/**
 * Longitud mínima de contraseña.
 *
 * 12 caracteres, no 8. Es la única defensa contra contraseñas tipo
 * `ac-marca-2026`, que es exactamente lo que alguien Pondría en una tienda
 * propia donde sabe que nadie más entra.
 */
export const PASSWORD_MIN_LENGTH = 12;

export const PASSWORD_MAX_LENGTH = 200;

/**
 * Normaliza un correo para comparar.
 *
 * Minúsculas y sin espacios: `Admin@AC.mx` y `admin@ac.mx` son la misma cuenta.
 * El dominio NO se modifica más allá de la minúscula: `gmail.com` y
 * `googlemail.com` son la misma bandeja pero tratarlos como uno rompería el
 * login de quien use el segundo.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Valida el correo de forma conservadora: lo que se guarda es lo que se usa. */
export function isValidEmail(email: string): boolean {
  const value = normalizeEmail(email);
  /* La regla de HTML es más laxa que la de RFC y por eso sirve aquí: no acepta
     espacios ni dos @, que es lo que de verdad importa filtrar. */
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

/**
 * Valida una contraseña. Devuelve `null` si vale, o el motivo del rechazo.
 *
 * El motivo se devuelve en vez de lanzar porque se muestra tal cual en el
 * formulario: "muy corta" es accionable, un error genérico no.
 */
export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `La contraseña necesita al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    /* Tope alto porque scrypt es lento a propósito: una contraseña de 50 MB
       sería una denegación de servicio pagada con tu propio CPU. */
    return `La contraseña no puede pasar de ${PASSWORD_MAX_LENGTH} caracteres.`;
  }
  return null;
}

/**
 * Hashea una contraseña.
 *
 * Devuelve el string listo para guardar en `admin_users`/`admin_accounts`.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = await scrypt(password.normalize("NFKC"), salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });

  return [
    HASH_PREFIX,
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

/**
 * Verifica una contraseña contra un hash guardado.
 *
 * Devuelve `false` —nunca lanza— ante cualquier hash corrupto o de otro
 * algoritmo. Un registro mal formado significa "no entra", y hacer que el login
 * reventara por eso convertiría un dato malo en una pantalla de error 500.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, nRaw, rRaw, pRaw, saltB64, hashB64] = stored.split("$");
  if (algorithm !== HASH_PREFIX) return false;

  /* Desestructurar en vez de indexar: con `noUncheckedIndexedAccess` el acceso
     por posición devuelve `string | undefined`, y un `!` para callárselo sería
     justo el tipo de aserción que esconde un bug. Comprobar que no falta nada
     además cubre el caso de un hash truncado. */
  if (!nRaw || !rRaw || !pRaw || !saltB64 || !hashB64) return false;

  const N = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
  /* N tiene que ser potencia de dos y scrypt lo exige: sin esta comprobación un
     hash corrupto con N=1 degeneraría en algo trivialmente rápido de calcular,
     y una credencial robada se verificaría en microsegundos. */
  if (N < 2 || (N & (N - 1)) !== 0 || N > 2 ** 20) return false;

  /* `Buffer.from` con base64 no lanza nunca: ante basura devuelve un búfer
     vacío o basura parcial. Por eso la comprobación de longitud de abajo es la
     que hace de guardia, y no un try/catch. */
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  if (salt.length === 0 || expected.length === 0) return false;

  try {
    const derived = await scrypt(password.normalize("NFKC"), salt, expected.length, { N, r, p });
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/**
 * Token de sesión en claro, para mandarlo en la cookie.
 *
 * 32 bytes de entropía en base64url: la cookie no es adivinable. La tabla
 * `session_tokens` NO guarda este valor, guarda su hash (ver `hashSessionToken`).
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Lo que se guarda en `session_tokens.token`.
 *
 * Es el SHA-256 del token, no el token. La diferencia importa: si alguien
 * descarga la base —un dump, una copia de seguridad, un backup que acaba en el
 * sitio equivocado— con el hash no puede reutilizar las sesiones. Con el token
 * en claro, sí.
 *
 * SHA-256 y no un hash lento porque el token ya tiene 256 bits de entropía
 * generados por CSPRNG: no hay diccionario que atacar, así que la lentitud solo
 * costaría CPU a cada petición.
 */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Momento de expiración de una sesión, en ISO. */
export function sessionExpiry(from: Date = new Date()): string {
  return new Date(from.getTime() + SESSION_TTL_HOURS * 60 * 60 * 1000).toISOString();
}

/** Una sesión con `expires_at` en el pasado no vale, aunque el token exista. */
export function isSessionExpired(expiresAt: string, now: Date = new Date()): boolean {
  const expiry = Date.parse(expiresAt);
  if (Number.isNaN(expiry)) return true;
  return expiry <= now.getTime();
}

/** Duración de la cookie, en segundos. Coincide con `SESSION_TTL_HOURS`. */
export const SESSION_COOKIE_MAX_AGE = SESSION_TTL_HOURS * 60 * 60;
