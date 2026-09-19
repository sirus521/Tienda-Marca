/**
 * PostCSS — Tailwind CSS v4 se ejecuta como plugin de PostCSS.
 * La configuración de diseño vive en `src/app/globals.css` con `@theme`.
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;