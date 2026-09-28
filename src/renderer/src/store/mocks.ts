// Datos de ejemplo para maquetar la ventana (tarea 03). Se reemplazan por los servicios reales:
// historial (18), transcripción en vivo (13) y cola (17).
import type { HistoryEntry, QueueJob, Segment } from '@shared/types'

const DAY_MS = 24 * 60 * 60 * 1000
const now = Date.now()
const ago = (days: number, hours = 0): number => now - days * DAY_MS - hours * 60 * 60 * 1000

function entry(
  id: string,
  fileName: string,
  createdAt: number,
  status: HistoryEntry['status'],
  durationSec: number,
  extra: Partial<HistoryEntry> = {}
): HistoryEntry {
  return {
    id,
    filePath: `C:\\Users\\Demo\\Videos\\${fileName}`,
    fileName,
    durationSec,
    model: 'small',
    language: 'es',
    backend: 'cuda',
    createdAt,
    status,
    ...extra
  }
}

export const mockHistory: HistoryEntry[] = [
  entry('h1', '001 A Practical Example of Rebase.mp4', ago(0, 0.2), 'done', 872, {
    language: 'auto',
    detectedLanguage: 'es'
  }),
  entry('h2', 'Entrevista podcast episodio 12.mp3', ago(0, 0.1), 'transcribing', 3185, {
    progress: 42
  }),
  entry('h3', 'Tutorial de React 19.mov', ago(0, 0.05), 'pending', 1260),
  entry('h4', 'Reunión de equipo - planificación Q4.mkv', ago(1, 2), 'done', 2710),
  entry('h5', 'Clase 05 - Derivadas parciales.mp4', ago(3), 'error', 4020),
  entry('h6', 'Nota de voz 2026-09-12.m4a', ago(15), 'done', 94),
  entry(
    'h7',
    'Conferencia sobre accesibilidad web (versión extendida con preguntas del público).webm',
    ago(40),
    'done',
    5420
  ),
  entry('h8', 'Audiolibro capítulo 1.flac', ago(62), 'cancelled', 2380)
]

const lines = [
  'Bienvenidos a esta lección sobre rebase en Git.',
  'Vamos a ver un ejemplo práctico con dos ramas que divergen.',
  'Tenemos la rama main y una rama de funcionalidad llamada feature.',
  'Mientras trabajábamos en feature, alguien subió dos commits a main.',
  'Si hacemos merge, Git crea un commit extra que une las dos historias.',
  'Con rebase, en cambio, movemos nuestros commits encima de main.',
  'El resultado es una historia lineal, más fácil de leer.',
  'Primero nos aseguramos de tener main actualizada con git pull.',
  'Después volvemos a nuestra rama con git switch feature.',
  'Ahora ejecutamos git rebase main.',
  'Git aplica nuestros commits uno por uno sobre la punta de main.',
  'Si aparece un conflicto, el rebase se detiene y nos avisa.',
  'Resolvemos el conflicto en el editor como en cualquier merge.',
  'Marcamos el archivo como resuelto con git add.',
  'Y seguimos con git rebase --continue.',
  'Si algo sale mal, siempre podemos volver atrás con git rebase --abort.',
  'Una regla importante: no hagas rebase de commits que ya compartiste.',
  'Reescribir la historia pública obliga a los demás a arreglar sus copias.',
  'En ramas locales o personales, rebase es perfectamente seguro.',
  'Veamos ahora el rebase interactivo, que es todavía más útil.',
  'Con git rebase -i podemos reordenar, unir o editar commits.',
  'Se abre una lista con cada commit y una acción al lado.',
  'Cambiando pick por squash, unimos un commit con el anterior.',
  'Así limpiamos los commits de prueba antes de abrir un pull request.',
  'También podemos usar reword para corregir un mensaje.',
  'O drop para eliminar un commit que ya no necesitamos.',
  'Al guardar y cerrar el editor, Git aplica los cambios.',
  'Revisemos el resultado con git log --oneline --graph.',
  'Como ves, la historia quedó lineal y con mensajes claros.',
  'Para subir la rama después de un rebase necesitamos forzar el push.',
  'Usa git push --force-with-lease en lugar de --force.',
  'Así Git se niega a sobrescribir trabajo que no conoces.',
  'Resumiendo: merge conserva la historia tal como ocurrió.',
  'Rebase la reescribe para que sea más fácil de seguir.',
  'Ninguno es mejor que el otro; depende de lo que necesite tu equipo.',
  'En la próxima lección veremos cherry-pick.',
  'Gracias por ver el video y nos vemos en la siguiente.'
]

/** Segmentos de ejemplo con tiempos crecientes y pausas variables. */
export const mockSegments: Segment[] = (() => {
  let t = 1.43
  return lines.map((text, i) => {
    const start = t
    const end = start + 3.2 + (text.length % 5) * 0.6
    t = end + (i % 4 === 3 ? 1.8 : 0.3)
    return { start, end, text }
  })
})()

function job(
  id: string,
  fileName: string,
  status: QueueJob['status'],
  extra: Partial<QueueJob> = {}
): QueueJob {
  return {
    id,
    filePath: `C:\\Users\\Demo\\Videos\\${fileName}`,
    fileName,
    model: 'small',
    language: 'es',
    status,
    ...extra
  }
}

export const mockQueue: QueueJob[] = [
  job('q1', 'Entrevista podcast episodio 12.mp3', 'processing', { progress: 42 }),
  job('q2', 'Tutorial de React 19.mov', 'pending'),
  job('q3', 'Webinar arquitectura hexagonal.mp4', 'pending', { model: 'medium' }),
  job('q4', 'Reunión de equipo - planificación Q4.mkv', 'completed'),
  job('q5', 'Clase 05 - Derivadas parciales.mp4', 'error', {
    error: 'El archivo no tiene pista de audio.'
  }),
  job('q6', 'Audiolibro capítulo 1.flac', 'cancelled', { language: 'auto' })
]
