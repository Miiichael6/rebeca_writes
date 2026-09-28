/* eslint-disable @typescript-eslint/explicit-function-return-type -- JS plano: no admite anotaciones de tipo */
// Genera los íconos de la app a partir de src/renderer/src/assets/logo.svg.
// Uso: npm run icons   (corre con Electron para rasterizar el SVG con Chromium, sin dependencias)
//
// Salidas:
//   resources/icon.png  512 px (ícono de la ventana)
//   build/icon.png      512 px (electron-builder)
//   build/icon.ico      16–256 px, entradas PNG (instalador y .exe de Windows)
import { app, BrowserWindow } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ICO_SIZES = [16, 20, 24, 32, 40, 48, 64, 96, 128, 256]
const PNG_SIZE = 512

/** Empaqueta PNGs en un .ico (formato admitido desde Windows Vista). */
function buildIco(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reservado
  header.writeUInt16LE(1, 2) // tipo: ícono
  header.writeUInt16LE(images.length, 4)

  let offset = 6 + 16 * images.length
  const entries = images.map(({ size, png }) => {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size >= 256 ? 0 : size, 0) // ancho (0 = 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1) // alto
    entry.writeUInt8(0, 2) // colores de paleta
    entry.writeUInt8(0, 3) // reservado
    entry.writeUInt16LE(1, 4) // planos
    entry.writeUInt16LE(32, 6) // bits por píxel
    entry.writeUInt32LE(png.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += png.length
    return entry
  })
  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)])
}

async function main() {
  const svg = await readFile(resolve(root, 'src/renderer/src/assets/logo.svg'))
  const svgUrl = `data:image/svg+xml;base64,${svg.toString('base64')}`

  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } })
  await win.loadURL('data:text/html,<!doctype html><title>icons</title>')

  // Chromium rasteriza el SVG al tamaño de destino, así que cada tamaño sale nítido.
  const render = async (size) => {
    const dataUrl = await win.webContents.executeJavaScript(`
      new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = canvas.height = ${size}
          canvas.getContext('2d').drawImage(img, 0, 0, ${size}, ${size})
          resolve(canvas.toDataURL('image/png'))
        }
        img.onerror = () => reject(new Error('No se pudo cargar el SVG'))
        img.src = ${JSON.stringify(svgUrl)}
      })`)
    return Buffer.from(dataUrl.split(',')[1], 'base64')
  }

  const png = await render(PNG_SIZE)
  await writeFile(resolve(root, 'resources/icon.png'), png)
  await writeFile(resolve(root, 'build/icon.png'), png)

  const images = []
  for (const size of ICO_SIZES) images.push({ size, png: await render(size) })
  await writeFile(resolve(root, 'build/icon.ico'), buildIco(images))

  console.log(`Íconos generados: icon.png ${PNG_SIZE}px, icon.ico ${ICO_SIZES.join('/')}px`)
}

app.whenReady().then(async () => {
  try {
    await main()
    app.exit(0)
  } catch (err) {
    console.error(err)
    app.exit(1)
  }
})
