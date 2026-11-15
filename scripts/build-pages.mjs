import { spawnSync } from 'node:child_process'
import { cp, mkdtemp, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const repository = process.env.PAGES_REPOSITORY ?? 'studyroom'
const basePath = repository.endsWith('.github.io') || !repository ? '' : '/' + repository
// Embed KaTeX's WOFF2 fonts in the exported stylesheet.
async function bundleMathFonts(output) {
  const cssDirectory = resolve(output, '_next/static/css')
  const mediaDirectory = resolve(output, '_next/static/media')
  const files = await readdir(cssDirectory)
  const referenced = new Set()
  const sources = /url\([^)]*\/(KaTeX_[^/()]+\.woff2)\) format\("woff2"\),url\([^)]*\.woff\) format\("woff"\),url\([^)]*\.ttf\) format\("truetype"\)/g
  for (const file of files.filter(name => name.endsWith('.css'))) {
    const filename = resolve(cssDirectory, file)
    let css = await readFile(filename, 'utf8')
    const matches = Array.from(css.matchAll(sources))
    for (const [source, font] of matches) {
      const data = await readFile(resolve(mediaDirectory, font))
      css = css.replace(source, 'url(data:font/woff2;base64,' + data.toString('base64') + ') format("woff2")')
      referenced.add(font.replace(/\.[^.]+\.woff2$/, ''))
    }
    if (matches.length) await writeFile(filename, css)
  }
  if (!referenced.size) return
  for (const file of await readdir(mediaDirectory)) {
    if (referenced.has(file.replace(/\.[^.]+\.(woff2|woff|ttf)$/, ''))) {
      await rm(resolve(mediaDirectory, file))
    }
  }
}

const stage = await mkdtemp(resolve(root, '.pages-build-'))
try {
  await cp(resolve(root, 'app'), resolve(stage, 'app'), {
    recursive: true,
    filter: source => source !== resolve(root, 'app/api'),
  })
  await writeFile(resolve(stage, 'next.config.mjs'), 'export default ' + JSON.stringify({
    output: 'export', basePath, trailingSlash: true,
  }) + '\n')
  await writeFile(resolve(stage, 'app/page.jsx'), `
import Mudrik from './mudrik'

export default function Page() {
  const chatUrl = process.env.NEXT_PUBLIC_STUDY_CHAT_URL
  return <Mudrik connected={Boolean(chatUrl)} chatUrl={chatUrl} />
}
`)
  const result = spawnSync(process.execPath, [
    resolve(root, 'node_modules/next/dist/bin/next'), 'build', stage, '--webpack',
  ], { cwd: root, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error('Next.js Pages build failed')
  const output = resolve(stage, 'out')
  await bundleMathFonts(output)
  await writeFile(resolve(output, '.nojekyll'), '')
  const docs = resolve(root, 'docs')
  await rm(docs, { recursive: true, force: true })
  await rename(output, docs)
} finally {
  await rm(stage, { recursive: true, force: true })
}
