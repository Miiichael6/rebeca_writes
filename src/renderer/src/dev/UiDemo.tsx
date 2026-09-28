// Página TEMPORAL (solo en dev) para revisar los componentes base en ambos temas.
// Se abre con el botón "Componentes" de la barra de título. Borrar cuando exista Configuración (tarea 21).
import {
  AlignLeft,
  Captions,
  Copy,
  Cpu,
  Filter,
  Pencil,
  Plus,
  RectangleHorizontal,
  Settings,
  Trash2
} from 'lucide-react'
import { useState } from 'react'
import type { ThemeMode } from '@shared/theme'
import {
  Button,
  Checkbox,
  ConfirmDialog,
  NumberInput,
  RadioGroup,
  Select,
  SettingRow,
  SettingsSection,
  Slider,
  TextArea,
  Toggle
} from '@renderer/components/ui'
import { toast } from '@renderer/store/toast'
import { updateSettings, useSettingsStore } from '@renderer/store/settings'
import { useUiStore } from '@renderer/store/ui'

function UiDemo(): React.JSX.Element {
  const themeMode = useSettingsStore((s) => s.settings.theme)
  const resolvedTheme = useUiStore((s) => s.resolvedTheme)
  const setThemeMode = (theme: ThemeMode): void => updateSettings({ theme })

  const [backend, setBackend] = useState('cuda')
  const [prompt, setPrompt] = useState(false)
  const [promptText, setPromptText] = useState('')
  const [maxLen, setMaxLen] = useState(0)
  const [suppress, setSuppress] = useState(false)
  const [normalize, setNormalize] = useState(true)
  const [cc, setCc] = useState(true)
  const [height, setHeight] = useState(300)
  const [joinLines, setJoinLines] = useState(true)
  const [autoScroll, setAutoScroll] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <div className="ui-demo">
      <SettingsSection title="Tema">
        <SettingRow
          icon={<Settings size={20} strokeWidth={1.5} />}
          title="Tema"
          description={`Claro, oscuro o el del sistema. Aplicado ahora: ${resolvedTheme}.`}
        >
          <Select<ThemeMode>
            aria-label="Tema"
            value={themeMode}
            onChange={setThemeMode}
            options={[
              { value: 'system', label: 'Usar el del sistema' },
              { value: 'light', label: 'Claro' },
              { value: 'dark', label: 'Oscuro' }
            ]}
          />
        </SettingRow>
      </SettingsSection>

      <SettingsSection title="Modelos">
        <SettingRow
          icon={<Cpu size={20} strokeWidth={1.5} />}
          title="Backend"
          description="Seleccione la plataforma de hardware para ejecutar el modelo"
          extra={
            <RadioGroup
              aria-label="Backend"
              value={backend}
              onChange={setBackend}
              options={[
                { value: 'cuda', label: 'CUDA', description: 'El mejor rendimiento. Recomendado.' },
                { value: 'gpu', label: 'GPU', description: 'Buen rendimiento.' },
                {
                  value: 'cpu',
                  label: 'CPU',
                  description: 'Funcional, pero lento; no recomendado para modelos grandes.'
                }
              ]}
            />
          }
        >
          <strong>{backend.toUpperCase()}</strong>
        </SettingRow>
        <SettingRow
          icon={<Pencil size={20} strokeWidth={1.5} />}
          title="Prompt inicial"
          description="Indica al modelo que use ortografías o estilos específicos."
          extra={
            <TextArea
              aria-label="Prompt inicial"
              disabled={!prompt}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
            />
          }
        >
          <Toggle aria-label="Prompt inicial" checked={prompt} onChange={setPrompt} />
        </SettingRow>
        <SettingRow
          icon={<AlignLeft size={20} strokeWidth={1.5} />}
          title="Longitud máxima de segmento (caracteres)"
          description="Introduzca 0 para sin límite."
        >
          <NumberInput
            aria-label="Longitud máxima de segmento"
            value={maxLen}
            onChange={setMaxLen}
            min={0}
            max={1000}
          />
        </SettingRow>
        <SettingRow
          icon={<Filter size={20} strokeWidth={1.5} />}
          title="Suprimir tokens sin voz"
          description="Evita generar textos que no se pronuncian realmente en el audio."
        >
          <Toggle aria-label="Suprimir tokens sin voz" checked={suppress} onChange={setSuppress} />
        </SettingRow>
        <SettingRow
          icon={<AlignLeft size={20} strokeWidth={1.5} />}
          title="Normalización de audio"
          description="Normaliza el volumen de entrada si es bajo."
        >
          <Toggle aria-label="Normalización de audio" checked={normalize} onChange={setNormalize} />
        </SettingRow>
      </SettingsSection>

      <SettingsSection title="Interfaz">
        <SettingRow
          icon={<Captions size={20} strokeWidth={1.5} />}
          title="Mostrar subtítulos/CC"
          description="Activar o desactivar los subtítulos (CC)."
        >
          <Toggle aria-label="Mostrar subtítulos" checked={cc} onChange={setCc} />
        </SettingRow>
        <SettingRow
          icon={<RectangleHorizontal size={20} strokeWidth={1.5} />}
          title="Altura del panel de video"
          description="Establezca la altura del panel de video en píxeles (300–600)."
        >
          <span>
            Actual: <strong>{height}</strong> px
          </span>
          <Slider
            aria-label="Altura del panel de video"
            value={height}
            onChange={setHeight}
            min={300}
            max={600}
            step={10}
          />
        </SettingRow>
      </SettingsSection>

      <SettingsSection title="Botones y otros">
        <div className="card ui-demo-row">
          <Button variant="primary">Transcribir</Button>
          <Button>Secundario</Button>
          <Button variant="outline">Exportar</Button>
          <Button variant="ghost">Fantasma</Button>
          <Button variant="primary" disabled>
            Deshabilitado
          </Button>
          <Button icon={<Plus size={16} strokeWidth={1.5} />}>Agregar modelo</Button>
          <Button aria-label="Copiar transcripción" icon={<Copy size={16} strokeWidth={1.5} />} />
          <Button
            variant="danger"
            icon={<Trash2 size={16} strokeWidth={1.5} />}
            onClick={() => setConfirmOpen(true)}
          >
            Borrar historial
          </Button>
          <Button onClick={() => toast('Copiado')}>Mostrar toast</Button>
        </div>
        <div className="card ui-demo-row">
          <Checkbox checked={joinLines} onChange={setJoinLines}>
            Unir líneas
          </Checkbox>
          <Checkbox checked={autoScroll} onChange={setAutoScroll}>
            Desplaz. auto
          </Checkbox>
          <Checkbox checked={false} onChange={() => {}} disabled>
            Deshabilitado
          </Checkbox>
          <input className="input" placeholder="Filtrar por..." style={{ width: 200 }} />
        </div>
      </SettingsSection>

      <ConfirmDialog
        open={confirmOpen}
        title="¿Borrar el historial?"
        confirmLabel="Borrar"
        danger
        onConfirm={() => {
          setConfirmOpen(false)
          toast('Historial borrado')
        }}
        onCancel={() => setConfirmOpen(false)}
      >
        Se eliminarán las transcripciones guardadas y la caché de vistas previas. Los archivos
        originales y los .srt exportados no se tocan.
      </ConfirmDialog>
    </div>
  )
}

export default UiDemo
