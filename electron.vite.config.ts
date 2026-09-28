import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { APP_NAME } from './src/shared/app'

const shared = { '@shared': resolve('src/shared') }

/** Reemplaza `%APP_NAME%` en index.html por el nombre de src/shared/app.ts. */
function appNameHtml(): Plugin {
  return {
    name: 'app-name-html',
    transformIndexHtml: (html) => html.replaceAll('%APP_NAME%', APP_NAME)
  }
}

export default defineConfig({
  main: {
    resolve: { alias: shared }
  },
  preload: {
    resolve: { alias: shared }
  },
  renderer: {
    resolve: {
      alias: {
        ...shared,
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react(), appNameHtml()]
  }
})
