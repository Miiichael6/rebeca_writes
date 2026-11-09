/* eslint-disable @typescript-eslint/explicit-function-return-type -- JS plano: no admite anotaciones de tipo */
// Publica una versión nueva en GitHub Releases, donde la busca electron-updater, con un solo comando:
//   npm run release patch                        ← notas generadas por GitHub a partir de los commits
//   npm run release -- minor "Qué trae esta versión"
//   npm run release -- --local [patch|minor|major|x.y.z]   ← solo compila; ni commit ni publicación
// Sube la versión en package.json, compila el instalador NSIS (dist/), hace commit y tag de la
// versión, sube main y el tag, y crea la release con `gh` (sin GH_TOKEN ni borradores a mano).
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const REPO = 'Miiichael6/rebeca_writes'
const MAIN_BRANCH = 'main'
const DIST = 'dist'
const VERSION_FILES = ['package.json', 'package-lock.json']
const USAGE =
  'Uso: npm run release -- <patch|minor|major|x.y.z> ["notas"]   (o --local [versión] para solo compilar)'

const run = (command, args, options = {}) =>
  execFileSync(command, args, { stdio: 'inherit', ...options })
const output = (command, args) => execFileSync(command, args, { encoding: 'utf8' }).trim()
// npm es un .cmd en Windows: solo lo ejecuta una shell (aquí sus argumentos no llevan espacios).
const npm = (args) => run('npm', args, { shell: process.platform === 'win32' })

function fail(message) {
  console.error(`\n✗ ${message}`)
  process.exit(1)
}

function parseArgs(argv) {
  const local = argv.includes('--local')
  const [bump, ...notes] = argv.filter((a) => a !== '--local')
  if (!bump && local) return { bump: null, local, notes: '' }
  if (!bump || !/^(patch|minor|major|\d+\.\d+\.\d+)$/.test(bump)) fail(USAGE)
  return { bump, local, notes: notes.join(' ') }
}

/** Todo lo que haría fallar la publicación a medias, comprobado antes de tocar nada. */
function checkReady(local) {
  if (local) return
  if (output('git', ['status', '--porcelain']))
    fail('Hay cambios sin commitear: haz commit o descártalos antes.')
  const branch = output('git', ['branch', '--show-current'])
  if (branch !== MAIN_BRANCH)
    fail(`Estás en '${branch}': las versiones se publican desde '${MAIN_BRANCH}'.`)
  try {
    output('gh', ['auth', 'status'])
  } catch {
    fail('gh no tiene sesión: ejecuta `gh auth login`.')
  }
}

/** Compila el instalador y devuelve lo que electron-updater necesita: .exe, .blockmap y latest.yml. */
function buildInstaller(version) {
  npm(['run', 'clean:dist'])
  npm(['run', 'build:native'])
  npm(['run', 'check:bin'])
  npm(['run', 'build'])
  // `never`: electron-builder solo genera app-update.yml con la config `publish`; sube `gh` después.
  run('npx', ['electron-builder', '--win', '--publish', 'never'], {
    shell: process.platform === 'win32'
  })
  const exe = join(DIST, `RebeccaWrites-Setup-${version}.exe`)
  const files = [exe, `${exe}.blockmap`, join(DIST, 'latest.yml')]
  const missing = files.filter((file) => !existsSync(file))
  if (missing.length) throw new Error(`Faltan en dist/: ${missing.join(', ')}`)
  return files
}

function publish(version, notes, files) {
  const tag = `v${version}`
  if (output('git', ['status', '--porcelain', '--', ...VERSION_FILES])) {
    run('git', ['commit', '-m', `chore(release): ${tag}`, '--', ...VERSION_FILES])
  }
  run('git', ['tag', tag])
  run('git', ['push', 'origin', MAIN_BRANCH, tag])
  const notesArgs = notes ? ['--notes', notes] : ['--generate-notes']
  run('gh', [
    'release',
    'create',
    tag,
    ...files,
    '--repo',
    REPO,
    '--title',
    version,
    '--latest',
    ...notesArgs
  ])
}

const { bump, local, notes } = parseArgs(process.argv.slice(2))
checkReady(local)

const originals = VERSION_FILES.map((file) => [file, readFileSync(file, 'utf8')])
if (bump) npm(['version', bump, '--no-git-tag-version'])
const { version } = JSON.parse(readFileSync('package.json', 'utf8'))

let files
try {
  files = buildInstaller(version)
} catch (error) {
  for (const [file, content] of originals) writeFileSync(file, content)
  fail(`El build falló (${error.message}): package.json vuelve a la versión anterior.`)
}
console.log(`\n✓ Instalador en ${files[0]}`)

if (local) {
  console.log(
    `--local: no se ha hecho commit ni publicado nada${bump ? ` (package.json queda en ${version})` : ''}.`
  )
} else {
  publish(version, notes, files)
  console.log(`\n✓ Publicada https://github.com/${REPO}/releases/tag/v${version}`)
}
