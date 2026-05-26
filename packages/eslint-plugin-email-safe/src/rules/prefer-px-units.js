/**
 * Правило: prefer-px-units
 * Попереджає про arbitrary values з rem/em/vh/vw в email контексті
 */

const UNSAFE_UNITS = ['rem', 'em', 'vh', 'vw', 'vmin', 'vmax']
// Матчить arbitrary values: w-[2rem], text-[1.5em], h-[100vh]
const ARBITRARY_REGEX = /\[([^\]]+)\]/

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Рекомендує px замість rem/em/vh/vw в email класах',
    },
    messages: {
      preferPx: '"{{cls}}" використовує {{unit}} — в email краще px. Outlook не підтримує {{unit}} одиниці.',
    },
  },

  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name.name !== 'className') return
        if (!node.value) return

        const raw = context.getSourceCode().getText(node.value)
        const classes = raw.split(/\s+/)

        for (const cls of classes) {
          const match = cls.match(ARBITRARY_REGEX)
          if (!match) continue

          const value = match[1]
          const unit = UNSAFE_UNITS.find(u => value.endsWith(u))
          if (!unit) continue

          context.report({
            node,
            messageId: 'preferPx',
            data: { cls: cls.replace(/['"]/g, ''), unit },
          })
        }
      },
    }
  },
}
