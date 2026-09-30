import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { appTitle } from './src/shared/app'

const shared = { '@shared': resolve('src/shared') }

/** Reemplaza `%APP_NAME%` en index.html por el título de src/shared/app.ts ("- development" en dev). */
function appNameHtml(): Plugin {
  return {
    name: 'app-name-html',
    transformIndexHtml: (html, ctx) => html.replaceAll('%APP_NAME%', appTitle(Boolean(ctx.server)))
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
