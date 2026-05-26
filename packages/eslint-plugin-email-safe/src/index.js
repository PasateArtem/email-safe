const noUnsafeClasses = require('./rules/no-unsafe-classes')
const preferPxUnits   = require('./rules/prefer-px-units')

const plugin = {
  meta: {
    name: 'eslint-plugin-email-safe',
    version: '0.1.0',
  },

  rules: {
    'no-unsafe-classes': noUnsafeClasses,
    'prefer-px-units':   preferPxUnits,
  },

  configs: {},
}

// Recommended конфіг — застосовується до email файлів
plugin.configs.recommended = {
  plugins: { 'email-safe': plugin },
  rules: {
    'email-safe/no-unsafe-classes': 'warn',
    'email-safe/prefer-px-units':   'warn',
  },
}

// Strict конфіг — все це помилки, не варнінги
plugin.configs.strict = {
  plugins: { 'email-safe': plugin },
  rules: {
    'email-safe/no-unsafe-classes': ['error', { clients: ['Outlook Windows', 'Gmail'] }],
    'email-safe/prefer-px-units':   'error',
  },
}

module.exports = plugin
