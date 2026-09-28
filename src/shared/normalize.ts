/** Marcas combinantes que deja `normalize('NFD')`: tildes, diéresis, la virgulilla de la ñ... */
const DIACRITICS = /\p{M}/gu

/**
 * Minúsculas y sin diacríticos: "Canción" → "cancion", "Ñandú" → "nandu". La usan la
 * búsqueda en la transcripción (renderer, tarea 14) y el filtro por texto del historial
 * (main, tarea 18), así las dos buscan igual.
 */
export function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(DIACRITICS, '')
}
