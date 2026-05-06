#!/usr/bin/env node
// Convertit les sprites PNG (clean, post-chroma-key) en WebP optimisés.
// Idempotent : skip si le .webp est plus récent que le .png source.
//
// Usage : `npm run sprites`
//
// Tailles cibles :
// - Unités / mobs : 512x512 q85 (les sprites sont rendus à ~144px max écran)
// - Décors : 1024x512 q80 (plus large, plus tolérant à la compression)

import { readdir, stat } from 'node:fs/promises'
import { join, basename, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const SPRITES_DIR = fileURLToPath(new URL('../src/assets/sprites/', import.meta.url))

// id → { size, quality }. Décors plus larges, qualité un peu plus basse.
const PROFILES = {
  foret: { width: 1024, height: 512, quality: 80 },
  __default: { width: 512, height: 512, quality: 85 },
}

function profileFor(spriteName) {
  return PROFILES[spriteName] ?? PROFILES.__default
}

async function shouldRebuild(srcPath, outPath) {
  try {
    const [srcStat, outStat] = await Promise.all([stat(srcPath), stat(outPath)])
    return srcStat.mtimeMs > outStat.mtimeMs
  } catch {
    return true // .webp absent
  }
}

async function main() {
  const files = await readdir(SPRITES_DIR)
  const pngs = files.filter(f => f.endsWith('.png') && !f.endsWith('_raw.png'))

  if (pngs.length === 0) {
    console.log('Aucun sprite .png à traiter.')
    return
  }

  let built = 0
  let skipped = 0

  for (const file of pngs) {
    const name = basename(file, extname(file))
    const srcPath = join(SPRITES_DIR, file)
    const outPath = join(SPRITES_DIR, `${name}.webp`)

    if (!(await shouldRebuild(srcPath, outPath))) {
      skipped += 1
      continue
    }

    const { width, height, quality } = profileFor(name)

    await sharp(srcPath)
      .resize(width, height, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality })
      .toFile(outPath)

    const outStat = await stat(outPath)
    console.log(
      `  ✓ ${name}.png → ${name}.webp ` +
      `(${width}×${height} q${quality}, ${(outStat.size / 1024).toFixed(0)} KB)`,
    )
    built += 1
  }

  console.log(`\nTerminé : ${built} construit${built > 1 ? 's' : ''}, ${skipped} sauté${skipped > 1 ? 's' : ''}.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
