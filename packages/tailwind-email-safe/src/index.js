const plugin = require('tailwindcss/plugin')

module.exports = plugin(
  function ({ addUtilities, addVariant, matchUtilities, theme }) {

    // ─── MSO / Outlook утиліти ────────────────────────────────────────────

    addUtilities({
      // Ховає елемент тільки в Outlook
      '.mso-hide': {
        'mso-hide': 'all',
      },
      // Фіксує міжрядковий інтервал (Outlook ігнорує line-height без цього)
      '.mso-lh-exact': {
        'mso-line-height-rule': 'exactly',
      },
      // Email-safe таблиця — обнуляє всі дефолтні відступи Outlook
      '.email-table': {
        'border-collapse': 'collapse',
        'border-spacing': '0',
        'mso-table-lspace': '0pt',
        'mso-table-rspace': '0pt',
      },
      // Email-safe img — прибирає зазори під картинками в Outlook
      '.email-img': {
        'border': '0',
        'outline': 'none',
        'text-decoration': 'none',
        '-ms-interpolation-mode': 'bicubic',
        'display': 'block',
      },
      // Fallback шрифт для Outlook коли підключений web font
      '.mso-font-fallback': {
        'mso-font-alt': 'Arial, sans-serif',
      },
      // Padding fix — Outlook додає зайвий padding до td
      '.email-td': {
        'border-collapse': 'collapse',
        'mso-line-height-rule': 'exactly',
      },
      // Центрує email в Outlook
      '.email-center': {
        'margin': '0 auto',
        'mso-element': 'paragraph-border-art',
      },
    })

    // ─── Динамічні MSO утиліти ────────────────────────────────────────────

    // mso-w-600 → { mso-width-percentage, width }
    // Використовується коли треба задати ширину специфічно для Outlook
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

    // mso-p-{size} → padding з MSO-специфічним reset
    matchUtilities(
      {
        'mso-p': (value) => ({
          'padding': value,
          'mso-padding-alt': `${value} ${value} ${value} ${value}`,
        }),
      },
      { values: theme('spacing') }
    )

    // ─── Варіанти ─────────────────────────────────────────────────────────

    // email: — маркер що цей стиль для email контексту
    // Корисно для documentation і майбутніх tooling інтеграцій
    addVariant('email', '&')

    // mso: — стиль тільки для Outlook (через CSS hack)
    // Outlook підтримує mso-hide:all але ігнорує display:none в певних місцях
    addVariant('mso', '@media all and (-ms-high-contrast: none)')
  },

  // ─── Доповнення до теми ────────────────────────────────────────────────
  {
    theme: {
      extend: {
        // Email-safe font stacks
        fontFamily: {
          'email-sans':  ['Arial', 'Helvetica', 'sans-serif'],
          'email-serif': ['Georgia', 'Times New Roman', 'serif'],
          'email-mono':  ['Courier New', 'Courier', 'monospace'],
        },
        // Стандартні email ширини
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
