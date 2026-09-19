import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * ESLint — configuración plana (flat config)
 * ============================================================================
 * `eslint-config-next` v16 ya exporta configuración plana nativa, así que NO se
 * usa `FlatCompat`. Se intentó primero con `FlatCompat` siguiendo el ejemplo
 * antiguo de Next y falla en ESLint 9.39:
 *
 *   TypeError: Converting circular structure to JSON
 *     ... property 'plugins' -> ... property 'react' closes the circle
 *
 * El validador de esquemas antiguo intenta serializar el plugin de React, que
 * tiene referencias circulares. Usar la exportación nativa elimina la capa de
 * traducción —y con ella `@eslint/eslintrc`— y el problema desaparece.
 *
 * Ambas exportaciones son arreglos, así que se combinan con el operador
 * spread en orden: primero las reglas base, luego las de TypeScript.
 */
const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".open-next/**",
      ".wrangler/**",
      "drizzle/**",
      "next-env.d.ts",
    ],
  },

  /* Reglas de Next + accesibilidad + React. */
  ...nextCoreWebVitals,

  /* Reglas de typescript-eslint. */
  ...nextTypescript,

  {
    rules: {
      /* Preferimos tipos explícitos sobre `any` silencioso. */
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "prefer-const": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
];

export default eslintConfig;