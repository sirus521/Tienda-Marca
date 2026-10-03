/**
 * Alta de administrador
 * ============================================================================
 * Genera el SQL que crea un admin con su contraseña y lo escribe en stdout, para
 * pipedearlo a `wrangler d1 execute`.
 *
 *   pnpm db:create-admin -- --email admin@ac.mx --name "Dueña" --role owner
 *
 * POR QUÉ SQL POR STDOUT Y NO UN ARCHIVO
 * `db:seed` deja `scripts/seed.sql` en disco porque su contenido son precios y
 * descripciones, que no son secretos. Aquí el contenido incluye un hash de
 * contraseña: aunque sea un hash, no tiene por qué acabar en el disco. Por eso
 * no se escribe ningún archivo y el script solo canaliza.
 *
 * El progreso y los errores van a stderr, porque stdout es el SQL. Mezclarlos
 * rompería el pipe y el error aparecería como SQL inválido en Wrangler.
 *
 * POR QUÉ NO ES UN SEED
 * Un seed corre en cada despliegue y con una contraseña conocida en el
 * repositorio: cualquiera que sepa la URL podría entrar al panel. Este script
 * se ejecuta a mano, una vez, por alguien que ya tiene acceso a la base.
 */

import { createInterface } from "node:readline";

import {
  hashPassword,
  isValidEmail,
  normalizeEmail,
  validatePassword,
} from "../src/lib/domain/auth.ts";
import type { AdminRole } from "../src/lib/domain/types.ts";

const ROLES: readonly AdminRole[] = ["owner", "editor"];

function fail(message: string): never {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

function note(message: string): void {
  console.error(message);
}

/* ============================================================================
   ARGUMENTOS
   ============================================================================ */
const args = process.argv.slice(2);

function readFlag(name: string): string | undefined {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? undefined : args[index + 1];
}

const email = readFlag("email");
const name = readFlag("name");
const roleFlag = readFlag("role") ?? "owner";

if (args.includes("--help") || !email || !name) {
  note(`
  Uso:
    pnpm db:create-admin -- --email <correo> --name <nombre> [--role owner|editor]

  La contraseña se pide de forma interactiva. También se puede fijar con
  ADMIN_PASSWORD, que es lo cómodo para scripts:

    ADMIN_PASSWORD='...' pnpm db:create-admin -- --email admin@ac.mx --name Dueña
`);
  process.exit(email && name ? 0 : 1);
}

if (!isValidEmail(email)) fail(`"${email}" no es un correo válido.`);
if (name.trim().length < 2) fail("El nombre necesita al menos 2 caracteres.");
if (!ROLES.includes(roleFlag as AdminRole)) {
  fail(`El rol tiene que ser ${ROLES.join(" o ")}.`);
}

const role = roleFlag as AdminRole;

/* ============================================================================
   CONTRASEÑA
   ============================================================================
   Sin eco y sin confirmarla: pedirla dos veces es la forma más rápida de
   teclear mal una contraseña, y confirmarla solo añade pasos a un proceso que
   se ejecuta una vez cada varios meses. Si viene de `ADMIN_PASSWORD` ya se
   considera confirmada.
   ============================================================================ */
async function askPassword(): Promise<string> {
  const fromEnv = process.env.ADMIN_PASSWORD;
  if (fromEnv) return fromEnv;

  if (!process.stdin.isTTY) {
    fail("Sin terminal interactiva: fija ADMIN_PASSWORD para crear el admin.");
  }

  const rl = createInterface({ input: process.stdin, output: process.stderr, terminal: true });

  /* `readline` no sabe leer sin eco. Se intercepta la salida y se reescribe la
     última línea dejando solo los asteriscos, que es lo que un usuario espera
     ver. */
  const output = rl as unknown as {
    output: NodeJS.WriteStream;
    _writeToOutput?: (chunk: string) => void;
  };
  const write = output._writeToOutput?.bind(output);
  const passwordPrompt = "  Contraseña (mínimo 8 caracteres): ";
  output.output = {
    write(chunk: string) {
      if (chunk.includes(passwordPrompt)) {
        return write?.(chunk.replace(passwordPrompt, "".padEnd(passwordPrompt.length, "*")));
      }
      return write?.(chunk);
    },
  } as unknown as NodeJS.WriteStream;

  note("\n" + passwordPrompt);
  const answer = await new Promise<string>((resolve) => rl.question("", resolve));
  note("\n");
  rl.close();

  return answer;
}

const password = await askPassword();
const problem = validatePassword(password);
if (problem) fail(problem);

const hash = await hashPassword(password);

/* ============================================================================
   SQL
   ============================================================================
   `INSERT` y no `INSERT OR REPLACE`: repetir el alta con un correo que ya
   existe tiene que fallar, no reescribirle la contraseña a quien esté
   operando con ella. Es la diferencia entre un script reejecutable por
   descuido y uno que deja una cuenta viva con una credencial que su dueño nunca
   eligió.
   ============================================================================ */
const userId = `adm_${crypto.randomUUID().replaceAll("-", "")}`;
const accountId = `acc_${crypto.randomUUID().replaceAll("-", "")}`;
const now = new Date().toISOString();

const statements = [
  `-- Alta de administrador para ${normalizeEmail(email)}`,
  `-- Generado por scripts/create-admin.ts. NO versionar: contiene un hash.`,
  `INSERT INTO \`admin_users\` (\`id\`, \`name\`, \`email\`, \`email_verified\`, \`role\`, \`is_active\`, \`created_at\`, \`updated_at\`)
   VALUES ('${userId}', '${name.replaceAll("'", "''")}', '${normalizeEmail(email)}', 1, '${role}', 1, '${now}', '${now}');`,
  `INSERT INTO \`admin_accounts\` (\`id\`, \`user_id\`, \`account_id\`, \`provider_id\`, \`password\`, \`created_at\`, \`updated_at\`)
   VALUES ('${accountId}', '${userId}', '${userId}', 'credential', '${hash}', '${now}', '${now}');`,
];

process.stdout.write(statements.join("\n") + "\n");

note(`
  Admin ${normalizeEmail(email)} listo como ${role}.
  Si el correo ya existía, el INSERT fallará y no se creará nada.
`);
