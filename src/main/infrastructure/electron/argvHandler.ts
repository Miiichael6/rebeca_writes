import type { QueueAddResult } from '@shared/types'
import type { LiveControl } from '../../application/liveControl'
import type { Logger } from '../../application/ports/eventPublisher'
import type { QueueIntake } from '../../application/queueIntake'
import { pathsFromArgv } from '../../domain/argvPaths'
import { isLiveArgv, parseLiveCommand } from '../../domain/liveArgs'

export interface ArgvHandlerDeps {
  live: Pick<LiveControl, 'handle'>
  intake: Pick<QueueIntake, 'addPaths'>
  log: Logger
  /** Sin empaquetar, `electron .` pasa la carpeta del proyecto: no es un "Abrir con". */
  packaged: boolean
  appPath: string
}

/**
 * "Abrir con" o arrastrar al ícono: lo que venga en el argv va a la cola. Las órdenes en vivo
 * de Rebecca Listen (`--live-*`, tarea 27) van a su sesión y nunca a la cola.
 */
export function createArgvHandler({
  live,
  intake,
  log,
  packaged,
  appPath
}: ArgvHandlerDeps): (argv: readonly string[], cwd: string) => Promise<QueueAddResult | null> {
  return async (argv, cwd) => {
    const command = parseLiveCommand(argv)
    if (command) {
      log.info(`Orden en vivo recibida: ${command.kind} ${command.pcm}`)
      await live
        .handle(command)
        .catch((err) => log.error('No se pudo atender la orden en vivo', err))
      return null
    }
    if (isLiveArgv(argv)) {
      log.warn(`Orden en vivo sin entender: ${JSON.stringify(argv)}`)
      return null
    }
    if (!packaged) return null
    const paths = pathsFromArgv(argv, cwd, appPath)
    if (paths.length === 0) return null
    log.info(`Archivos recibidos por línea de comandos: ${paths.join(', ')}`)
    return intake.addPaths(paths).catch((err) => {
      log.error('No se pudieron encolar los archivos recibidos', err)
      return null
    })
  }
}
