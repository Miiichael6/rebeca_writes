import { DOCK_POSITIONS, type DockPosition } from '@shared/dock'

export interface Option<T extends string> {
  value: T
  label: string
}

export function dockPositionOptions(
  label: (position: DockPosition) => string
): Option<DockPosition>[] {
  return DOCK_POSITIONS.map((value) => ({ value, label: label(value) }))
}
