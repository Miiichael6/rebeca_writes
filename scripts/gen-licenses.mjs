/* eslint-disable @typescript-eslint/explicit-function-return-type -- JS plano: no admite anotaciones de tipo */
// Genera la lista de "Reconocimientos de software de terceros" de Configuración › Acerca de.
// Uso: npm run licenses   (volver a correrlo al añadir o actualizar dependencias)
//
// Recorre las `dependencies` de package.json y sus dependencias transitivas (lo que viaja en
// la app), más React y Electron, que están en devDependencies pero sí se distribuyen. Los
// componentes que no vienen de npm (whisper.cpp, modelos, CUDA) van a mano en MANUAL.
//
// Salida: src/renderer/src/assets/third-party-licenses.json
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(root, 'src/renderer/src/assets/third-party-licenses.json')

/** De devDependencies, pero van dentro del bundle o son el propio runtime. */
const BUNDLED_DEV = ['react', 'react-dom', 'electron']
/** Sus dependencias solo sirven para instalar (descargan un binario): no se recorren. */
const NO_WALK = new Set(['electron', 'ffmpeg-static', 'ffprobe-static'])

const mit = (copyright) => `MIT License

Copyright (c) ${copyright}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`

const MANUAL = [
  {
    name: 'whisper.cpp',
    version: 'b5130',
    license: 'MIT',
    url: 'https://github.com/ggml-org/whisper.cpp',
    text: mit('2023-2024 The ggml authors')
  },
  {
    name: 'Whisper (modelos de OpenAI)',
    version: '',
    license: 'MIT',
    url: 'https://github.com/openai/whisper',
    text: mit('2022 OpenAI')
  },
  {
    name: 'NVIDIA CUDA Runtime, cuBLAS',
    version: '12.4',
    license: 'NVIDIA CUDA EULA',
    url: 'https://docs.nvidia.com/cuda/eula/',
    text: 'Las DLL de CUDA (cudart, cublas, cublasLt, nvrtc) se redistribuyen según el anexo de componentes redistribuibles de la licencia de usuario final de NVIDIA CUDA Toolkit: https://docs.nvidia.com/cuda/eula/'
  }
]

function readPackage(name) {
  const path = join(root, 'node_modules', name, 'package.json')
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null
}

function licenseText(name) {
  const dir = join(root, 'node_modules', name)
  const file = readdirSync(dir).find((f) => /^(licen[cs]e|copying)(\.(md|txt))?$/i.test(f))
  return file ? readFileSync(join(dir, file), 'utf8').replace(/\r\n/g, '\n').trim() + '\n' : ''
}

function licenseOf(pkg) {
  if (typeof pkg.license === 'string') return pkg.license
  if (pkg.license?.type) return pkg.license.type
  if (Array.isArray(pkg.licenses)) return pkg.licenses.map((l) => l.type ?? l).join(' OR ')
  return 'UNKNOWN'
}

function urlOf(name, pkg) {
  const repo = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url
  const url = pkg.homepage ?? repo?.replace(/^git\+/, '').replace(/\.git$/, '')
  return url?.startsWith('http') ? url : `https://www.npmjs.com/package/${name}`
}

const own = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const pending = [...Object.keys(own.dependencies ?? {}), ...BUNDLED_DEV]
const found = new Map()

while (pending.length > 0) {
  const name = pending.shift()
  if (found.has(name)) continue
  const pkg = readPackage(name)
  // Dependencias opcionales que no se instalaron en esta plataforma.
  if (!pkg) continue
  found.set(name, {
    name,
    version: pkg.version,
    license: licenseOf(pkg),
    url: urlOf(name, pkg),
    text: licenseText(name)
  })
  if (!NO_WALK.has(name)) pending.push(...Object.keys(pkg.dependencies ?? {}))
}

// ffmpeg-static trae el binario de ffmpeg; su licencia es la de esa build (GPL).
const ffmpeg = found.get('ffmpeg-static')
if (ffmpeg) {
  found.set('ffmpeg-static', {
    ...ffmpeg,
    name: 'FFmpeg (ffmpeg-static)',
    url: 'https://ffmpeg.org/legal.html'
  })
}

const packages = [...found.values()].sort((a, b) => a.name.localeCompare(b.name))
writeFileSync(OUT, JSON.stringify([...MANUAL, ...packages], null, 2) + '\n')
console.log(`${MANUAL.length + packages.length} componentes → ${OUT}`)
