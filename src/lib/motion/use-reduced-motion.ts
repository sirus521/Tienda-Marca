/**
 * Hook reactivo: prefiere el visitante movimiento reducido?
 *
 * Usado por componentes que pueden animar. Cuando el sistema operativo pide
 * menos movimiento, todos los efectos se desactivan y solo ocurre el cambio
 * de estado necesario.
 */
import { useReducedMotion as motionUseReducedMotion } from "motion/react";

/**
 * Reactivo: devuelve `true` cuando el visitante prefiere movimiento reducido.
 *
 * Motion ya incluye su propio hook `useReducedMotion` que consulta la media
 * query del sistema y se mantiene sincronizado si el usuario cambia la
 * configuración mientras la página está abierta. Lo usamos aquí.
 *
 * Los componentes que animan deben verificar esto antes de activar
 * animaciones. Cuando es `true`, solo ocurre el cambio de estado necesario.
 */
export function useReducedMotion(): boolean {
  const value = motionUseReducedMotion();
  return value === true;
}
