import { stageLimit } from '../domain/stage'

/**
 * La barra inferior se oculta al taparse la transcripción: si contara en el límite, este cambiaría
 * al taparse y destaparía la transcripción, y el panel oscilaría o se quedaría a medias.
 */
const isIgnored = (child: Element): boolean =>
  child.classList.contains('transcript') || child.classList.contains('bottombar')

function measure(player: HTMLElement, main: HTMLElement): number {
  let othersHeight = 0
  for (const child of main.children) {
    if (child !== player && !isIgnored(child) && child instanceof HTMLElement)
      othersHeight += child.offsetHeight
  }
  const controlsHeight = player.querySelector<HTMLElement>('.player-controls')?.offsetHeight ?? 0
  return stageLimit({ mainHeight: main.clientHeight, othersHeight, controlsHeight })
}

/** Mide con el DOM el espacio de `.main` que le queda al panel de video, y lo sigue. */
export function observeStageLimit(
  player: HTMLElement,
  onLimit: (limit: number) => void
): () => void {
  const main = player.closest<HTMLElement>('.main')
  if (!main) return () => {}
  const update = (): void => onLimit(measure(player, main))
  update()
  const observer = new ResizeObserver(update)
  observer.observe(main)
  for (const child of main.children) {
    if (child !== player && !isIgnored(child)) observer.observe(child)
  }
  return () => observer.disconnect()
}
