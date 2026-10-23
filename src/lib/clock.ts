/**
 * Hora actual en milisegundos. En el iPhone es la hora real; en el navegador la da el
 * simulador de GPS, que puede acelerarla (`clock.web.ts`).
 */
export function now(): number {
  return Date.now();
}
