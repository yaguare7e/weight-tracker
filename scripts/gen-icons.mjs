// Generates PNG icons from SVG for PWA manifest and apple-touch-icon
import { Resvg } from '@resvg/resvg-js'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '../public')
mkdirSync(publicDir, { recursive: true })

function iconSvg(bg, stroke, size) {
  const pad = size * 0.19          // ~6px at 32px
  const iconSize = size - pad * 2  // drawable area
  const scale = iconSize / 24      // lucide icons are 24x24
  const sw = 2 / scale             // stroke-width in original coords so it scales correctly
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${bg}"/>
  <g fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"
     transform="translate(${pad},${pad}) scale(${scale})">
    <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
    <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
    <path d="M7 21h10"/>
    <path d="M12 3v18"/>
    <path d="M3 7h2c2 0 4-1 6-2 2 1 4 2 6 2h2"/>
  </g>
</svg>`
}

function render(svg, outPath) {
  const resvg = new Resvg(svg)
  const pngData = resvg.render()
  writeFileSync(outPath, pngData.asPng())
  console.log('✓', outPath)
}

// Light icons (blue bg, white icon)
render(iconSvg('#2563eb', '#ffffff', 192),  join(publicDir, 'icon-192.png'))
render(iconSvg('#2563eb', '#ffffff', 512),  join(publicDir, 'icon-512.png'))
render(iconSvg('#2563eb', '#ffffff', 180),  join(publicDir, 'apple-touch-icon.png'))

// Dark icons (black bg, blue icon)
render(iconSvg('#000000', '#93c5fd', 192),  join(publicDir, 'icon-192-dark.png'))
render(iconSvg('#000000', '#93c5fd', 512),  join(publicDir, 'icon-512-dark.png'))
