import { useEffect, useState } from 'react'
import type { AboutSectionPorts } from '../application/ports'

/** Adaptadores de los puertos sobre `window.api`. Es el único sitio que lo conoce. */
export const storePorts: AboutSectionPorts = {
  app: {
    useVersion: () => {
      const [version, setVersion] = useState('')
      useEffect(() => {
        window.api.app.getVersion().then(setVersion, console.error)
      }, [])
      return version
    },
    openLogs: () => {
      window.api.app.openLogs().catch(console.error)
    }
  }
}
