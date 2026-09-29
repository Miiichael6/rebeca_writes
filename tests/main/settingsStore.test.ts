import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDefaultSettings, SETTINGS_VERSION } from '@shared/settings'
import {
  mergeSettings,
  migrateSettings,
  SettingsStore
} from '../../src/main/services/settingsStore'

const CPUS = 8
const defaults = createDefaultSettings(CPUS)

describe('createDefaultSettings', () => {
  it('usa la mitad de los núcleos, mínimo 1, y normaliza activado', () => {
    expect(defaults.threads).toBe(4)
    expect(createDefaultSettings(1).threads).toBe(1)
    expect(defaults.normalize).toBe(true)
    expect(defaults.version).toBe(SETTINGS_VERSION)
  })
})

describe('mergeSettings', () => {
  it('aplica los valores válidos', () => {
    const next = mergeSettings(defaults, { theme: 'dark', model: 'large-v3', maxLen: 42 }, CPUS)
    expect(next).toMatchObject({ theme: 'dark', model: 'large-v3', maxLen: 42 })
  })

  it('ignora claves desconocidas y tipos incorrectos', () => {
    const next = mergeSettings(
      defaults,
      { evil: 1, theme: 'purple', translate: 'yes', backend: 'metal', uiLanguage: 'fr' },
      CPUS
    )
    expect(next).toEqual(defaults)
  })

  it('recorta los números a su rango', () => {
    const next = mergeSettings(
      defaults,
      { videoHeight: 9999, threads: 64, maxLen: -3, previewCacheMaxGB: 0 },
      CPUS
    )
    expect(next.videoHeight).toBe(600)
    expect(next.threads).toBe(CPUS)
    expect(next.maxLen).toBe(0)
    expect(next.previewCacheMaxGB).toBe(defaults.previewCacheMaxGB)
  })

  it('fusiona los objetos anidados campo por campo', () => {
    const next = mergeSettings(
      defaults,
      { queue: { autoSaveSrt: true }, window: { width: 1400, x: -1920, maximized: 'no' } },
      CPUS
    )
    expect(next.queue).toEqual({ skipExistingSrt: false, autoSaveSrt: true })
    expect(next.window).toEqual({ ...defaults.window, width: 1400, x: -1920 })
  })

  it('acepta null en el backend', () => {
    const withCuda = mergeSettings(defaults, { backend: 'cuda' }, CPUS)
    expect(mergeSettings(withCuda, { backend: null }, CPUS).backend).toBeNull()
  })

  it('normaliza la lista de backends instalados: sin repetidos, en orden y sin desconocidos', () => {
    const next = mergeSettings(
      defaults,
      { installedBackends: ['cpu', 'metal', 'cuda', 'cpu'] },
      CPUS
    )
    expect(next.installedBackends).toEqual(['cuda', 'cpu'])
    expect(mergeSettings(next, { installedBackends: 'cuda' }, CPUS).installedBackends).toEqual([
      'cuda',
      'cpu'
    ])
  })
})

describe('migrateSettings', () => {
  it('lleva el archivo mínimo de la tarea 05 a la versión actual', () => {
    const migrated = migrateSettings({ detectedBackend: 'cuda', backend: 'cpu' })
    expect(migrated).toEqual({ detectedBackend: 'cuda', backend: 'cpu', version: SETTINGS_VERSION })
  })
})

describe('SettingsStore', () => {
  let dir: string
  let path: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'settings-'))
    path = join(dir, 'settings.json')
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('sin archivo usa los defaults y lo crea', async () => {
    const store = new SettingsStore({ path, cpuCount: CPUS })
    expect(await store.load()).toEqual(defaults)
    await store.flush()
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual(defaults)
  })

  it('conserva las claves de la tarea 05 al migrar', async () => {
    await writeFile(path, JSON.stringify({ detectedBackend: 'vulkan', backend: 'cpu' }))
    const store = new SettingsStore({ path, cpuCount: CPUS })
    const settings = await store.load()
    expect(settings.detectedBackend).toBe('vulkan')
    expect(settings.backend).toBe('cpu')
    expect(settings.normalize).toBe(true)
  })

  it('update guarda, emite `changed` y sobrevive a otra instancia', async () => {
    const store = new SettingsStore({ path, cpuCount: CPUS, debounceMs: 5 })
    const changed = vi.fn()
    store.on('changed', changed)
    await store.update({ theme: 'light' })
    await store.update({ theme: 'light' }) // sin cambios: no emite
    expect(changed).toHaveBeenCalledTimes(1)
    await store.flush()

    const reopened = new SettingsStore({ path, cpuCount: CPUS })
    expect((await reopened.load()).theme).toBe('light')
  })

  it('updates simultáneos no se pisan', async () => {
    const store = new SettingsStore({ path, cpuCount: CPUS })
    await Promise.all([store.update({ theme: 'dark' }), store.update({ translate: true })])
    expect(store.get()).toMatchObject({ theme: 'dark', translate: true })
  })

  it('un settings.json corrupto se respalda y arranca con defaults', async () => {
    await writeFile(path, '{ not json')
    const onCorrupt = vi.fn()
    const store = new SettingsStore({ path, cpuCount: CPUS, onCorrupt })
    expect(await store.load()).toEqual(defaults)
    expect(onCorrupt).toHaveBeenCalledOnce()
  })
})
