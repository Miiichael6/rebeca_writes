import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AudioLines, User } from 'lucide-react'
import { AMBIENT_SPEAKER_ID, SPEAKER_NAME_MAX } from '@shared/speakers'
import { usePorts } from '../application/ports'
import { speakerColor } from '../domain/speakers'

interface SpeakerTagProps {
  speaker: string
  name: string
}

/** Que el clic o la tecla no lleguen a la fila (saltar en el video, editar el segmento). */
const keepInside = (e: React.SyntheticEvent): void => e.stopPropagation()

/**
 * Etiqueta de quién habla al empezar su turno (tarea 35). Un clic la convierte en un campo para
 * cambiarle el nombre en toda la transcripción; vacío vuelve al de por defecto.
 */
export function SpeakerTag({ speaker, name }: SpeakerTagProps): React.JSX.Element {
  const { t } = useTranslation()
  const { transcript } = usePorts()
  const [draft, setDraft] = useState<string | null>(null)
  const ambient = speaker === AMBIENT_SPEAKER_ID
  const tone = ambient ? 'ambient' : speakerColor(speaker)
  const Icon = ambient ? AudioLines : User
  const className = `speaker-tag speaker-${tone}`

  const commit = (): void => {
    if (draft !== null && draft.trim() !== name) transcript.renameSpeaker(speaker, draft)
    setDraft(null)
  }

  if (draft !== null) {
    return (
      <input
        className={`${className} editing`}
        aria-label={t('speakers.nameInput')}
        value={draft}
        maxLength={SPEAKER_NAME_MAX}
        autoFocus
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onClick={keepInside}
        onDoubleClick={keepInside}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Enter') commit()
          else if (e.key === 'Escape') setDraft(null)
        }}
      />
    )
  }
  return (
    <button
      type="button"
      className={className}
      title={t('speakers.rename', { name })}
      onClick={(e) => {
        e.stopPropagation()
        setDraft(name)
      }}
      onDoubleClick={keepInside}
      onKeyDown={keepInside}
    >
      <Icon size={13} aria-hidden="true" />
      <span className="speaker-name">{name}</span>
    </button>
  )
}
