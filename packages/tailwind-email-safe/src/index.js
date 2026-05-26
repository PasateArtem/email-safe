const plugin = require('tailwindcss/plugin')

module.exports = plugin(
  function ({ addUtilities, addVariant, matchUtilities, theme }) {

    // ─── MSO / Outlook utilities ──────────────────────────────────────────

    addUtilities({
      // Hides element from Outlook only
      '.mso-hide': {
        'mso-hide': 'all',
      },
      // Fixes line-height rendering (Outlook ignores line-height without this)
      '.mso-lh-exact': {
        'mso-line-height-rule': 'exactly',
      },
      // Email-safe table — resets all default Outlook table spacing
      '.email-table': {
        'border-collapse': 'collapse',
        'border-spacing': '0',
        'mso-table-lspace': '0pt',
        'mso-table-rspace': '0pt',
      },
      // Email-safe img — removes gaps under images in Outlook
      '.email-img': {
        'border': '0',
        'outline': 'none',
        'text-decoration': 'none',
        '-ms-interpolation-mode': 'bicubic',
        'display': 'block',
      },
      // Fallback font for Outlook when a web font is loaded
      '.mso-font-fallback': {
        'mso-font-alt': 'Arial, sans-serif',
      },
      // Padding fix — Outlook adds extra padding to td elements
      '.email-td': {
        'border-collapse': 'collapse',
        'mso-line-height-rule': 'exactly',
      },
      // Centers email layout in Outlook
      '.email-center': {
        'margin': '0 auto',
        'mso-element': 'paragraph-border-art',
      },
    })

    // ─── Dynamic MSO utilities ────────────────────────────────────────────

    // mso-w-600 → { mso-width-percentage, width }
    // Use when you need to set width specifically for Outlook
    matchUtilities(
      {
        'mso-w': (value) => ({
          'mso-width-percentage': value,
          'width': value,
        }),
      },
      {
        values: Object.fromEntries(
          [100, 200, 300, 400, 480, 500, 560, 600, 640, 700, 800].map(n => [
            String(n),
            `${n}px`,
          ])
        ),
      }
    )

    // mso-p-{size} → padding with MSO-specific reset
    matchUtilities(
      {
        'mso-p': (value) => ({
          'padding': value,
          'mso-padding-alt': `${value} ${value} ${value} ${value}`,
        }),
      },
      { values: theme('spacing') }
    )

    // ─── Variants ─────────────────────────────────────────────────────────

    // email: — marks styles intended for email context
    // Useful for documentation and future tooling integrations
    addVariant('email', '&')

    // mso: — styles targeting Outlook only (via CSS hack)
    addVariant('mso', '@media all and (-ms-high-contrast: none)')
  },

  // ─── Theme extensions ──────────────────────────────────────────────────
  {
    theme: {
      extend: {
        // Email-safe font stacks
        fontFamily: {
          'email-sans':  ['Arial', 'Helvetica', 'sans-serif'],
          'email-serif': ['Georgia', 'Times New Roman', 'serif'],
          'email-mono':  ['Courier New', 'Courier', 'monospace'],
        },
        // Standard email widths
        maxWidth: {
          'email-sm': '480px',
          'email-md': '600px',
          'email-lg': '640px',
        },
        spacing: {
          'email-gutter': '24px',
        },
      },
    },
  }
)
