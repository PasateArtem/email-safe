/**
 * Generates src/data/compat.js from the latest caniemail data
 * Run: node scripts/sync-caniemail.js
 */

const { rawData } = require('caniemail')
const fs = require('fs')
const path = require('path')

// Mapping: caniemail slug → Tailwind class patterns
// Left: caniemail slug, Right: Tailwind patterns that use this CSS feature
const SLUG_TO_TAILWIND = {
  // Flexbox
  'css-display-flex':   ['flex', 'inline-flex'],
  'css-flex-direction': ['flex-row', 'flex-col', 'flex-row-reverse', 'flex-col-reverse'],
  'css-flex-wrap':      ['flex-wrap', 'flex-nowrap', 'flex-wrap-reverse'],
  'css-align-items':    ['items-start', 'items-end', 'items-center', 'items-baseline', 'items-stretch'],
  'css-justify-content':['justify-start', 'justify-end', 'justify-center', 'justify-between', 'justify-around', 'justify-evenly'],

  // Grid
  'css-display-grid':   ['grid', 'inline-grid'],
  'css-grid-template':  ['grid-cols-*', 'grid-rows-*', 'col-span-*', 'col-start-*', 'col-end-*', 'row-span-*'],

  // Gap (requires flex or grid)
  'css-gap':            ['gap-*', 'gap-x-*', 'gap-y-*'],

  // Border
  'css-border-radius':  ['rounded', 'rounded-*'],
  'css-border-image':   ['border-image-*'],

  // Gradients
  'css-linear-gradient':['bg-gradient-to-*', 'from-*', 'via-*', 'to-*'],
  'css-conic-gradient': ['bg-conic-*'],
  'css-radial-gradient':['bg-radial-*'],

  // Animations / Transitions
  'css-animation':      ['animate-*'],
  'css-transition':     ['transition', 'transition-*', 'duration-*', 'ease-*', 'delay-*'],

  // Transform
  'css-transform':      ['rotate-*', 'scale-*', 'translate-x-*', 'translate-y-*', 'skew-x-*', 'skew-y-*'],

  // Filters
  'css-filter':         ['blur-*', 'brightness-*', 'contrast-*', 'grayscale-*', 'hue-rotate-*', 'invert-*', 'saturate-*', 'sepia-*', 'drop-shadow-*'],
  'css-backdrop-filter':['backdrop-blur-*', 'backdrop-brightness-*', 'backdrop-contrast-*', 'backdrop-grayscale-*', 'backdrop-saturate-*'],

  // Position
  'css-position':       ['fixed', 'sticky'],

  // Object fit
  'css-object-fit':     ['object-contain', 'object-cover', 'object-fill', 'object-none', 'object-scale-down'],

  // Variables
  'css-variables':      ['[--*]'],

  // Units
  'css-unit-rem':       ['text-[*rem]', 'w-[*rem]', 'h-[*rem]', 'p-[*rem]', 'm-[*rem]'],
  'css-unit-vw':        ['w-screen', 'min-w-screen', 'max-w-screen'],
  'css-unit-vh':        ['h-screen', 'min-h-screen', 'max-h-screen'],

  // Clip path, mask
  'css-clip-path':      ['clip-*'],
  'css-mask-image':     ['mask-*'],

  // Misc
  'css-box-shadow':     ['shadow', 'shadow-*'],
}

// Target email clients to check
const TARGET_CLIENTS = [
  { client: 'outlook', platform: 'windows',         label: 'Outlook Windows' },
  { client: 'gmail',   platform: 'desktop-webmail',  label: 'Gmail'          },
  { client: 'gmail',   platform: 'mobile-webmail',   label: 'Gmail Mobile'   },
]

// Returns support status of the latest tested version
function getLatestSupport(versionMap) {
  if (!versionMap) return 'unknown'
  const versions = Object.keys(versionMap)
  if (versions.length === 0) return 'unknown'
  const latest = versions[versions.length - 1]
  // Strip note references (#1, #2, etc.)
  return versionMap[latest].replace(/\s*#\d+/g, '').trim()
}

// Builds the compat matrix
function buildCompatMatrix() {
  const matrix = {}

  for (const [slug, patterns] of Object.entries(SLUG_TO_TAILWIND)) {
    const feature = rawData.data.find(f => f.slug === slug)
    if (!feature) continue

    const unsupportedIn = []

    for (const { client, platform, label } of TARGET_CLIENTS) {
      const platformStats = feature.stats?.[client]?.[platform]
      const support = getLatestSupport(platformStats)
      if (support === 'n') unsupportedIn.push(label)
    }

    // Skip if supported everywhere
    if (unsupportedIn.length === 0) continue

    for (const pattern of patterns) {
      matrix[pattern] = {
        slug,
        title: feature.title,
        unsupportedIn,
        url: feature.url,
      }
    }
  }

  return matrix
}

const outputPath = path.resolve(
  __dirname,
  '../packages/eslint-plugin-email-safe/src/data/compat.js'
)

const matrix = buildCompatMatrix()

const content = `// AUTO-GENERATED — do not edit manually
// Update by running: node scripts/sync-caniemail.js
// Source: caniemail.com (last updated: ${rawData.last_update_date})

module.exports = ${JSON.stringify(matrix, null, 2)}
`

fs.writeFileSync(outputPath, content)

console.log(`✓ Generated ${Object.keys(matrix).length} unsafe patterns`)
console.log(`✓ Saved to ${outputPath}`)
